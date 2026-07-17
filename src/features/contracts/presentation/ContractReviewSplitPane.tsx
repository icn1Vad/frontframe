import {
  Children,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_CONTRACT_EDITOR_PERCENT,
  MAX_CONTRACT_EDITOR_PERCENT,
  MIN_CONTRACT_EDITOR_PERCENT,
  normalizeContractEditorPercent,
} from "./contractReviewLayout";

interface ContractReviewSplitPaneProps {
  readonly children: ReactNode;
  readonly storageKey: string;
}

type SplitPaneStyle = CSSProperties & {
  "--contract-left-size": string;
  "--contract-right-size": string;
};

export function ContractReviewSplitPane({
  children,
  storageKey,
}: ContractReviewSplitPaneProps) {
  const panes = Children.toArray(children);
  const containerRef = useRef<HTMLElement>(null);
  const [leftPercent, setLeftPercent] = useState(DEFAULT_CONTRACT_EDITOR_PERCENT);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) setLeftPercent(normalizeContractEditorPercent(Number(stored)));
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, String(leftPercent));
  }, [leftPercent, storageKey]);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0) return;
    setLeftPercent(normalizeContractEditorPercent(
      ((event.clientX - bounds.left) / bounds.width) * 100,
    ));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") setLeftPercent(MIN_CONTRACT_EDITOR_PERCENT);
    else if (event.key === "End") setLeftPercent(MAX_CONTRACT_EDITOR_PERCENT);
    else setLeftPercent((current) => normalizeContractEditorPercent(
      current + (event.key === "ArrowRight" ? 2 : -2),
    ));
  }

  const style: SplitPaneStyle = {
    "--contract-left-size": `${leftPercent}fr`,
    "--contract-right-size": `${100 - leftPercent}fr`,
  };

  return (
    <section
      ref={containerRef}
      className="contract-workbench"
      aria-label="合同审查工作台"
      style={style}
    >
      {panes[0]}
      <div
        className="contract-workbench-splitter"
        role="separator"
        aria-label="调整合同编辑器与审查面板宽度"
        aria-orientation="vertical"
        aria-valuemin={MIN_CONTRACT_EDITOR_PERCENT}
        aria-valuemax={MAX_CONTRACT_EDITOR_PERCENT}
        aria-valuenow={leftPercent}
        tabIndex={0}
        onDoubleClick={() => setLeftPercent(DEFAULT_CONTRACT_EDITOR_PERCENT)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
        }}
      >
        <span />
      </div>
      {panes[1]}
    </section>
  );
}
