import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  moduleRegistry,
  type ModuleRegistry,
} from "./module-registry";
import type { AppPageConfig } from "./page-config";
import { demoSession, type AppSession } from "./runtime";

export interface AppShellProps {
  readonly config: AppPageConfig;
  readonly children: ReactNode;
  readonly registry?: ModuleRegistry;
  readonly session?: AppSession;
}

export function AppShell({
  config,
  children,
  registry = moduleRegistry,
  session = demoSession,
}: AppShellProps) {
  const router = useRouter();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const moduleDefinition = registry.get(config.moduleId);
  const activeModuleId = config.activeModuleId ?? config.moduleId;
  const title = config.title ?? moduleDefinition.title;
  const subtitle = config.subtitle ?? moduleDefinition.subtitle;

  useEffect(() => {
    const closeNavigation = () => setNavigationOpen(false);
    router.events.on("routeChangeComplete", closeNavigation);
    return () => router.events.off("routeChangeComplete", closeNavigation);
  }, [router.events]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", navigationOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [navigationOpen]);

  return (
    <>
      <Head>
        <title>{title} · ProofSpace</title>
      </Head>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <div className="app">
        <aside
          id="app-navigation"
          className={`sidebar ${navigationOpen ? "open" : ""}`}
          aria-label="主导航"
        >
          <div className="brand">ProofSpace</div>
          <div className="brand-sub">数据治理中心</div>
          <button
            type="button"
            className="menu-button"
            aria-label="关闭菜单"
            aria-controls="app-navigation"
            aria-expanded={navigationOpen}
            onClick={() => setNavigationOpen(false)}
          >
            <X size={15} />
          </button>
          <nav className="nav">
            {registry.getNavigation().map((section) => (
              <div className="nav-section" key={section.id}>
                {section.label ? (
                  <div className="nav-item nav-group">
                    {section.label}
                    <span aria-hidden="true">›</span>
                  </div>
                ) : null}
                {section.items.map((item) => (
                  <Link
                    className={`nav-item ${section.label ? "nav-child" : ""} ${
                      activeModuleId === item.moduleId ? "active" : ""
                    }`}
                    href={item.href}
                    prefetch={item.prefetch}
                    aria-current={activeModuleId === item.moduleId ? "page" : undefined}
                    key={item.moduleId}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {navigationOpen ? (
          <button
            type="button"
            className="sidebar-backdrop open"
            aria-label="关闭菜单遮罩"
            onClick={() => setNavigationOpen(false)}
          />
        ) : null}

        <main className="main">
          <header className="header">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="打开菜单"
              aria-controls="app-navigation"
              aria-expanded={navigationOpen}
              onClick={() => setNavigationOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="header-copy">
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {session.signOut ? (
              <button type="button" className="account" onClick={session.signOut}>
                {session.user.displayName} - {session.user.roleLabel}
                <LogOut size={16} />
              </button>
            ) : (
              <div className="account">
                {session.user.displayName} - {session.user.roleLabel}
                <LogOut size={16} aria-hidden="true" />
              </div>
            )}
          </header>
          <section className="content" id="main-content" tabIndex={-1}>
            {children}
          </section>
        </main>
      </div>
    </>
  );
}
