import { Ellipsis, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly href?: ComponentProps<typeof Link>["href"];
  readonly onSelect?: () => void;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly busy?: boolean;
}

export interface ActionMenuProps {
  readonly label: string;
  readonly items: readonly ActionMenuItem[];
}

interface MenuPosition {
  readonly top: number;
  readonly left: number;
}

export function ActionMenu({ label, items }: ActionMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const close = (restoreFocus = false) => {
    setOpen(false);
    setPosition(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const openMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 196;
    const estimatedHeight = items.length * 42 + 12;
    const below = rect.bottom + 6;
    const top = below + estimatedHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - estimatedHeight - 6);
    const left = Math.min(
      window.innerWidth - menuWidth - 8,
      Math.max(8, rect.right - menuWidth),
    );
    setPosition({ top, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const menuItems = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>(
          '[role="menuitem"]:not([aria-disabled="true"])',
        ) ?? [],
      );
      if (menuItems.length === 0) return;
      event.preventDefault();
      const currentIndex = menuItems.indexOf(
        globalThis.document.activeElement as HTMLElement,
      );
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = currentIndex < 0
        ? direction > 0 ? 0 : menuItems.length - 1
        : (currentIndex + direction + menuItems.length) % menuItems.length;
      menuItems[nextIndex]?.focus();
    };
    const closeForViewportChange = () => close();
    const focusId = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
        ?.focus();
    });

    globalThis.document.addEventListener("pointerdown", handlePointerDown);
    globalThis.document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeForViewportChange);
    window.addEventListener("scroll", closeForViewportChange, true);

    return () => {
      window.cancelAnimationFrame(focusId);
      globalThis.document.removeEventListener("pointerdown", handlePointerDown);
      globalThis.document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeForViewportChange);
      window.removeEventListener("scroll", closeForViewportChange, true);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        className="icon-button row-more-trigger"
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) close();
          else openMenu();
        }}
      >
        <Ellipsis />
      </button>
      {open && position && typeof globalThis.document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              className="row-action-menu"
              role="menu"
              aria-label={label}
              style={position}
            >
              {items.map((item) => {
                const ItemIcon = item.icon;
                const itemClass = `row-action-menu-item${item.danger ? " danger" : ""}`;
                const content = (
                  <>
                    {item.busy ? (
                      <span className="button-spinner" aria-hidden="true" />
                    ) : (
                      <ItemIcon aria-hidden="true" />
                    )}
                    <span>{item.busy ? `${item.label}中` : item.label}</span>
                  </>
                );

                if (item.href && !item.disabled) {
                  return (
                    <Link
                      className={itemClass}
                      href={item.href}
                      role="menuitem"
                      onClick={() => close()}
                      key={item.id}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    className={itemClass}
                    type="button"
                    role="menuitem"
                    aria-disabled={item.disabled ? "true" : undefined}
                    disabled={item.disabled}
                    onClick={() => {
                      close();
                      item.onSelect?.();
                    }}
                    key={item.id}
                  >
                    {content}
                  </button>
                );
              })}
            </div>,
            globalThis.document.body,
          )
        : null}
    </>
  );
}
