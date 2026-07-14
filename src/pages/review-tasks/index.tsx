import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  appServices,
  definePageConfig,
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
  const [rows, setRows] = useState(result.items);

  useEffect(() => setRows(result.items), [result.items]);

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
        commands={{
          publish: async (documentId) => {
            replaceRow(
              await appServices.reviewTasks.publish(documentId, {
                idempotencyKey: createIdempotencyKey("publish-review"),
              }),
            );
          },
        }}
        onDelete={async (documentId: DocumentId) => {
          replaceRow(
            await appServices.reviewTasks.softDelete(documentId, {
              idempotencyKey: createIdempotencyKey("delete-review"),
            }),
          );
        }}
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
}) => ({
  props: {
    result: await appServices.reviewTasks.list({
      page: parsePage(query.page),
      pageSize: 25,
      sort: { by: "updatedAt", direction: "desc" },
    }),
  },
});

export default ReviewTasks;
