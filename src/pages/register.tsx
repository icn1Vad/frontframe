import { AuthFormShell } from "../features/auth";

export default function Register() {
  return (
    <AuthFormShell
      mode="register"
      title="申请访问 ProofSpace"
      description="提交账号申请，等待管理员审批后登录"
      footer="已有账号？切换到登录"
      onSubmit={(event) => event.preventDefault()}
    >
        <label>用户名<input name="username" autoComplete="username" required placeholder="请输入用户名" /></label>
        <label>权限<select name="role" required defaultValue=""><option value="" disabled>普通用户 / 管理员</option><option value="user">普通用户</option><option value="admin">管理员</option></select></label>
        <label>密码<input name="password" type="password" autoComplete="new-password" required placeholder="请输入密码" /></label>
        <button className="primary full" type="submit">申请</button>
    </AuthFormShell>
  );
}
