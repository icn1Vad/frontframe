import { ArrowRight } from "lucide-react";
import { useRouter } from "next/router";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { routes } from "../../../app/routes";
import { appServices } from "../../../app/services";
import { type AuthMode, type RequestedRole } from "../../auth";

interface Feedback {
  readonly kind: "success" | "info" | "error";
  readonly message: string;
}

function modeFromQuery(value: string | string[] | undefined): AuthMode {
  return value === "register" ? "register" : "login";
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "操作暂时无法完成，请稍后重试。";
}

export function LandingAuthPanel() {
  const router = useRouter();
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (router.isReady) {
      setMode(modeFromQuery(router.query.auth));
    }
  }, [router.isReady, router.query.auth]);

  function selectMode(
    nextMode: AuthMode,
    focusTarget: "none" | "input" | "tab" = "none",
  ): void {
    if (nextMode === mode || isSubmitting) {
      return;
    }
    setMode(nextMode);
    setFeedback(null);
    void router.replace(`/?auth=${nextMode}#experience`, undefined, {
      shallow: true,
      scroll: false,
    });
    window.requestAnimationFrame(() => {
      if (focusTarget === "input") {
        usernameInputRef.current?.focus();
      }
      if (focusTarget === "tab") {
        (nextMode === "login" ? loginTabRef : registerTabRef).current?.focus();
      }
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    let nextMode: AuthMode;
    if (event.key === "Home") {
      nextMode = "login";
    } else if (event.key === "End") {
      nextMode = "register";
    } else {
      nextMode = mode === "login" ? "register" : "login";
    }
    selectMode(nextMode, "tab");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (mode === "login") {
        const result = await appServices.auth.login({ username, password });
        setFeedback({ kind: "success", message: result.message });
        await router.push(routes.dashboard);
        return;
      }

      const requestedRole = String(
        formData.get("requestedRole") ?? "user",
      ) as RequestedRole;
      const result = await appServices.auth.register({
        username,
        password,
        requestedRole,
      });
      setFeedback({ kind: "info", message: result.message });
    } catch (error) {
      setFeedback({ kind: "error", message: errorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === "login";
  const title = isLogin ? "登录 ProofSpace" : "申请访问 ProofSpace";
  const description = isLogin
    ? "输入账号信息，进入企业知识治理工作区。"
    : "提交账号申请，权限需由管理员在服务端审核。";

  return (
    <section className="landing-auth-card" aria-labelledby="auth-card-title">
      <div aria-label="账号操作" className="landing-auth-tabs" role="tablist">
        <button
          aria-controls="landing-auth-panel"
          aria-selected={isLogin}
          id="landing-login-tab"
          onClick={() => selectMode("login")}
          onKeyDown={handleTabKeyDown}
          ref={loginTabRef}
          role="tab"
          tabIndex={isLogin ? 0 : -1}
          type="button"
        >
          登录
        </button>
        <button
          aria-controls="landing-auth-panel"
          aria-selected={!isLogin}
          id="landing-register-tab"
          onClick={() => selectMode("register")}
          onKeyDown={handleTabKeyDown}
          ref={registerTabRef}
          role="tab"
          tabIndex={isLogin ? -1 : 0}
          type="button"
        >
          注册
        </button>
      </div>

      <div
        aria-labelledby={isLogin ? "landing-login-tab" : "landing-register-tab"}
        id="landing-auth-panel"
        role="tabpanel"
      >
        <h3 id="auth-card-title">{title}</h3>
        <p className="landing-auth-description">{description}</p>

        <form aria-busy={isSubmitting} onSubmit={handleSubmit}>
          <label htmlFor="landing-username">
            用户名
            <input
              autoComplete="username"
              disabled={isSubmitting}
              id="landing-username"
              name="username"
              placeholder="请输入用户名"
              ref={usernameInputRef}
              required
            />
          </label>

          {!isLogin ? (
            <label htmlFor="landing-requested-role">
              申请角色
              <select
                defaultValue="user"
                disabled={isSubmitting}
                id="landing-requested-role"
                name="requestedRole"
                required
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员（申请）</option>
              </select>
              <small>管理员权限必须由服务端审核后授予。</small>
            </label>
          ) : null}

          <label htmlFor="landing-password">
            密码
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              disabled={isSubmitting}
              id="landing-password"
              name="password"
              placeholder="请输入密码"
              required
              type="password"
            />
          </label>

          <button
            className="landing-auth-submit"
            disabled={isSubmitting}
            type="submit"
          >
            <span>
              {isSubmitting
                ? isLogin
                  ? "登录中…"
                  : "提交中…"
                : isLogin
                  ? "进入工作台"
                  : "提交申请"}
            </span>
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
          </button>
        </form>

        <div
          aria-atomic="true"
          aria-live="polite"
          className={`landing-auth-feedback ${feedback?.kind ?? ""}`.trim()}
          role="status"
        >
          {feedback?.message ?? "\u00a0"}
        </div>

        <button
          className="landing-auth-switch"
          disabled={isSubmitting}
          onClick={() => selectMode(isLogin ? "register" : "login", "input")}
          type="button"
        >
          {isLogin ? "还没有账号？提交注册申请" : "已有账号？返回登录"}
        </button>
      </div>
    </section>
  );
}
