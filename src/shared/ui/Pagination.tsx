import type { HTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { classNames } from "../lib/classNames";

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  disabled = false,
  previousLabel = "上一页",
  nextLabel = "下一页",
  className,
  ...props
}: PaginationProps) {
  const safePageCount = Math.max(0, pageCount);
  const safePage = safePageCount === 0 ? 0 : Math.min(Math.max(1, page), safePageCount);
  const canGoPrevious = !disabled && safePage > 1;
  const canGoNext = !disabled && safePage > 0 && safePage < safePageCount;

  return (
    <nav
      className={classNames("pagination", className)}
      aria-label="分页"
      {...props}
    >
      <button
        type="button"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(safePage - 1)}
      >
        <ChevronLeft size={12} />
        {previousLabel}
      </button>
      <span className="page-number" aria-current="page">
        {safePage}
      </span>
      <span>/ {safePageCount} 页</span>
      <button
        type="button"
        disabled={!canGoNext}
        onClick={() => onPageChange(safePage + 1)}
      >
        {nextLabel}
        <ChevronRight size={12} />
      </button>
    </nav>
  );
}
