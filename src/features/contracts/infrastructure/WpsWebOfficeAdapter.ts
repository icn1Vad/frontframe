import type {
  ContractDocumentAnchor,
  ContractDocumentRevision,
  WpsContractEditorSession,
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
}

interface WpsApplication {
  ActiveDocument: WpsDocument;
}

interface WpsWebOfficeInstance {
  readonly Application: WpsApplication;
  ready(): Promise<void>;
  save(): Promise<unknown>;
  destroy(): void;
}

interface WpsWebOfficeSdk {
  readonly OfficeType: { readonly Writer: string };
  init(options: Readonly<Record<string, unknown>>): WpsWebOfficeInstance;
}

declare global {
  interface Window {
    WebOfficeSDK?: WpsWebOfficeSdk;
  }
}

const sdkLoadPromises = new Map<string, Promise<WpsWebOfficeSdk>>();

function loadWpsWebOfficeSdk(url: string): Promise<WpsWebOfficeSdk> {
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
      else reject(new Error("WPS WebOffice SDK 已加载，但未找到 WebOfficeSDK 全局对象"));
    };
    script.onerror = () => reject(new Error("WPS WebOffice SDK 加载失败"));
    document.head.appendChild(script);
  });

  sdkLoadPromises.set(url, promise);
  promise.catch(() => sdkLoadPromises.delete(url));
  return promise;
}

async function refreshWpsToken(url: string): Promise<WpsTokenData> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`WPS token 刷新失败：${response.status}`);
  const token = await response.json() as Partial<WpsTokenData>;
  if (!token.token || !Number.isFinite(token.timeout)) {
    throw new Error("WPS token 刷新接口返回格式无效");
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

export class WpsWebOfficeAdapter {
  private instance: WpsWebOfficeInstance | null = null;
  private application: WpsApplication | null = null;

  async mount(
    container: HTMLElement,
    session: WpsContractEditorSession,
  ): Promise<void> {
    const sdk = await loadWpsWebOfficeSdk(session.sdkUrl);
    const refreshToken = session.refreshTokenUrl
      ? () => refreshWpsToken(session.refreshTokenUrl!)
      : undefined;
    const instance = sdk.init({
      officeType: sdk.OfficeType.Writer,
      appId: session.appId,
      fileId: session.fileId,
      mount: container,
      token: session.token,
      refreshToken,
      endpoint: session.endpoint,
      customArgs: session.customArgs,
      mode: session.mode ?? "normal",
      isListenResize: true,
      commonOptions: {
        isShowHeader: false,
        isBrowserViewFullscreen: false,
        isIframeViewFullscreen: false,
      },
      wordOptions: {
        isShowDocMap: false,
        isBestScale: true,
        isShowBottomStatusBar: true,
      },
    });
    await instance.ready();
    this.instance = instance;
    this.application = instance.Application;
  }

  async locate(anchor: ContractDocumentAnchor): Promise<void> {
    const document = this.getDocument();
    await document.Find.ClearHitHighlight();
    await document.Find.Execute(anchor.quotedText, true);

    if (anchor.startOffset !== undefined && anchor.endOffset !== undefined) {
      const range = await document.Range(anchor.startOffset, anchor.endOffset);
      range.HighlightColorIndexTemp = 7;
    }
  }

  async applyRevision(revision: ContractDocumentRevision): Promise<void> {
    const document = this.getDocument();
    const range = await this.resolveRange(revision.anchor);
    const currentText = String(await range.Text);
    const expectedText = revision.expectedText ?? revision.anchor.quotedText;
    if (expectedText && currentText !== expectedText) {
      throw new Error("原文已发生变化，无法安全应用该修订，请重新生成风险定位");
    }
    document.TrackRevisions = true;
    range.Text = revision.replacementText;
  }

  async save(): Promise<void> {
    if (!this.instance) throw new Error("WPS WebOffice 尚未初始化");
    await this.instance.save();
  }

  destroy() {
    this.instance?.destroy();
    this.instance = null;
    this.application = null;
  }

  private getDocument(): WpsDocument {
    if (!this.application) throw new Error("WPS WebOffice 尚未准备完成");
    return this.application.ActiveDocument;
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
    if (start < 0) throw new Error("未在当前 Word 版本中找到风险对应原文");
    return document.Range(start, start + anchor.quotedText.length);
  }
}
