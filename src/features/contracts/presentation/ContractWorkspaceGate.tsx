import { LockKeyhole, LogIn } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { AuthApi, AuthSession } from "../../auth";
import { PageStack, Surface } from "../../../shared/ui";

export interface ContractWorkspaceGateProps {
  readonly auth: AuthApi;
  readonly children: ReactNode;
}

type GateState = "loading" | "authenticated" | "anonymous" | "error";

export function ContractWorkspaceGate({
  auth,
  children,
}: ContractWorkspaceGateProps) {
  const [state, setState] = useState<GateState>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setState("loading");
    setFeedback(null);
    try {
      const current = await auth.getSession();
      setSession(current);
      setState(current ? "authenticated" : "anonymous");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "合同服务暂不可用");
      setState("error");
    }
  }, [auth]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await auth.login({ username: username.trim(), password });
      const current = result.session ?? await auth.getSession();
      if (!current) throw new Error("合同服务登录成功，但未返回有效会话");
      setPassword("");
      setSession(current);
      setState("authenticated");
    } catch (error) {
      setPassword("");
      setFeedback(error instanceof Error ? error.message : "合同服务登录失败");
      setState("anonymous");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "authenticated" && session) return <>{children}</>;

  if (state === "loading") {
    return (
      <PageStack>
        <Surface className="contract-auth-gate" aria-busy="true">
          <span className="button-spinner" aria-hidden="true" />
          <strong>正在连接合同服务</strong>
          <p>正在检查 WPS 合同会话，请稍候。</p>
        </Surface>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <Surface className="contract-auth-gate">
        <span className="contract-auth-icon"><LockKeyhole size={24} /></span>
        <div>
          <strong>登录合同编辑服务</strong>
          <p>合同与 WPS 使用独立安全会话。凭据只发送到同域 ProofSpace 服务，不会保存到浏览器存储。</p>
        </div>
        <form onSubmit={(event) => void login(event)}>
          <label>
            <span>用户名</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={submitting}
            />
          </label>
          <label>
            <span>密码</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
          </label>
          <button
            type="submit"
            className="primary"
            disabled={submitting || !username.trim() || !password}
          >
            {submitting ? <span className="button-spinner" aria-hidden="true" /> : <LogIn size={15} />}
            {submitting ? "正在登录" : "进入合同服务"}
          </button>
        </form>
        {feedback ? <p className="action-feedback error">{feedback}</p> : null}
        {state === "error" ? (
          <button type="button" className="secondary" onClick={() => void loadSession()}>
            重新连接
          </button>
        ) : null}
      </Surface>
    </PageStack>
  );
}
