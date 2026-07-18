import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { SectionTitle } from "./SectionTitle";
import { StaticNetworkVisual } from "./StaticNetworkVisual";
import { VisualBoundary } from "./VisualBoundary";

const AgentOrbit = dynamic(() => import("./AgentOrbit"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center text-sm text-muted md:h-[560px]">
      正在生成智能体网络
    </div>
  ),
});

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const architectureLayers = [
  {
    code: "第一层｜单智能体运行内核",
    title: "单智能体执行内核",
    description:
      "由单智能体运行内核驱动，统一完成推理与行动循环、工具并行调用、流式响应、会话持久化与上下文压缩。",
  },
  {
    code: "第二层｜智能体控制框架",
    title: "任务控制层",
    description:
      "由任务管理、调度中心、注册中心、会话管理、追踪系统与服务端事件流组成，负责任务生命周期、调度和并发控制。",
  },
  {
    code: "第三层｜数据治理",
    title: "数据治理层",
    description:
      "智能体不直接访问数据库。结构化查询、检索增强生成、知识库、文件和外部接口均通过数据访问网关统一鉴权与审计。",
  },
  {
    code: "上下文｜记忆",
    title: "双层会话与上下文工程",
    description:
      "本地关系数据库保存完整历史，高速缓存保存运行态上下文；超出预算时优先压缩，失败后裁剪兜底。",
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
      className="landing-fullpage-section landing-tech-section relative flex min-h-[100svh] scroll-mt-24 items-start overflow-hidden border-t border-line/65 px-5 py-20 md:px-8 md:py-24"
      id="technology"
    >
      <div className="paper-noise" />
      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-10 md:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] md:gap-10 lg:gap-12">
        <div className="relative z-10 min-w-0">
          <SectionTitle
            className="landing-tech-title [&_h2]:text-3xl md:[&_h2]:text-4xl"
            eyebrow="技术架构"
            title={
              <>
                三层技术架构，
                <br />
                隔离执行、调度与数据访问
              </>
            }
            subtitle="执行内核只负责完成一次智能体推理与行动任务；控制层负责生命周期和资源调度；数据治理层负责所有真实数据访问。职责分离后，每个任务都可追踪、可审计、可扩展。"
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
          className="landing-tech-visual relative min-w-0 h-[390px] md:h-[560px] lg:h-[680px]"
          initial={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.85, ease: smoothEase }}
          viewport={{ once: true, amount: 0.25 }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          <div className="absolute inset-x-10 top-10 h-px bg-line/70" />
          <div className="absolute inset-x-10 bottom-10 h-px bg-line/70" />
          <div className="absolute left-10 top-14 text-xs uppercase tracking-[0.18em] text-muted/70">
            任务控制平面
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
