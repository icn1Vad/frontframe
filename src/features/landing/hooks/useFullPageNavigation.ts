import { useReducedMotion } from "framer-motion";
import {
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  accumulateWheelDelta,
  clampSectionIndex,
  directionFromKey,
  LANDING_SECTIONS,
  type LandingSectionIndex,
  normalizeWheelDelta,
  sectionIndexAtViewportCenter,
  sectionIndexFromHash,
} from "../fullPageNavigation";

type FullPageMode = "natural" | "strict";

interface FullPageNavigation {
  readonly currentSection: LandingSectionIndex;
  readonly handleAnchorClick: (event: ReactMouseEvent<HTMLElement>) => void;
  readonly isAnimating: boolean;
  readonly mode: FullPageMode;
  readonly navigateToSection: (index: LandingSectionIndex) => void;
}

const ANIMATION_DURATION = 760;
const WHEEL_RELEASE_DELAY = 150;
const TOUCH_THRESHOLD = 52;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      "input, select, textarea, button, a, [contenteditable='true'], [role='tab']",
    ) !== null
  );
}

function easeOutQuart(progress: number): number {
  return 1 - Math.pow(1 - progress, 4);
}

function replaceSectionHash(index: LandingSectionIndex): void {
  const url = new URL(window.location.href);
  const nextHash = `#${LANDING_SECTIONS[index].id}`;
  if (url.hash === nextHash) {
    return;
  }
  url.hash = nextHash;
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

export function useFullPageNavigation(
  containerRef: RefObject<HTMLElement | null>,
): FullPageNavigation {
  const shouldReduceMotion = useReducedMotion();
  const [currentSection, setCurrentSection] =
    useState<LandingSectionIndex>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mode, setMode] = useState<FullPageMode>("natural");
  const animationFrameRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const measureFrameRef = useRef<number | null>(null);
  const wheelReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const currentSectionRef = useRef<LandingSectionIndex>(0);
  const isAnimatingRef = useRef(false);
  const modeRef = useRef<FullPageMode>("natural");
  const wheelAccumulatorRef = useRef(0);
  const awaitingWheelReleaseRef = useRef(false);
  const touchStartRef = useRef<{
    readonly x: number;
    readonly y: number;
  } | null>(null);

  const sectionElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) {
      return [];
    }
    return LANDING_SECTIONS.map((section) =>
      container.querySelector<HTMLElement>(`#${section.id}`),
    ).filter((section): section is HTMLElement => section !== null);
  }, [containerRef]);

  const setActiveSection = useCallback((index: LandingSectionIndex): void => {
    currentSectionRef.current = index;
    setCurrentSection(index);
    replaceSectionHash(index);
  }, []);

  const finishAnimation = useCallback(
    (index: LandingSectionIndex, destination: number): void => {
      const container = containerRef.current;
      if (!container) {
        return;
      }
      container.scrollTop = destination;
      container.removeAttribute("data-section-animating");
      isAnimatingRef.current = false;
      animationFrameRef.current = null;
      setIsAnimating(false);
      setActiveSection(index);
    },
    [containerRef, setActiveSection],
  );

  const navigateToSection = useCallback(
    (requestedIndex: LandingSectionIndex): void => {
      const container = containerRef.current;
      const sections = sectionElements();
      if (!container || sections.length !== LANDING_SECTIONS.length) {
        return;
      }
      if (isAnimatingRef.current) {
        return;
      }

      const index = clampSectionIndex(requestedIndex);
      const destination = sections[index].offsetTop;
      const startTop = container.scrollTop;
      setActiveSection(index);

      if (shouldReduceMotion || Math.abs(destination - startTop) < 1) {
        container.scrollTop = destination;
        return;
      }

      isAnimatingRef.current = true;
      setIsAnimating(true);
      container.setAttribute("data-section-animating", "true");
      const startedAt = performance.now();

      const tick = (now: number): void => {
        const progress = Math.min(1, (now - startedAt) / ANIMATION_DURATION);
        container.scrollTop =
          startTop + (destination - startTop) * easeOutQuart(progress);

        if (progress < 1) {
          animationFrameRef.current = window.requestAnimationFrame(tick);
          return;
        }
        finishAnimation(index, destination);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    },
    [
      containerRef,
      finishAnimation,
      sectionElements,
      setActiveSection,
      shouldReduceMotion,
    ],
  );

  const measureMode = useCallback((): void => {
    const container = containerRef.current;
    const sections = sectionElements();
    if (!container || sections.length !== LANDING_SECTIONS.length) {
      return;
    }

    const nextMode: FullPageMode =
      window.innerWidth >= 1024 &&
      sections.every(
        (section) => section.scrollHeight <= container.clientHeight + 1,
      )
        ? "strict"
        : "natural";

    modeRef.current = nextMode;
    container.dataset.fullpageMode = nextMode;
    setMode(nextMode);
  }, [containerRef, sectionElements]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scheduleMeasurement = (): void => {
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
      measureFrameRef.current = window.requestAnimationFrame(() => {
        measureFrameRef.current = null;
        measureMode();
        const sections = sectionElements();
        const active = sections[currentSectionRef.current];
        if (modeRef.current === "strict" && active) {
          container.scrollTop = active.offsetTop;
        }
      });
    };

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(container);
    sectionElements().forEach((section) => resizeObserver.observe(section));
    const authCard = container.querySelector<HTMLElement>(".landing-auth-card");
    if (authCard) {
      resizeObserver.observe(authCard);
    }
    window.addEventListener("resize", scheduleMeasurement);
    scheduleMeasurement();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasurement);
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
        measureFrameRef.current = null;
      }
    };
  }, [containerRef, measureMode, sectionElements]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const syncFromScroll = (): void => {
      if (isAnimatingRef.current) {
        return;
      }
      const sections = sectionElements();
      if (sections.length !== LANDING_SECTIONS.length) {
        return;
      }
      const index = sectionIndexAtViewportCenter(
        container.scrollTop,
        container.clientHeight,
        sections.map((section) => ({
          top: section.offsetTop,
          height: section.offsetHeight,
        })),
      );
      if (index !== currentSectionRef.current) {
        setActiveSection(index);
      }
    };

    const handleScroll = (): void => {
      if (scrollFrameRef.current !== null) {
        return;
      }
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        syncFromScroll();
      });
    };

    const releaseWheelGesture = (): void => {
      awaitingWheelReleaseRef.current = false;
      wheelAccumulatorRef.current = 0;
      wheelReleaseTimerRef.current = null;
    };

    const scheduleWheelRelease = (): void => {
      if (wheelReleaseTimerRef.current !== null) {
        clearTimeout(wheelReleaseTimerRef.current);
      }
      wheelReleaseTimerRef.current = setTimeout(
        releaseWheelGesture,
        WHEEL_RELEASE_DELAY,
      );
    };

    const handleWheel = (event: WheelEvent): void => {
      if (
        modeRef.current !== "strict" ||
        event.ctrlKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        return;
      }

      event.preventDefault();
      scheduleWheelRelease();
      if (isAnimatingRef.current || awaitingWheelReleaseRef.current) {
        return;
      }

      const accumulation = accumulateWheelDelta(
        wheelAccumulatorRef.current,
        normalizeWheelDelta(
          event.deltaY,
          event.deltaMode,
          container.clientHeight,
        ),
      );
      wheelAccumulatorRef.current = accumulation.accumulated;
      if (accumulation.direction === 0) {
        return;
      }

      awaitingWheelReleaseRef.current = true;
      navigateToSection(
        clampSectionIndex(
          currentSectionRef.current + accumulation.direction,
        ),
      );
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        modeRef.current !== "strict" ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isInteractiveTarget(event.target)
      ) {
        return;
      }

      const direction = directionFromKey(event.key, event.shiftKey);
      if (direction === null) {
        return;
      }
      event.preventDefault();

      if (direction === "first") {
        navigateToSection(0);
      } else if (direction === "last") {
        navigateToSection(2);
      } else {
        navigateToSection(
          clampSectionIndex(currentSectionRef.current + direction),
        );
      }
    };

    const handleTouchStart = (event: TouchEvent): void => {
      if (
        modeRef.current !== "strict" ||
        event.touches.length !== 1 ||
        isInteractiveTarget(event.target)
      ) {
        touchStartRef.current = null;
        return;
      }
      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    };

    const handleTouchMove = (event: TouchEvent): void => {
      const start = touchStartRef.current;
      if (!start || modeRef.current !== "strict" || event.touches.length !== 1) {
        return;
      }
      const deltaX = event.touches[0].clientX - start.x;
      const deltaY = event.touches[0].clientY - start.y;
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent): void => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (
        !start ||
        modeRef.current !== "strict" ||
        event.changedTouches.length !== 1 ||
        isAnimatingRef.current
      ) {
        return;
      }

      const deltaX = event.changedTouches[0].clientX - start.x;
      const deltaY = event.changedTouches[0].clientY - start.y;
      if (
        Math.abs(deltaY) < TOUCH_THRESHOLD ||
        Math.abs(deltaY) <= Math.abs(deltaX)
      ) {
        return;
      }
      navigateToSection(
        clampSectionIndex(currentSectionRef.current + (deltaY < 0 ? 1 : -1)),
      );
    };

    const handleHashChange = (): void => {
      const index = sectionIndexFromHash(window.location.hash);
      if (index !== null) {
        navigateToSection(index);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("hashchange", handleHashChange);

    const initialIndex = sectionIndexFromHash(window.location.hash) ?? 0;
    const initialFrame = window.requestAnimationFrame(() => {
      const sections = sectionElements();
      const initialSection = sections[initialIndex];
      if (initialSection) {
        container.scrollTop = initialSection.offsetTop;
        setActiveSection(initialIndex);
      }
    });

    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("hashchange", handleHashChange);
      window.cancelAnimationFrame(initialFrame);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
      if (wheelReleaseTimerRef.current !== null) {
        clearTimeout(wheelReleaseTimerRef.current);
      }
    };
  }, [
    containerRef,
    navigateToSection,
    sectionElements,
    setActiveSection,
  ]);

  const handleAnchorClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>): void => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !(event.target instanceof Element)
      ) {
        return;
      }
      const anchor = event.target.closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor || anchor.target === "_blank") {
        return;
      }
      const index = sectionIndexFromHash(anchor.hash);
      if (index === null) {
        return;
      }
      event.preventDefault();
      navigateToSection(index);
    },
    [navigateToSection],
  );

  return {
    currentSection,
    handleAnchorClick,
    isAnimating,
    mode,
    navigateToSection,
  };
}
