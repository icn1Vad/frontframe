import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  createRequestScopedAppServices,
  definePageConfig,
  getRuntimeAppServices,
  isJavaSliceEnabled,
  redirectToLoginOnUnauthorized,
  routes,
  type AppPage,
} from "../../app";
import {
  ReviewDocumentsTable,
  type DocumentId,
  type DocumentSummary,
  type PageResult,
} from "../../features/documents";
import { createIdempotencyKey } from "../../shared/lib/idempotency";
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
  const services = getRuntimeAppServices();
  const javaReadOnly = isJavaSliceEnabled();
  const [rows, setRows] = useState(result.items);

  useEffect(() => {
    let active = true;
    setRows(result.items);
    void services.reviewTasks.list({
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

  return (
    <PageStack>
      <ReviewDocumentsTable
        rows={rows}
        commands={
          javaReadOnly
            ? undefined
            : {
                publish: async (documentId) => {
                  replaceRow(
                    await services.reviewTasks.publish(documentId, {
                      idempotencyKey: createIdempotencyKey("publish-review"),
                    }),
                  );
                },
              }
        }
        onDelete={
          javaReadOnly
            ? undefined
            : async (documentId: DocumentId) => {
                replaceRow(
                  await services.reviewTasks.softDelete(documentId, {
                    idempotencyKey: createIdempotencyKey("delete-review"),
                  }),
                );
              }
        }
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
    </PageStack>
  );
};

ReviewTasks.pageConfig = definePageConfig({ moduleId: "reviewTasks" });

export const getServerSideProps: GetServerSideProps<ReviewTasksProps> = async ({
  query,
  req,
}) => {
  const services = createRequestScopedAppServices({
    backendOrigin: process.env.API_BACKEND_ORIGIN,
    cookieHeader: req.headers.cookie,
  });
  try {
    return {
      props: {
        result: await services.reviewTasks.list({
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

export default ReviewTasks;
