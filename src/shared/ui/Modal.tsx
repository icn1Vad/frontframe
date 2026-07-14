import {
  useState,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { classNames } from "../lib/classNames";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => element.getClientRects().length > 0);
}

function getBackgroundElements(modalRoot: HTMLElement): HTMLElement[] {
  const elements: HTMLElement[] = [];
  let current: HTMLElement | null = modalRoot;

  while (current) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent || parent === document.body) break;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== current && sibling instanceof HTMLElement) {
        elements.push(sibling);
      }
    });
    current = parent;
  }

  return elements;
}

export interface ModalProps {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  closeLabel?: string;
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
  className,
  closeLabel = "关闭",
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const closingRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onCloseRef.current();
      return;
    }

    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      onCloseRef.current();
    }, 240);
  };

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const backdrop = backdropRef.current;
    const body = document.body;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth,
    );
    const backgroundStates = backdrop
      ? getBackgroundElements(backdrop).map((element) => ({
          element,
          inert: element.inert,
          ariaHidden: element.getAttribute("aria-hidden"),
        }))
      : [];

    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(
        window.getComputedStyle(body).paddingRight,
      ) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    body.style.overflow = "hidden";

    backgroundStates.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = getFocusableElements(modalRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        modalRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement || !modalRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === lastElement || !modalRef.current.contains(activeElement))
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      backgroundStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  return (
    <div
      ref={backdropRef}
      className={`modal-backdrop ${isClosing ? "closing" : ""}`}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={modalRef}
        className={classNames("modal", isClosing && "closing", className)}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="modal-close"
          aria-label={closeLabel}
          title={closeLabel}
          onClick={requestClose}
        >
          ×
        </button>
        <h2 id={titleId}>{title}</h2>
        {subtitle ? (
          <p id={subtitleId} className="modal-subtitle">
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
