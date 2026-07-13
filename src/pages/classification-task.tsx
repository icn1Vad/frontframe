import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import {
  appServices,
  definePageConfig,
  routes,
  type AppPage,
} from "../app";
import {
  ClassificationDocumentsTable,
  type PageResult,
  type DocumentSummary,
} from "../features/documents";

interface ClassificationTaskProps {
  readonly result: PageResult<DocumentSummary>;
}

function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const ClassificationTask: AppPage<ClassificationTaskProps> =
  function ClassificationTask({ result }) {
    const router = useRouter();

    return (
      <ClassificationDocumentsTable
        rows={result.items}
        pagination={{
          page: result.page,
          pageCount: result.pageCount,
          onPageChange: (page) => {
            void router.push({
              pathname: routes.classificationTasks,
              query: { ...router.query, page },
            });
          },
        }}
      />
    );
  };

ClassificationTask.pageConfig = definePageConfig({
  moduleId: "classificationTasks",
});

export const getServerSideProps: GetServerSideProps<
  ClassificationTaskProps
> = async ({ query }) => ({
  props: {
    result: await appServices.documents.list({
      collection: "classification",
      page: parsePage(query.page),
      pageSize: 25,
      sort: { by: "updatedAt", direction: "desc" },
    }),
  },
});

export default ClassificationTask;
