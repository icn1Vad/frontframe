import Link from "next/link";
import { useRouter } from "next/router";
import { LogOut, Menu } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { label: "工作台", href: "/dashboard" },
  { label: "文件分类审查", href: "", group: true },
  { label: "文件分类", href: "/file-classification", child: true },
  { label: "分类任务", href: "/classification-task", child: true },
  { label: "审查任务", href: "/review-task", child: true },
  { label: "知识库", href: "/knowledge" },
  { label: "智能问答", href: "/chat" },
  { label: "系统管理", href: "", group: true },
];

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  active?: string;
};

export function Layout({ title, subtitle, children, active }: Props) {
  const router = useRouter();
  const current = active || router.pathname;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">ProofSpace</div>
        <div className="brand-sub">数据治理中心</div>
        <button className="menu-button" aria-label="菜单"><Menu size={15} /></button>
        <nav className="nav">
          {nav.map((item) => {
            const selected = item.href && current === item.href;
            if (item.group) {
              return <div className="nav-item nav-group" key={item.label}>{item.label}<span>›</span></div>;
            }
            return (
              <Link className={`nav-item ${item.child ? "nav-child" : ""} ${selected ? "active" : ""}`} href={item.href} key={item.label}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <header className="header">
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="account">严凯丰 - 管理员 <LogOut size={16} /></div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}
