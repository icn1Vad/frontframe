import Link from "next/link";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <h1>ProofSpace</h1>
        <p>企业制度智能治理平台</p>
        <span>可审查 · 可追溯 · 可治理</span>
      </section>
      <form className="auth-card" onSubmit={(e) => { e.preventDefault(); router.push("/dashboard"); }}>
        <h2>登录 ProofSpace</h2>
        <p>输入账号信息进入企业知识治理中心</p>
        <div className="segments"><span className="selected">登录</span><Link href="/register">注册</Link></div>
        <label>用户名<input placeholder="请输入用户名" /></label>
        <label>密码<input type="password" placeholder="请输入密码" /></label>
        <button className="primary full" type="submit">进入</button>
        <small>没有账号？切换到注册提交申请</small>
      </form>
    </main>
  );
}
