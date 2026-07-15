import {
  LANDING_SECTIONS,
  type LandingSectionIndex,
} from "../fullPageNavigation";

interface SectionNavigationProps {
  readonly currentSection: LandingSectionIndex;
  readonly isAnimating: boolean;
  readonly onNavigate: (index: LandingSectionIndex) => void;
}

export function SectionNavigation({
  currentSection,
  isAnimating,
  onNavigate,
}: SectionNavigationProps) {
  return (
    <nav
      aria-busy={isAnimating}
      aria-label="首页分屏导航"
      className="landing-section-navigation"
    >
      {LANDING_SECTIONS.map((section, index) => {
        const sectionIndex = index as LandingSectionIndex;
        const isCurrent = currentSection === sectionIndex;

        return (
          <button
            aria-current={isCurrent ? "page" : undefined}
            aria-label={`前往${section.label}`}
            className="landing-section-dot"
            key={section.id}
            onClick={() => onNavigate(sectionIndex)}
            title={section.label}
            type="button"
          >
            <span aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
