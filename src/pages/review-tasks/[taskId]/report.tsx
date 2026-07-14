import type { GetServerSideProps } from "next";
import {
  appServices,
  definePageConfig,
  type AppPage,
} from "../../../app";
import {
  createReviewTaskId,
  type DocumentId,
  type ReviewTaskId,
} from "../../../features/documents";
import { ReviewReportScreen } from "../../../features/reviews";
import { createIdempotencyKey } from "../../../shared/lib/idempotency";

interface ReviewReportPageProps {
  readonly taskId: string;
  readonly documentId: DocumentId;
  readonly documentName: string;
}

const ReviewReportPage: AppPage<ReviewReportPageProps> =
  function ReviewReportPage(props) {
    const taskId = createReviewTaskId(props.taskId);
    return (
      <ReviewReportScreen
        {...props}
        onExportReport={async () => {
          await appServices.reviewTasks.getReport(taskId);
        }}
        onIgnoreAllRisks={async () => {
          await appServices.reviewTasks.ignoreAllRisks(taskId, {
            idempotencyKey: createIdempotencyKey("ignore-review-risks"),
          });
        }}
        onPublish={async () => {
          await appServices.reviewTasks.publish(props.documentId, {
            idempotencyKey: createIdempotencyKey("publish-review-report"),
          });
        }}
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

  return {
    props: {
      taskId,
      documentId: document.id,
      documentName: document.name,
    },
  };
};

export default ReviewReportPage;
