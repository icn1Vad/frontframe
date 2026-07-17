import { describe, expect, it, vi } from "vitest";
import type { WpsContractEditorSession } from "../domain";
import {
  WpsEditorError,
  WpsWebOfficeAdapter,
  type WpsWebOfficeSdk,
} from "./WpsWebOfficeAdapter";

const session: WpsContractEditorSession = {
  provider: "wps",
  sdkUrl: "/vendor/wps.umd.js",
  appId: "app-id",
  fileId: "file-id",
  contractId: "contract-id",
  taskId: "task-id",
  documentVersionId: "version-id",
  officeType: "writer",
  readonly: false,
  currentUser: { id: "user-id", name: "张三", permission: "write" },
  token: { token: "short-lived-token", timeout: 600_000 },
  expiresAt: "2026-07-17T08:00:00.000Z",
};

function createSdk(saveResult: unknown) {
  const handlers = new Map<string, (data: unknown) => void>();
  const destroy = vi.fn();
  const remove = vi.fn((name: string) => handlers.delete(name));
  const instance = {
    Application: {
      ActiveDocument: {
        Content: { Text: "合同原文" },
        Find: {
          ClearHitHighlight: vi.fn(async () => undefined),
          Execute: vi.fn(async () => undefined),
        },
        Range: vi.fn(() => ({ Text: "合同原文" })),
      },
    },
    ApiEvent: {
      AddApiEventListener: (name: string, listener: (data: unknown) => void) => {
        handlers.set(name, listener);
      },
      RemoveApiEventListener: remove,
    },
    ready: vi.fn(async () => undefined),
    save: vi.fn(async () => saveResult),
    destroy,
  };
  const sdk = {
    OfficeType: { Writer: "w" },
    init: vi.fn(() => instance),
  } as unknown as WpsWebOfficeSdk;
  return { sdk, handlers, destroy, remove };
}

describe("WpsWebOfficeAdapter", () => {
  it("forwards typed open, selection and save events and removes listeners", async () => {
    const fixture = createSdk({ result: "ok", size: 128, version: 2 });
    const adapter = new WpsWebOfficeAdapter(async () => fixture.sdk);
    const events: string[] = [];
    adapter.onEvent((event) => events.push(event.type));

    await adapter.mount({} as HTMLElement, session);
    fixture.handlers.get("fileOpen")?.({ success: true });
    fixture.handlers.get("WindowSelectionChange")?.({ begin: 1, end: 5 });
    await adapter.save();
    adapter.destroy();

    expect(events).toEqual(["file-opened", "selection-changed", "save-succeeded"]);
    expect(fixture.remove).toHaveBeenCalledTimes(3);
    expect(fixture.destroy).toHaveBeenCalledOnce();
  });

  it("maps WPS storage errors without leaking raw responses", async () => {
    const fixture = createSdk({ result: "SpaceFull" });
    const adapter = new WpsWebOfficeAdapter(async () => fixture.sdk);
    const events: string[] = [];
    adapter.onEvent((event) => events.push(event.type));
    await adapter.mount({} as HTMLElement, session);

    await expect(adapter.save()).rejects.toMatchObject({
      code: "storage-full",
      message: "WPS 存储空间已满，文档未保存",
    } satisfies Partial<WpsEditorError>);
    expect(events).toContain("save-failed");
  });

  it("blocks anchors from a different document version", async () => {
    const fixture = createSdk({ result: "nochange" });
    const adapter = new WpsWebOfficeAdapter(async () => fixture.sdk);
    await adapter.mount({} as HTMLElement, session);

    await expect(adapter.locate({
      documentId: "document-id",
      documentVersionId: "other-version-id",
      sourceVersion: 1,
      quotedText: "合同原文",
    })).rejects.toMatchObject({ code: "source-changed" });
  });
});
