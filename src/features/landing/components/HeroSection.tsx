import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { StaticNetworkVisual } from "./StaticNetworkVisual";
import { VisualBoundary } from "./VisualBoundary";

const ThreeRuleNetwork = dynamic(() => import("./ThreeRuleNetwork"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center text-sm text-muted md:h-[620px]">
      正在生成规则网络
    </div>
  ),
});

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const copyVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: smoothEase },
  },
};

const productFlow = ["文件分类", "智能审校", "知识入库", "溯源问答"];
const productValues = [
  "AI 与人工协同确认",
  "风险结论可追溯",
  "知识资产持续沉淀",
];

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const fallback = <StaticNetworkVisual variant="governance" />;

  return (
    <section
      className="relative flex min-h-[100svh] scroll-mt-24 items-start overflow-hidden px-5 pb-16 pt-28 md:px-8 md:pb-20 md:pt-32"
      id="product"
    >
      <div className="paper-noise" />
      <div className="mx-auto grid w-full max-w-[1280px] items-start gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
        <motion.div
          animate="show"
          className="relative z-10 max-w-3xl"
          initial="hidden"
          variants={copyVariants}
        >
          <motion.div
            className="mb-8 inline-flex items-center gap-3 border-y border-line/75 py-3 pr-4 text-sm text-muted"
            variants={itemVariants}
          >
            <span className="font-display text-2xl leading-none text-ink">
              ProofSpace
            </span>
            <span className="h-1 w-1 rounded-full bg-copper" />
            <span>明证智能</span>
          </motion.div>
          <motion.h1
            className="text-balance text-4xl font-semibold leading-[1.08] tracking-normal text-ink md:text-6xl"
            variants={itemVariants}
          >
            <span className="block">企业文件审校</span>
            <span className="block">与知识治理平台</span>
          </motion.h1>
          <motion.p
            className="mt-7 max-w-2xl text-xl leading-9 text-ink/90 md:text-2xl md:leading-10"
            variants={itemVariants}
          >
            完成文件分类、智能审校、知识入库与可追溯问答。
          </motion.p>
          <motion.div
            className="mt-9 grid max-w-2xl grid-cols-2 overflow-hidden border border-line bg-card/45 sm:grid-cols-4"
            variants={itemVariants}
          >
            {productFlow.map((item, index) => (
              <div
                className="border-line px-4 py-4 even:border-l sm:border-l sm:first:border-l-0"
                key={item}
              >
                <span className="block text-[10px] font-semibold text-copper">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong className="mt-2 block text-sm font-semibold text-ink">
                  {item}
                </strong>
              </div>
            ))}
          </motion.div>
          <motion.div
            className="mt-7 flex max-w-2xl flex-wrap gap-x-6 gap-y-3 border-y border-line/70 py-4 text-sm text-muted"
            variants={itemVariants}
          >
            {productValues.map((item) => (
              <span className="inline-flex items-center gap-2" key={item}>
                <span className="h-1.5 w-1.5 rounded-full bg-copper" />
                {item}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="relative h-[500px] overflow-visible md:h-[600px] lg:-mt-2 lg:h-[640px]"
          initial={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.9, delay: 0.24, ease: smoothEase }}
        >
          <div className="absolute inset-x-4 top-8 h-px bg-line/70" />
          <div className="absolute inset-x-4 bottom-14 h-px bg-line/70" />
          <div className="absolute right-6 top-12 hidden text-xs uppercase tracking-[0.18em] text-muted/70 md:block">
            Governance Network
          </div>
          {shouldReduceMotion ? (
            fallback
          ) : (
            <VisualBoundary fallback={fallback}>
              <ThreeRuleNetwork />
            </VisualBoundary>
          )}
        </motion.div>
      </div>
    </section>
  );
}
