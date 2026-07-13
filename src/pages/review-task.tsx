import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import {
  appServices,
  definePageConfig,
  routes,
  type AppPage,
} from "../app";
import {
  ReviewDocumentsTable,
  type DocumentSummary,
  type PageResult,
} from "../features/documents";

interface ReviewTaskProps {
  readonly result: PageResult<DocumentSummary>;
}

function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const ReviewTask: AppPage<ReviewTaskProps> = function ReviewTask({ result }) {
  const router = useRouter();

  return (
    <ReviewDocumentsTable
      rows={result.items}
      pagination={{
        page: result.page,
        pageCount: result.pageCount,
        onPageChange: (page) => {
          void router.push({
            pathname: routes.reviewTasks,
            query: { ...router.query, page },
          });
        },
      }}
    />
  );
};

ReviewTask.pageConfig = definePageConfig({ moduleId: "reviewTasks" });

export const getServerSideProps: GetServerSideProps<ReviewTaskProps> = async ({
  query,
}) => ({
  props: {
    result: await appServices.documents.list({
      collection: "review",
      page: parsePage(query.page),
      pageSize: 25,
      sort: { by: "updatedAt", direction: "desc" },
    }),
  },
});

export default ReviewTask;
