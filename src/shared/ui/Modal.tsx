import {
  useState,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { classNames } from "../lib/classNames";

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
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
      previouslyFocused?.focus();
    };
  }, []);

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  };

  return (
    <div
      className={`modal-backdrop ${isClosing ? "closing" : ""}`}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={classNames("modal", isClosing && "closing", className)}
        role="dialog"
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
