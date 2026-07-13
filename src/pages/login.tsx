import { useRouter } from "next/router";
import { routes } from "../app/routes";
import { AuthFormShell } from "../features/auth";

export default function Login() {
  const router = useRouter();
  return (
    <AuthFormShell
      mode="login"
      title="登录 ProofSpace"
      description="输入账号信息进入企业知识治理中心"
      footer="没有账号？切换到注册提交申请"
      onSubmit={(event) => {
        event.preventDefault();
        void router.push(routes.dashboard);
      }}
    >
        <label>用户名<input name="username" autoComplete="username" required placeholder="请输入用户名" /></label>
        <label>密码<input name="password" type="password" autoComplete="current-password" required placeholder="请输入密码" /></label>
        <button className="primary full" type="submit">进入</button>
    </AuthFormShell>
  );
}
