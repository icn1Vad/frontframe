import type { GetServerSideProps } from "next";
import {
  appServices,
  definePageConfig,
  type AppPage,
} from "../../../app";
import {
  createReviewTaskId,
  type ReviewTaskId,
} from "../../../features/documents";
import { ReviewReportScreen } from "../../../features/reviews";

interface ReviewReportPageProps {
  readonly taskId: string;
  readonly documentName: string;
}

const ReviewReportPage: AppPage<ReviewReportPageProps> =
  function ReviewReportPage(props) {
    return <ReviewReportScreen {...props} />;
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
      documentName: document.name,
    },
  };
};

export default ReviewReportPage;
