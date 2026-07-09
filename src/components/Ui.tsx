import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

export function Status({ children, tone = "warning" }: { children: ReactNode; tone?: string }) {
  return <span className={`status ${tone}`}>{children}</span>;
}

export function IconButton({ label, children, danger, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode; danger?: boolean }) {
  return <button className={`icon-button ${danger ? "danger" : ""}`} aria-label={label} title={label} {...props}>{children}</button>;
}

export function FilterLabel({ children }: { children: ReactNode }) {
  return <span className="filter-label">{children}<Filter size={10} /></span>;
}

export function Pagination() {
  return (
    <div className="pagination">
      <button><ChevronLeft size={12} />上一页</button>
      <span className="page-number">1</span>
      <span>/ 10 页</span>
      <button>下一页<ChevronRight size={12} /></button>
    </div>
  );
}

export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{title}</h2>
        {subtitle && <p className="modal-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
