import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const moduleDefinition = registry.get(config.moduleId);
  const activeModuleId = config.activeModuleId ?? config.moduleId;
  const title = config.title ?? moduleDefinition.title;
  const subtitle = config.subtitle ?? moduleDefinition.subtitle;
  const navigation = registry.getNavigation();
  const userInitial = session.user.displayName.trim().slice(0, 1) || "用";

  useEffect(() => {
    const closeNavigation = () => {
      setNavigationOpen(false);
      setAccountMenuOpen(false);
    };
    router.events.on("routeChangeComplete", closeNavigation);
    return () => router.events.off("routeChangeComplete", closeNavigation);
  }, [router.events]);

  useEffect(() => {
    const startNavigation = () => setIsNavigating(true);
    const finishNavigation = () => setIsNavigating(false);

    router.events.on("routeChangeStart", startNavigation);
    router.events.on("routeChangeComplete", finishNavigation);
    router.events.on("routeChangeError", finishNavigation);

    return () => {
      router.events.off("routeChangeStart", startNavigation);
      router.events.off("routeChangeComplete", finishNavigation);
      router.events.off("routeChangeError", finishNavigation);
    };
  }, [router.events]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", navigationOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [navigationOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAccountMenuOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const handleSignOut = () => {
    setAccountMenuOpen(false);
    session.signOut?.();
  };

  return (
    <>
      {isNavigating ? (
        <div
          className="route-progress"
          role="status"
          aria-live="polite"
          aria-label="页面加载中"
        />
      ) : null}
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
            {navigation.map((section) => {
              const isCollapsed = collapsedSectionIds.has(section.id);
              const containsActive = section.items.some(
                (item) => item.moduleId === activeModuleId,
              );
              const itemsId = `nav-section-${section.id}`;

              return (
                <div
                  className={`nav-section ${containsActive ? "contains-active" : ""}`}
                  key={section.id}
                >
                  {section.label ? (
                    <button
                      type="button"
                      className="nav-item nav-group"
                      aria-expanded={!isCollapsed}
                      aria-controls={itemsId}
                      onClick={() => toggleSection(section.id)}
                    >
                      <span>{section.label}</span>
                      <ChevronDown
                        className="nav-group-chevron"
                        size={15}
                        aria-hidden="true"
                      />
                    </button>
                  ) : null}
                  <div
                    id={itemsId}
                    className={`nav-section-items ${isCollapsed ? "collapsed" : ""}`}
                    aria-hidden={section.label && isCollapsed ? "true" : undefined}
                  >
                    <div className="nav-section-items-inner">
                      {section.items.map((item) => (
                        <Link
                          className={`nav-item ${section.label ? "nav-child" : ""} ${
                            activeModuleId === item.moduleId ? "active" : ""
                          }`}
                          href={item.href}
                          prefetch={item.prefetch}
                          aria-current={
                            activeModuleId === item.moduleId ? "page" : undefined
                          }
                          tabIndex={section.label && isCollapsed ? -1 : undefined}
                          key={item.moduleId}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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
              <div className="account-menu" ref={accountMenuRef}>
                <button
                  ref={accountTriggerRef}
                  type="button"
                  className="account-trigger"
                  aria-label={`用户菜单，当前用户：${session.user.displayName}`}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                  onClick={() => setAccountMenuOpen((open) => !open)}
                >
                  <span className="account-avatar" aria-hidden="true">
                    {userInitial}
                  </span>
                  <span className="account-copy">
                    <strong>{session.user.displayName}</strong>
                    <small>{session.user.roleLabel}</small>
                  </span>
                  <ChevronDown
                    className="account-chevron"
                    size={15}
                    aria-hidden="true"
                  />
                </button>
                {accountMenuOpen ? (
                  <div className="account-popover" role="menu">
                    <div className="account-summary" role="presentation">
                      <span className="account-avatar" aria-hidden="true">
                        {userInitial}
                      </span>
                      <span>
                        <strong>{session.user.displayName}</strong>
                        <small>{session.user.roleLabel}</small>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="account-signout"
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      <LogOut size={15} aria-hidden="true" />
                      退出登录
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className="account-trigger account-readonly"
                aria-label={`当前用户：${session.user.displayName}，${session.user.roleLabel}`}
              >
                <span className="account-avatar" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="account-copy">
                  <strong>{session.user.displayName}</strong>
                  <small>{session.user.roleLabel}</small>
                </span>
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
