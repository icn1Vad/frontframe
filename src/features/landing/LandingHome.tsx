import { MotionConfig } from "framer-motion";
import { useRef } from "react";
import { ExperienceSection } from "./components/ExperienceSection";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { SectionNavigation } from "./components/SectionNavigation";
import { TechSection } from "./components/TechSection";
import { useFullPageNavigation } from "./hooks/useFullPageNavigation";

export function LandingHome() {
  const containerRef = useRef<HTMLElement | null>(null);
  const {
    currentSection,
    handleAnchorClick,
    isAnimating,
    mode,
    navigateToSection,
  } = useFullPageNavigation(containerRef);

  return (
    <MotionConfig reducedMotion="user">
      <main
        className="landing-page"
        data-fullpage-mode={mode}
        onClickCapture={handleAnchorClick}
        ref={containerRef}
      >
        <Navbar />
        <HeroSection />
        <TechSection />
        <ExperienceSection />
        <SectionNavigation
          currentSection={currentSection}
          isAnimating={isAnimating}
          onNavigate={navigateToSection}
        />
      </main>
    </MotionConfig>
  );
}
