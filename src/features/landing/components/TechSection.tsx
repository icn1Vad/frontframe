import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { SectionTitle } from "./SectionTitle";
import { StaticNetworkVisual } from "./StaticNetworkVisual";
import { VisualBoundary } from "./VisualBoundary";

const AgentOrbit = dynamic(() => import("./AgentOrbit"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center text-sm text-muted md:h-[560px]">
      正在生成 Agent 网络
    </div>
  ),
});

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const architectureLayers = [
  {
    code: "L1 / Single Agent Runtime",
    title: "单 Agent 执行内核",
    description:
      "由 Aituge Single-Agent Runtime 驱动，统一完成 ReAct 推理、工具并行调用、流式响应、会话持久化与上下文压缩。",
  },
  {
    code: "L2 / Agent Harness",
    title: "Harness 控制层",
    description:
      "由 TaskManager、Scheduler、Registry、Session、Trace 与 SSE 组成，负责任务生命周期、调度和并发控制。",
  },
  {
    code: "L3 / Data Governance",
    title: "数据治理层",
    description:
      "Agent 不直接访问数据库。SQL、RAG、知识库、文件和外部 API 均通过 Data Access Gateway 统一鉴权与审计。",
  },
  {
    code: "Context / Memory",
    title: "双层会话与上下文工程",
    description:
      "SQLite 保存完整历史，Redis 保存运行态上下文；超出预算时优先压缩，失败后裁剪兜底。",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 26 },
  show: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.08,
      duration: 0.68,
      ease: smoothEase,
    },
  }),
};

export function TechSection() {
  const shouldReduceMotion = useReducedMotion();
  const fallback = <StaticNetworkVisual variant="agent" />;

  return (
    <section
      className="relative flex min-h-[100svh] scroll-mt-24 items-start overflow-hidden border-t border-line/65 px-5 py-20 md:px-8 md:py-24"
      id="technology"
    >
      <div className="paper-noise" />
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12">
        <div className="relative z-10">
          <SectionTitle
            className="[&_h2]:text-3xl md:[&_h2]:text-4xl"
            eyebrow="Architecture"
            title={
              <>
                三层技术架构，
                <br />
                隔离执行、调度与数据访问
              </>
            }
            subtitle="执行内核只负责完成一次 Agent ReAct 任务；Harness 负责生命周期和资源调度；数据治理层负责所有真实数据访问。职责分离后，每个任务都可追踪、可审计、可扩展。"
          />

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {architectureLayers.map((card, index) => (
              <motion.article
                className="group rounded-[8px] border border-line bg-card p-6 shadow-[0_18px_48px_rgba(23,20,17,0.045)] backdrop-blur-md transition-colors duration-300 hover:border-copper/55 hover:bg-[rgba(255,252,246,0.9)]"
                custom={index}
                initial="hidden"
                key={card.title}
                variants={cardVariants}
                viewport={{ once: true, amount: 0.35 }}
                whileHover={{ y: -4 }}
                whileInView="show"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">
                  {card.code}
                </p>
                <h3 className="mt-5 text-xl font-semibold leading-8 text-ink">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {card.description}
                </p>
              </motion.article>
            ))}
          </div>
        </div>

        <motion.div
          className="relative h-[390px] md:h-[560px] lg:h-[680px]"
          initial={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.85, ease: smoothEase }}
          viewport={{ once: true, amount: 0.25 }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          <div className="absolute inset-x-10 top-10 h-px bg-line/70" />
          <div className="absolute inset-x-10 bottom-10 h-px bg-line/70" />
          <div className="absolute left-10 top-14 text-xs uppercase tracking-[0.18em] text-muted/70">
            Harness Control Plane
          </div>
          {shouldReduceMotion ? (
            fallback
          ) : (
            <VisualBoundary fallback={fallback}>
              <AgentOrbit />
            </VisualBoundary>
          )}
        </motion.div>
      </div>
    </section>
  );
}
