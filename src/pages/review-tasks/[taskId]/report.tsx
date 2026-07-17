import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import { appServices, definePageConfig, type AppPage } from "../../../app";
import {
  createReviewTaskId,
  type ReviewReport,
} from "../../../features/documents";
import { ReviewReportScreen } from "../../../features/reviews";

interface ReviewReportPageProps {
  readonly taskId: string;
}

const ReviewReportPage: AppPage<ReviewReportPageProps> = function ReviewReportPage({ taskId }) {
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void appServices.reviewTasks
      .getReport(createReviewTaskId(taskId), { signal: controller.signal })
      .then((nextReport) => setReport(nextReport))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "审校报告加载失败");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [taskId]);

  if (loading) return <div className="table-state">正在加载审校报告…</div>;
  if (error) return <div className="table-state">{error}</div>;
  if (!report) return <div className="table-state">审校报告尚未生成</div>;

  const keepReadOnly = async () => report;
  return (
    <ReviewReportScreen
      taskId={taskId}
      documentName={report.documentName}
      initialReport={report}
      readOnly
      onResolveRisk={keepReadOnly}
      onIgnoreRisk={keepReadOnly}
      onIgnoreAllRisks={keepReadOnly}
    />
  );
};

ReviewReportPage.pageConfig = definePageConfig({
  moduleId: "reviewReport",
  activeModuleId: "reviewTasks",
});

export const getServerSideProps: GetServerSideProps<ReviewReportPageProps> = async ({ params }) => {
  const taskId = params?.taskId;
  if (typeof taskId !== "string") return { notFound: true };
  try {
    createReviewTaskId(taskId);
  } catch {
    return { notFound: true };
  }
  return { props: { taskId } };
};

export default ReviewReportPage;
