import { motion } from "framer-motion";
import { LandingAuthPanel } from "./LandingAuthPanel";
import { SectionTitle } from "./SectionTitle";

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function ExperienceSection() {
  return (
    <section
      className="landing-fullpage-section landing-experience-section relative flex min-h-[100svh] scroll-mt-24 items-start overflow-hidden border-t border-line/65 px-5 py-24 md:px-8 md:py-28"
      id="experience"
    >
      <div className="paper-noise" />
      <div className="mx-auto w-full max-w-[1280px]">
        <motion.div
          className="landing-experience-grid grid gap-10 border-y border-line py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(430px,0.72fr)] lg:items-center lg:gap-16"
          initial={{ opacity: 0, y: 22 }}
          transition={{ duration: 0.72, ease: smoothEase }}
          viewport={{ once: true, amount: 0.2 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="landing-experience-copy">
            <SectionTitle
              align="left"
              className="landing-experience-title [&_h2]:text-3xl [&_h2]:leading-tight md:[&_h2]:text-4xl"
              eyebrow="Experience"
              title={
                <>
                  企业文件治理，
                  <br />
                  从审校到知识形成闭环。
                </>
              }
              subtitle="分类、审校、归档与问答，在同一套可追溯流程中完成。"
            />
            <p className="mt-10 max-w-2xl text-2xl font-semibold leading-10 text-ink md:text-3xl md:leading-[1.3]">
              让每一份企业文件都可审查、可追溯、可复用。
            </p>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted">
              登录后进入统一工作区，继续完成文件分类、风险审查、知识归档与溯源问答。
            </p>
            <div className="landing-experience-mark" aria-hidden="true">
              <span>Review</span>
              <span>Trace</span>
              <span>Govern</span>
            </div>
          </div>

          <LandingAuthPanel />
        </motion.div>

        <footer className="mt-10 flex flex-col justify-between gap-3 text-sm text-muted md:flex-row">
          <p>ProofSpace © 2026</p>
          <p>AI Review Engine for Enterprise Knowledge Governance</p>
        </footer>
      </div>
    </section>
  );
}
