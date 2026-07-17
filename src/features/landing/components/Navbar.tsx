import { motion } from "framer-motion";
import { CTAButton } from "./CTAButton";

const navItems = [
  { label: "产品概况", href: "#product" },
  { label: "技术架构", href: "#technology" },
];

const smoothEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Navbar() {
  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="site-header fixed left-0 right-0 top-0 z-50 border-b border-line/65"
      initial={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.7, ease: smoothEase }}
    >
      <nav
        aria-label="官网导航"
        className="relative z-10 mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 md:px-8"
      >
        <a
          aria-label="返回产品首页"
          className="font-display text-2xl leading-none tracking-normal text-ink"
          href="#product"
        >
          ProofSpace
        </a>
        <div className="hidden items-center gap-8 xl:flex">
          {navItems.map((item) => (
            <a
              className="text-sm text-muted transition-colors duration-300 hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>
        <CTAButton
          className="h-10 px-4 text-xs md:h-11 md:px-5 md:text-sm"
          href="#experience"
        >
          登录/注册
        </CTAButton>
      </nav>
    </motion.header>
  );
}
