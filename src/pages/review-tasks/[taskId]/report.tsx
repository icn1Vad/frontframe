import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import {
  appServices,
  definePageConfig,
  type AppPage,
} from "../../../app";
import {
  createReviewTaskId,
  type DocumentId,
  type ReviewReport,
  type ReviewTaskId,
} from "../../../features/documents";
import { ReviewReportScreen } from "../../../features/reviews";
import { createIdempotencyKey } from "../../../shared/lib/idempotency";

interface ReviewReportPageProps {
  readonly taskId: string;
  readonly documentId: DocumentId;
  readonly documentName: string;
  readonly initialReport: ReviewReport | null;
  readonly initialReadOnly: boolean;
}

const ReviewReportPage: AppPage<ReviewReportPageProps> =
  function ReviewReportPage(props) {
    const taskId = createReviewTaskId(props.taskId);
    const [report, setReport] = useState(props.initialReport);
    const [readOnly, setReadOnly] = useState(props.initialReadOnly);
    const [loading, setLoading] = useState(props.initialReport === null);

    useEffect(() => {
      let active = true;
      void Promise.all([
        appServices.reviewTasks.getReport(taskId),
        appServices.documents.getByReviewTaskId(taskId),
      ]).then(([nextReport, document]) => {
        if (!active) return;
        setReport(nextReport);
        setReadOnly(document?.state.kind !== "reviewed");
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [taskId]);

    if (loading) {
      return <div className="table-state">正在加载审查报告…</div>;
    }
    if (!report) {
      return <div className="table-state">审查报告尚未生成</div>;
    }

    return (
      <ReviewReportScreen
        {...props}
        initialReport={report}
        readOnly={readOnly}
        onResolveRisk={async (riskId) => {
          return appServices.reviewTasks.resolveRisk(taskId, riskId, {
            idempotencyKey: createIdempotencyKey("resolve-review-risk"),
          });
        }}
        onIgnoreRisk={async (riskId, reason) => {
          return appServices.reviewTasks.ignoreRisk(taskId, riskId, reason ?? "", {
            idempotencyKey: createIdempotencyKey("ignore-review-risk"),
          });
        }}
        onIgnoreAllRisks={async (reason) => {
          return appServices.reviewTasks.ignoreAllRisks(taskId, reason, {
            idempotencyKey: createIdempotencyKey("ignore-review-risks"),
          });
        }}
        onPublish={
          readOnly
            ? undefined
            : async () => {
                await appServices.reviewTasks.publish(props.documentId, {
                  idempotencyKey: createIdempotencyKey("publish-review-report"),
                });
              }
        }
      />
    );
  };

ReviewReportPage.pageConfig = definePageConfig({
  moduleId: "reviewReport",
  activeModuleId: "reviewTasks",
});

export const getServerSideProps: GetServerSideProps<
  ReviewReportPageProps
> = async ({ params }) => {
  const rawTaskId = params?.taskId;
  if (typeof rawTaskId !== "string") return { notFound: true };

  let taskId: ReviewTaskId;
  try {
    taskId = createReviewTaskId(rawTaskId);
  } catch {
    return { notFound: true };
  }

  const document = await appServices.documents.getByReviewTaskId(taskId);
  if (!document) return { notFound: true };
  const initialReport = await appServices.reviewTasks.getReport(taskId);

  return {
    props: {
      taskId,
      documentId: document.id,
      documentName: document.name,
      initialReport,
      initialReadOnly: document.state.kind !== "reviewed",
    },
  };
};

export default ReviewReportPage;
