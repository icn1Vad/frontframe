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
  KnowledgeDocumentsTable,
  KnowledgeToolbar,
  type DocumentSummary,
  type KnowledgeView,
  type PageResult,
} from "../features/documents";

interface KnowledgeProps {
  readonly result: PageResult<DocumentSummary>;
  readonly search: string;
}

function firstQueryValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function parsePage(value: string | string[] | undefined): number {
  const parsed = Number.parseInt(firstQueryValue(value) || "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

const Knowledge: AppPage<KnowledgeProps> = function Knowledge({
  result,
  search,
}) {
  const router = useRouter();
  const [query, setQuery] = useState(search);
  const [view, setView] = useState<KnowledgeView>("classic");

  useEffect(() => setQuery(search), [search]);

  const navigate = (page: number, nextSearch = search) => {
    void router.push({
      pathname: routes.knowledge,
      query: {
        ...(nextSearch ? { q: nextSearch } : {}),
        page,
      },
    });
  };

  return (
    <>
      <KnowledgeToolbar
        query={query}
        onQueryChange={setQuery}
        onSearch={(nextSearch) => navigate(1, nextSearch)}
        viewControl={{ value: view, onChange: setView }}
      />
      {view === "graph" ? (
        <div className="table-state" role="status">
          图形视图接口已预留，等待关系图适配器接入。
        </div>
      ) : (
        <KnowledgeDocumentsTable
          rows={result.items}
          pagination={{
            page: result.page,
            pageCount: result.pageCount,
            onPageChange: (page) => navigate(page),
          }}
        />
      )}
    </>
  );
};

Knowledge.pageConfig = definePageConfig({ moduleId: "knowledge" });

export const getServerSideProps: GetServerSideProps<KnowledgeProps> = async ({
  query,
}) => {
  const search = firstQueryValue(query.q).trim();
  return {
    props: {
      search,
      result: await appServices.documents.list({
        collection: "knowledge",
        page: parsePage(query.page),
        pageSize: 25,
        search: search || undefined,
        sort: { by: "updatedAt", direction: "desc" },
      }),
    },
  };
};

export default Knowledge;
