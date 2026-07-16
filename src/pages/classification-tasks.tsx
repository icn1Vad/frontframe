import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  appServices,
  definePageConfig,
  routes,
  type AppPage,
} from "../app";
import {
  ClassificationDocumentsTable,
  type DocumentId,
  type DocumentSummary,
  type PageResult,
} from "../features/documents";
import { createIdempotencyKey } from "../shared/lib/idempotency";
import { PageStack } from "../shared/ui";

interface ClassificationTasksProps {
  readonly result: PageResult<DocumentSummary>;
}

function parsePage(value: string | string[] | undefined): number {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(candidate ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const ClassificationTasks: AppPage<ClassificationTasksProps> =
  function ClassificationTasks({ result }) {
    const router = useRouter();
    const [rows, setRows] = useState(result.items);

    useEffect(() => {
      let active = true;
      setRows(result.items);
      void appServices.classificationTasks.list({
        page: result.page,
        pageSize: result.pageSize,
        sort: { by: "updatedAt", direction: "desc" },
      }).then((clientResult) => {
        if (active) setRows(clientResult.items);
      });
      return () => {
        active = false;
      };
    }, [result]);

    const replaceRow = (updated: DocumentSummary) => {
      setRows((current) =>
        current.map((document) =>
          document.id === updated.id ? updated : document,
        ),
      );
    };

    const mutationOptions = (prefix: string) => ({
      idempotencyKey: createIdempotencyKey(prefix),
    });

    return (
      <PageStack>
        <ClassificationDocumentsTable
          rows={rows}
          commands={{
            publish: async (documentId) => {
              replaceRow(
                await appServices.classificationTasks.publish(
                  documentId,
                  mutationOptions("publish-classification"),
                ),
              );
            },
            startReview: async (documentId) => {
              replaceRow(
                await appServices.classificationTasks.startReview(
                  documentId,
                  mutationOptions("start-review"),
                ),
              );
            },
          }}
          onDelete={async (documentId: DocumentId) => {
            replaceRow(
              await appServices.classificationTasks.softDelete(
                documentId,
                mutationOptions("delete-classification"),
              ),
            );
          }}
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
      </PageStack>
    );
  };

ClassificationTasks.pageConfig = definePageConfig({
  moduleId: "classificationTasks",
});

export const getServerSideProps: GetServerSideProps<
  ClassificationTasksProps
> = async ({ query }) => ({
  props: {
    result: await appServices.classificationTasks.list({
      page: parsePage(query.page),
      pageSize: 25,
      sort: { by: "updatedAt", direction: "desc" },
    }),
  },
});

export default ClassificationTasks;
