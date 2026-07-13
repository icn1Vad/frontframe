import Link from "next/link";
import type { FormHTMLAttributes, ReactNode } from "react";
import { routes } from "../../app/routes";

type AuthMode = "login" | "register";

export interface AuthFormShellProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "title"> {
  readonly mode: AuthMode;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly footer: ReactNode;
}

export function AuthFormShell({
  mode,
  title,
  description,
  children,
  footer,
  className,
  ...formProps
}: AuthFormShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-brand" aria-label="ProofSpace">
        <h1>ProofSpace</h1>
        <p>企业制度智能治理平台</p>
        <span>可审查 · 可追溯 · 可治理</span>
      </section>
      <form
        className={`auth-card ${mode === "register" ? "register-card" : ""} ${className ?? ""}`.trim()}
        {...formProps}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="segments" aria-label="账号操作">
          {mode === "login" ? (
            <span className="selected" aria-current="page">登录</span>
          ) : (
            <Link href={routes.login}>登录</Link>
          )}
          {mode === "register" ? (
            <span className="selected" aria-current="page">注册</span>
          ) : (
            <Link href={routes.register}>注册</Link>
          )}
        </div>
        {children}
        <small>{footer}</small>
      </form>
    </main>
  );
}

