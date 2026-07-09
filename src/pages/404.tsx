import { Search } from "lucide-react";
import Link from "next/link";
export default function NotFound() { return <main className="error-page"><div><span><Search /></span><h1>404</h1><p>页面不存在，可能已被移动或删除。</p><Link className="primary" href="/dashboard">返回首页</Link></div></main>; }
