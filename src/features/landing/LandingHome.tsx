import { MotionConfig } from "framer-motion";
import { ExperienceSection } from "./components/ExperienceSection";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { TechSection } from "./components/TechSection";

export function LandingHome() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="landing-page">
        <Navbar />
        <HeroSection />
        <TechSection />
        <ExperienceSection />
      </main>
    </MotionConfig>
  );
}
