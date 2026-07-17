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

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setRows(result.items);
    const load = async () => {
      if (!active || document.hidden) return;
      try {
        const clientResult = await appServices.reviewTasks.list({
          page: result.page,
          pageSize: result.pageSize,
          sort: { by: "updatedAt", direction: "desc" },
        });
        if (!active) return;
        setRows(clientResult.items);
        setPageCount(clientResult.pageCount);
        const hasActiveTask = clientResult.items.some(
          (item) => item.state.kind === "reviewing" && item.state.reviewStatus !== "FAILED",
        );
        if (hasActiveTask) timer = setTimeout(() => void load(), 2500);
      } catch {
        if (active) setRows([]);
      }
    };
    const handleVisibility = () => {
      if (!document.hidden) void load();
      else if (timer) clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    void load();
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
