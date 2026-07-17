import type {
  ContractDocumentAnchor,
  ContractDocumentRevision,
  WpsContractEditorSession,
  WpsEditorErrorCode,
  WpsEditorEvent,
  WpsSaveResult,
  WpsSaveStatus,
  WpsTokenData,
} from "../domain";

interface WpsRange {
  Text: string | Promise<string>;
  HighlightColorIndexTemp?: number;
}

interface WpsFind {
  ClearHitHighlight(): Promise<unknown>;
  Execute(text: string, showHighlight?: boolean): Promise<unknown>;
}

interface WpsDocument {
  Content: WpsRange | Promise<WpsRange>;
  Find: WpsFind;
  TrackRevisions?: boolean;
  Range(start: number, end: number): WpsRange | Promise<WpsRange>;
  SetReadOnly?(readonly: boolean): Promise<unknown>;
}

interface WpsApplication {
  ActiveDocument: WpsDocument;
}

interface WpsApiEvent {
  AddApiEventListener(name: string, listener: (data: unknown) => void): void;
  RemoveApiEventListener?(name: string, listener: (data: unknown) => void): void;
}

interface WpsWebOfficeInstance {
  readonly Application: WpsApplication;
  readonly ApiEvent?: WpsApiEvent;
  ready(): Promise<void>;
  save(): Promise<unknown>;
  destroy(): void;
}

export interface WpsWebOfficeSdk {
  readonly OfficeType: { readonly Writer: string };
  init(options: Readonly<Record<string, unknown>>): WpsWebOfficeInstance;
}

export type WpsSdkLoader = (url: string) => Promise<WpsWebOfficeSdk>;
export type WpsEditorEventListener = (event: WpsEditorEvent) => void;

declare global {
  interface Window {
    WebOfficeSDK?: WpsWebOfficeSdk;
  }
}

const sdkLoadPromises = new Map<string, Promise<WpsWebOfficeSdk>>();

function validateSdkUrl(url: string): void {
  const parsed = new URL(url, window.location.origin);
  const localDevelopment = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localDevelopment) {
    throw new WpsEditorError(
      "sdk-load-failed",
      "WPS SDK 必须通过 HTTPS 加载",
    );
  }
}

function loadWpsWebOfficeSdk(url: string): Promise<WpsWebOfficeSdk> {
  validateSdkUrl(url);
  if (window.WebOfficeSDK) return Promise.resolve(window.WebOfficeSDK);
  const existing = sdkLoadPromises.get(url);
  if (existing) return existing;

  const promise = new Promise<WpsWebOfficeSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.proofspaceWpsSdk = "true";
    script.onload = () => {
      if (window.WebOfficeSDK) resolve(window.WebOfficeSDK);
      else reject(new WpsEditorError("sdk-load-failed", "WPS SDK 已加载，但未暴露可用实例"));
    };
    script.onerror = () => reject(
      new WpsEditorError("sdk-load-failed", "WPS SDK 加载失败，请检查 SDK 地址和网络"),
    );
    document.head.appendChild(script);
  });

  sdkLoadPromises.set(url, promise);
  promise.catch(() => sdkLoadPromises.delete(url));
  return promise;
}

async function refreshWpsToken(url: string): Promise<WpsTokenData> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new WpsEditorError(
      response.status === 401 ? "token-expired" : "file-open-failed",
      `WPS 短期授权刷新失败（HTTP ${response.status}）`,
    );
  }
  const token = await response.json() as Partial<WpsTokenData>;
  if (!token.token || !Number.isFinite(token.timeout) || Number(token.timeout) <= 0) {
    throw new WpsEditorError("token-expired", "WPS 短期授权刷新响应格式无效");
  }
  return { token: token.token, timeout: token.timeout! };
}

function findOccurrence(text: string, query: string, occurrence: number): number {
  let offset = -1;
  let fromIndex = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    offset = text.indexOf(query, fromIndex);
    if (offset < 0) return -1;
    fromIndex = offset + query.length;
  }
  return offset;
}

function errorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.message, record.msg, record.reason, record.result]
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }
  return String(value ?? "");
}

function classifyEditorError(value: unknown, fallback: WpsEditorErrorCode): WpsEditorErrorCode {
  const message = errorText(value).toLowerCase();
  if (/401|token|expired|过期|失效/.test(message)) return "token-expired";
  if (/403|permission|forbidden|无权限|权限不足/.test(message)) return "permission-denied";
  if (/404|not found|不存在/.test(message)) return "file-not-found";
  if (/413|too large|超限|过大/.test(message)) return "file-too-large";
  return fallback;
}

function validWpsEndpoint(value: string | undefined): string | undefined {
  const endpoint = value?.trim();
  return endpoint && /^https?:\/\//i.test(endpoint) ? endpoint : undefined;
}

function parseSaveResult(value: unknown): WpsSaveResult {
  if (!value || typeof value !== "object") return { status: "fail" };
  const candidate = value as Record<string, unknown>;
  const supported = new Set<WpsSaveStatus>([
    "ok",
    "nochange",
    "SavedEmptyFile",
    "SpaceFull",
    "QueneFull",
    "fail",
  ]);
  const status = typeof candidate.result === "string" &&
    supported.has(candidate.result as WpsSaveStatus)
    ? candidate.result as WpsSaveStatus
    : "fail";
  return {
    status,
    ...(typeof candidate.size === "number" ? { size: candidate.size } : {}),
    ...(typeof candidate.version === "number" ? { version: candidate.version } : {}),
  };
}

function saveError(result: WpsSaveResult): WpsEditorError {
  if (result.status === "SpaceFull") {
    return new WpsEditorError("storage-full", "WPS 存储空间已满，文档未保存");
  }
  if (result.status === "QueneFull") {
    return new WpsEditorError("save-busy", "WPS 正在处理其他保存请求，请稍后重试");
  }
  if (result.status === "SavedEmptyFile") {
    return new WpsEditorError("empty-file", "WPS 不支持保存空文件");
  }
  return new WpsEditorError("save-failed", "WPS 文档保存失败");
}

export class WpsEditorError extends Error {
  constructor(
    readonly code: WpsEditorErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WpsEditorError";
  }
}

export class WpsWebOfficeAdapter {
  private instance: WpsWebOfficeInstance | null = null;
  private application: WpsApplication | null = null;
  private documentVersionId: string | null = null;
  private readonly listeners = new Set<WpsEditorEventListener>();
  private readonly eventCleanups: Array<() => void> = [];

  constructor(private readonly sdkLoader: WpsSdkLoader = loadWpsWebOfficeSdk) {}

  onEvent(listener: WpsEditorEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async mount(
    container: HTMLElement,
    session: WpsContractEditorSession,
  ): Promise<void> {
    this.destroy();
    try {
      const sdk = await this.sdkLoader(session.sdkUrl);
      const refreshToken = session.refreshTokenUrl
        ? () => refreshWpsToken(session.refreshTokenUrl!)
        : undefined;
      const endpoint = validWpsEndpoint(session.endpoint);
      const instance = sdk.init({
        officeType: sdk.OfficeType.Writer,
        appId: session.appId,
        fileId: session.fileId,
        mount: container,
        token: session.token,
        refreshToken,
        ...(endpoint ? { endpoint } : {}),
        customArgs: {
          ...session.customArgs,
          taskId: session.taskId,
          documentVersionId: session.documentVersionId,
        },
        mode: session.mode ?? "normal",
        isListenResize: true,
        commonOptions: {
          isShowHeader: false,
          isBrowserViewFullscreen: false,
          isIframeViewFullscreen: false,
        },
        wpsOptions: {
          isShowDocMap: false,
          isBestScale: true,
          isShowBottomStatusBar: true,
        },
      });

      this.instance = instance;
      let rejectFileOpen: ((error: WpsEditorError) => void) | undefined;
      const fileOpenFailure = new Promise<never>((_, reject) => {
        rejectFileOpen = reject;
      });
      this.registerEvent(instance, "fileOpen", (data) => {
        const success = data && typeof data === "object"
          ? (data as Record<string, unknown>).success
          : undefined;
        if (success === false) {
          const code = classifyEditorError(data, "file-open-failed");
          this.emit({ type: "editor-error", code, message: this.messageFor(code) });
          rejectFileOpen?.(new WpsEditorError(code, this.messageFor(code)));
          return;
        }
        this.emit({
          type: "file-opened",
          fileId: session.fileId,
          documentVersionId: session.documentVersionId,
        });
      });
      this.registerEvent(instance, "error", (data) => {
        const code = classifyEditorError(data, "file-open-failed");
        this.emit({ type: "editor-error", code, message: this.messageFor(code) });
        rejectFileOpen?.(new WpsEditorError(code, this.messageFor(code)));
      });
      this.registerEvent(instance, "WindowSelectionChange", (data) => {
        const record = data && typeof data === "object"
          ? data as Record<string, unknown>
          : {};
        this.emit({
          type: "selection-changed",
          ...(typeof record.begin === "number" ? { begin: record.begin } : {}),
          ...(typeof record.end === "number" ? { end: record.end } : {}),
        });
      });

      await Promise.race([instance.ready(), fileOpenFailure]);
      this.application = instance.Application;
      this.documentVersionId = session.documentVersionId;
      if (this.application.ActiveDocument.SetReadOnly) {
        await this.application.ActiveDocument.SetReadOnly(session.readonly);
      }
    } catch (error) {
      const normalized = error instanceof WpsEditorError
        ? error
        : new WpsEditorError(
          classifyEditorError(error, "file-open-failed"),
          this.messageFor(classifyEditorError(error, "file-open-failed")),
          { cause: error },
        );
      this.destroy();
      throw normalized;
    }
  }

  async locate(anchor: ContractDocumentAnchor): Promise<void> {
    this.assertAnchorVersion(anchor);
    const document = this.getDocument();
    await document.Find.ClearHitHighlight();
    await document.Find.Execute(anchor.quotedText, true);

    if (anchor.startOffset !== undefined && anchor.endOffset !== undefined) {
      const range = await document.Range(anchor.startOffset, anchor.endOffset);
      range.HighlightColorIndexTemp = 7;
    }
  }

  async applyRevision(revision: ContractDocumentRevision): Promise<void> {
    this.assertAnchorVersion(revision.anchor);
    const document = this.getDocument();
    const range = await this.resolveRange(revision.anchor);
    const currentText = String(await range.Text);
    const expectedText = revision.expectedText ?? revision.anchor.quotedText;
    if (expectedText && currentText !== expectedText) {
      throw new WpsEditorError(
        "source-changed",
        "原文已发生变化，已阻止覆盖；请重新审查或重新定位",
      );
    }
    document.TrackRevisions = true;
    range.Text = revision.replacementText;
  }

  async save(): Promise<WpsSaveResult> {
    if (!this.instance) {
      throw new WpsEditorError("not-ready", "WPS 编辑器尚未初始化");
    }
    try {
      const result = parseSaveResult(await this.instance.save());
      if (result.status !== "ok" && result.status !== "nochange") {
        throw saveError(result);
      }
      this.emit({ type: "save-succeeded", result });
      return result;
    } catch (error) {
      const normalized = error instanceof WpsEditorError
        ? error
        : new WpsEditorError("save-failed", "WPS 文档保存失败", { cause: error });
      this.emit({
        type: "save-failed",
        code: normalized.code,
        message: normalized.message,
      });
      throw normalized;
    }
  }

  destroy(): void {
    while (this.eventCleanups.length > 0) this.eventCleanups.pop()?.();
    this.instance?.destroy();
    this.instance = null;
    this.application = null;
    this.documentVersionId = null;
  }

  private registerEvent(
    instance: WpsWebOfficeInstance,
    name: string,
    listener: (data: unknown) => void,
  ): void {
    if (!instance.ApiEvent) return;
    instance.ApiEvent.AddApiEventListener(name, listener);
    this.eventCleanups.push(() => {
      instance.ApiEvent?.RemoveApiEventListener?.(name, listener);
    });
  }

  private emit(event: WpsEditorEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  private getDocument(): WpsDocument {
    if (!this.application) {
      throw new WpsEditorError("not-ready", "WPS 编辑器尚未准备完成");
    }
    return this.application.ActiveDocument;
  }

  private assertAnchorVersion(anchor: ContractDocumentAnchor): void {
    if (!this.documentVersionId) {
      throw new WpsEditorError("not-ready", "WPS 编辑器尚未准备完成");
    }
    if (anchor.documentVersionId !== this.documentVersionId) {
      throw new WpsEditorError(
        "source-changed",
        "风险定位属于其他文档版本，已阻止定位或修改",
      );
    }
  }

  private async resolveRange(anchor: ContractDocumentAnchor): Promise<WpsRange> {
    const document = this.getDocument();
    if (anchor.startOffset !== undefined && anchor.endOffset !== undefined) {
      return document.Range(anchor.startOffset, anchor.endOffset);
    }

    const content = await document.Content;
    const documentText = String(await content.Text);
    const start = findOccurrence(
      documentText,
      anchor.quotedText,
      anchor.occurrence ?? 0,
    );
    if (start < 0) {
      throw new WpsEditorError("anchor-not-found", "当前文档版本中未找到风险对应原文");
    }
    return document.Range(start, start + anchor.quotedText.length);
  }

  private messageFor(code: WpsEditorErrorCode): string {
    const messages: Record<WpsEditorErrorCode, string> = {
      "sdk-load-failed": "WPS SDK 加载失败",
      "file-open-failed": "WPS 文件打开失败",
      "file-not-found": "合同文件不存在或已被移除",
      "token-expired": "WPS 编辑授权已过期，请刷新后重试",
      "permission-denied": "当前用户没有合同编辑权限",
      "file-too-large": "合同文件超过 WPS 允许的大小",
      "save-failed": "WPS 文档保存失败",
      "storage-full": "WPS 存储空间已满",
      "save-busy": "WPS 保存队列繁忙",
      "empty-file": "WPS 不支持保存空文件",
      "not-ready": "WPS 编辑器尚未准备完成",
      "source-changed": "合同原文已发生变化",
      "anchor-not-found": "未找到风险对应原文",
    };
    return messages[code];
  }
}
