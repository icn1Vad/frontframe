import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  appServices,
  definePageConfig,
  routes,
  type AppPage,
} from "../../app";
import {
  ReviewDocumentsTable,
  type DocumentSummary,
  type PageResult,
} from "../../features/documents";
import { PageStack } from "../../shared/ui";

interface ReviewTasksProps {
  readonly result: PageResult<DocumentSummary>;
}

function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const ReviewTasks: AppPage<ReviewTasksProps> = function ReviewTasks({ result }) {
  const router = useRouter();
  const [rows, setRows] = useState(result.items);
  const [pageCount, setPageCount] = useState(result.pageCount);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let latestRows = result.items;
    setRows(result.items);
    const pollActiveTasks = async (items: readonly DocumentSummary[]) => {
      if (!active || document.hidden) return;
      const activeTaskIds = items.flatMap((item) =>
        item.state.kind === "reviewing" && item.state.reviewStatus !== "FAILED"
          ? [item.state.reviewTaskId]
          : [],
      );
      if (activeTaskIds.length === 0) return;
      try {
        const refreshed = await Promise.all(
          activeTaskIds.map((taskId) => appServices.reviewTasks.getTask(taskId)),
        );
        if (!active) return;
        const refreshedById = new Map(
          refreshed.filter((item): item is DocumentSummary => item !== null).map((item) => [item.id, item]),
        );
        latestRows = items.map((item) => refreshedById.get(item.id) ?? item);
        setRows(latestRows);
        setFeedback(null);
        if (latestRows.some((item) => item.state.kind === "reviewing" && item.state.reviewStatus !== "FAILED")) {
          timer = setTimeout(() => void pollActiveTasks(latestRows), 2500);
        }
      } catch (error) {
        if (active) {
          setFeedback(error instanceof Error ? `任务状态刷新失败：${error.message}` : "任务状态刷新失败");
          timer = setTimeout(() => void pollActiveTasks(latestRows), 2500);
        }
      }
    };
    const loadList = async () => {
      if (!active || document.hidden) return;
      try {
        const clientResult = await appServices.reviewTasks.list({
          page: result.page,
          pageSize: result.pageSize,
          sort: { by: "updatedAt", direction: "desc" },
        });
        if (!active) return;
        latestRows = clientResult.items;
        setRows(latestRows);
        setPageCount(clientResult.pageCount);
        setFeedback(null);
        await pollActiveTasks(latestRows);
      } catch (error) {
        if (active) setFeedback(error instanceof Error ? `任务池加载失败：${error.message}` : "任务池加载失败");
      }
    };
    const handleVisibility = () => {
      if (!document.hidden) void loadList();
      else if (timer) clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    void loadList();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [result]);

  return (
    <PageStack>
      <ReviewDocumentsTable
        rows={rows}
        pagination={{
          page: result.page,
          pageCount,
          onPageChange: (page) => {
            void router.push({
              pathname: routes.reviewTasks,
              query: { ...router.query, page },
            });
          },
        }}
      />
      {feedback ? <p className="action-feedback error" role="status">{feedback}</p> : null}
    </PageStack>
  );
};

ReviewTasks.pageConfig = definePageConfig({ moduleId: "reviewTasks" });

export const getServerSideProps: GetServerSideProps<ReviewTasksProps> = async ({
  query,
}) => {
  const page = parsePage(query.page);
  return {
    props: {
      result: { items: [], page, pageSize: 25, total: 0, pageCount: 0 },
    },
  };
};

export default ReviewTasks;
