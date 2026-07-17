import { Search } from "lucide-react";
import type { FormEvent } from "react";

export type KnowledgeView = "classic" | "graph";

export interface KnowledgeViewControl {
  value: KnowledgeView;
  onChange: (view: KnowledgeView) => void;
}

export interface KnowledgeToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  viewControl?: KnowledgeViewControl;
  disabled?: boolean;
  placeholder?: string;
}

export function KnowledgeToolbar({
  query,
  onQueryChange,
  onSearch,
  viewControl,
  disabled = false,
  placeholder = "搜索文件名称 / 类型 / 状态",
}: KnowledgeToolbarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form className="knowledge-toolbar" role="search" onSubmit={handleSubmit}>
      <div className="knowledge-search-group">
        <label>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            aria-label="搜索知识库文件"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <button type="submit" className="primary knowledge-search-button" disabled={disabled}>
          搜索
        </button>
      </div>
      {viewControl ? (
        <div className="knowledge-view-toggle" role="group" aria-label="知识库视图">
          <button
            type="button"
            className={viewControl.value === "classic" ? "selected" : ""}
            aria-pressed={viewControl.value === "classic"}
            disabled={disabled}
            onClick={() => viewControl.onChange("classic")}
          >
            经典视图
          </button>
          <button
            type="button"
            className={viewControl.value === "graph" ? "selected" : ""}
            aria-pressed={viewControl.value === "graph"}
            disabled={disabled}
            onClick={() => viewControl.onChange("graph")}
          >
            图形视图
          </button>
        </div>
      ) : null}
    </form>
  );
}
