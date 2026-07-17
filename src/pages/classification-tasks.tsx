import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import {
  createRequestScopedAppServices,
  definePageConfig,
  getRuntimeAppServices,
  isJavaSliceEnabled,
  redirectToLoginOnUnauthorized,
  routes,
  type AppPage,
} from "../app";
import {
  ClassificationDocumentsTable,
  DocumentPreviewPane,
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
    const services = getRuntimeAppServices();
    const [rows, setRows] = useState(result.items);
    const loadPreview = useCallback(
      (documentId: DocumentId, options?: { readonly signal?: AbortSignal }) =>
        services.classificationTasks.getPreview(documentId, options),
      [services],
    );

    useEffect(() => {
      let active = true;
      setRows(result.items);
      void services.classificationTasks.list({
        page: result.page,
        pageSize: result.pageSize,
        sort: { by: "updatedAt", direction: "desc" },
      }).then((clientResult) => {
        if (active) setRows(clientResult.items);
      });
      return () => {
        active = false;
      };
    }, [result, services]);

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
                await services.classificationTasks.publish(
                  documentId,
                  mutationOptions("publish-classification"),
                ),
              );
            },
            startReview: async (documentId) => {
              if (isJavaSliceEnabled()) {
                throw new Error(
                  "当前 Java 演示切片暂未开放通用审查，请使用直接入库。",
                );
              }
              replaceRow(
                await services.classificationTasks.startReview(
                  documentId,
                  mutationOptions("start-review"),
                ),
              );
            },
          }}
          onDelete={async (documentId: DocumentId) => {
            replaceRow(
              await services.classificationTasks.softDelete(
                documentId,
                mutationOptions("delete-classification"),
              ),
            );
          }}
          renderPreview={(document) => (
            <DocumentPreviewPane
              documentId={document.id}
              fallbackName={document.name}
              loadPreview={loadPreview}
            />
          )}
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
> = async ({ query, req }) => {
  const services = createRequestScopedAppServices({
    backendOrigin: process.env.API_BACKEND_ORIGIN,
    cookieHeader: req.headers.cookie,
  });
  try {
    return {
      props: {
        result: await services.classificationTasks.list({
          page: parsePage(query.page),
          pageSize: 25,
          sort: { by: "updatedAt", direction: "desc" },
        }),
      },
    };
  } catch (error: unknown) {
    return redirectToLoginOnUnauthorized(error);
  }
};

export default ClassificationTasks;
