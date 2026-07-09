import Link from "next/link";

export default function Register() {
  return (
    <main className="auth-page">
      <section className="auth-brand"><h1>ProofSpace</h1><p>企业制度智能治理平台</p><span>可审查 · 可追溯 · 可治理</span></section>
      <form className="auth-card register-card" onSubmit={(e) => e.preventDefault()}>
        <h2>申请访问 ProofSpace</h2><p>提交账号申请，等待管理员审批后登录</p>
        <div className="segments"><Link href="/login">登录</Link><span className="selected">注册</span></div>
        <label>用户名<input placeholder="请输入用户名" /></label>
        <label>权限<select defaultValue=""><option value="" disabled>普通用户 / 管理员</option><option>普通用户</option><option>管理员</option></select></label>
        <label>密码<input type="password" placeholder="请输入密码" /></label>
        <button className="primary full" type="submit">申请</button>
        <small>已有账号？切换到登录</small>
      </form>
    </main>
  );
}
