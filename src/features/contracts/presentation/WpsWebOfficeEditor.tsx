import { AlertTriangle, LoaderCircle, RefreshCw } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  ContractDocumentAnchor,
  ContractDocumentRevision,
  WpsContractEditorSession,
} from "../domain";
import { WpsWebOfficeAdapter } from "../infrastructure";

export interface WpsWebOfficeEditorHandle {
  locate(anchor: ContractDocumentAnchor): Promise<void>;
  applyRevision(revision: ContractDocumentRevision): Promise<void>;
  save(): Promise<void>;
}

export interface WpsWebOfficeEditorProps {
  readonly session: WpsContractEditorSession;
  readonly activeAnchor?: ContractDocumentAnchor;
  readonly onReadyChange?: (ready: boolean) => void;
  readonly onError?: (message: string) => void;
}

export const WpsWebOfficeEditor = forwardRef<
  WpsWebOfficeEditorHandle,
  WpsWebOfficeEditorProps
>(function WpsWebOfficeEditor(
  { session, activeAnchor, onReadyChange, onError },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<WpsWebOfficeAdapter | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let active = true;
    const adapter = new WpsWebOfficeAdapter();
    adapterRef.current = adapter;
    setState("loading");
    setErrorMessage(null);
    onReadyChange?.(false);

    void adapter.mount(mount, session).then(() => {
      if (!active) {
        adapter.destroy();
        return;
      }
      setState("ready");
      onReadyChange?.(true);
    }).catch((error: unknown) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "WPS WebOffice 初始化失败";
      setState("error");
      setErrorMessage(message);
      onError?.(message);
    });

    return () => {
      active = false;
      adapter.destroy();
      adapterRef.current = null;
      mount.replaceChildren();
      onReadyChange?.(false);
    };
  }, [attempt, onError, onReadyChange, session]);

  useEffect(() => {
    if (state !== "ready" || !activeAnchor) return;
    void adapterRef.current?.locate(activeAnchor).catch((error: unknown) => {
      onError?.(error instanceof Error ? error.message : "WPS 原文定位失败");
    });
  }, [activeAnchor, onError, state]);

  useImperativeHandle(ref, () => ({
    async locate(anchor) {
      if (!adapterRef.current || state !== "ready") {
        throw new Error("WPS WebOffice 尚未准备完成");
      }
      await adapterRef.current.locate(anchor);
    },
    async applyRevision(revision) {
      if (!adapterRef.current || state !== "ready") {
        throw new Error("WPS WebOffice 尚未准备完成");
      }
      await adapterRef.current.applyRevision(revision);
    },
    async save() {
      if (!adapterRef.current || state !== "ready") {
        throw new Error("WPS WebOffice 尚未准备完成");
      }
      await adapterRef.current.save();
    },
  }), [state]);

  return (
    <div className="wps-editor-shell" data-editor-state={state}>
      <div ref={mountRef} className="wps-editor-mount" />
      {state === "loading" ? (
        <div className="wps-editor-overlay" role="status">
          <LoaderCircle className="wps-editor-loader" size={26} />
          <strong>正在加载 WPS WebOffice</strong>
          <span>编辑器准备完成后将自动定位当前风险原文。</span>
        </div>
      ) : null}
      {state === "error" ? (
        <div className="wps-editor-overlay error" role="alert">
          <AlertTriangle size={25} />
          <strong>WPS WebOffice 加载失败</strong>
          <span>{errorMessage}</span>
          <button type="button" className="secondary" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCw size={13} /> 重试
          </button>
        </div>
      ) : null}
    </div>
  );
});
