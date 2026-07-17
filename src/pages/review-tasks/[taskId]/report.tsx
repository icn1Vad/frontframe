import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";
import {
  createRequestScopedAppServices,
  definePageConfig,
  getRuntimeAppServices,
  isJavaSliceEnabled,
  redirectToLoginOnUnauthorized,
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
    const services = getRuntimeAppServices();
    const javaReadOnly = isJavaSliceEnabled();
    const [report, setReport] = useState(props.initialReport);
    const [readOnly, setReadOnly] = useState(
      props.initialReadOnly || javaReadOnly,
    );
    const [loading, setLoading] = useState(props.initialReport === null);

    useEffect(() => {
      let active = true;
      void Promise.all([
        services.reviewTasks.getReport(taskId),
        services.documents.getByReviewTaskId(taskId),
      ]).then(([nextReport, document]) => {
        if (!active) return;
        setReport(nextReport);
        setReadOnly(javaReadOnly || document?.state.kind !== "reviewed");
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [javaReadOnly, services, taskId]);

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
          return services.reviewTasks.resolveRisk(taskId, riskId, {
            idempotencyKey: createIdempotencyKey("resolve-review-risk"),
          });
        }}
        onIgnoreRisk={async (riskId, reason) => {
          return services.reviewTasks.ignoreRisk(taskId, riskId, reason ?? "", {
            idempotencyKey: createIdempotencyKey("ignore-review-risk"),
          });
        }}
        onIgnoreAllRisks={async (reason) => {
          return services.reviewTasks.ignoreAllRisks(taskId, reason, {
            idempotencyKey: createIdempotencyKey("ignore-review-risks"),
          });
        }}
        onPublish={
          readOnly
            ? undefined
            : async () => {
                await services.reviewTasks.publish(props.documentId, {
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
> = async ({ params, req }) => {
  const rawTaskId = params?.taskId;
  if (typeof rawTaskId !== "string") return { notFound: true };

  let taskId: ReviewTaskId;
  try {
    taskId = createReviewTaskId(rawTaskId);
  } catch {
    return { notFound: true };
  }

  const services = createRequestScopedAppServices({
    backendOrigin: process.env.API_BACKEND_ORIGIN,
    cookieHeader: req.headers.cookie,
  });
  try {
    const document = await services.documents.getByReviewTaskId(taskId);
    if (!document) return { notFound: true };
    const initialReport = await services.reviewTasks.getReport(taskId);

    return {
      props: {
        taskId,
        documentId: document.id,
        documentName: document.name,
        initialReport,
        initialReadOnly:
          isJavaSliceEnabled() || document.state.kind !== "reviewed",
      },
    };
  } catch (error: unknown) {
    return redirectToLoginOnUnauthorized(error);
  }
};

export default ReviewReportPage;
