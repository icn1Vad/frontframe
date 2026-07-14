import Head from "next/head";
import { LandingHome } from "../features/landing";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>ProofSpace 明证智能 | 企业知识资产的 AI 审查与治理引擎</title>
        <meta
          content="将分散的企业文件，转化为可审查、可追溯、可治理的智能知识资产。"
          name="description"
        />
      </Head>
      <LandingHome />
    </>
  );
}
