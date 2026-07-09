import { LockKeyhole } from "lucide-react";
import Link from "next/link";
export default function Forbidden() { return <main className="error-page"><div><span><LockKeyhole /></span><h1>403</h1><p>权限不足，当前账号无法访问该页面。</p><Link className="primary" href="/dashboard">返回工作台</Link></div></main>; }
