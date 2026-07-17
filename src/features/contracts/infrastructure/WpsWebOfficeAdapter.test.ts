import { describe, expect, it, vi } from "vitest";
import type { WpsContractEditorSession } from "../domain";
import { WpsWebOfficeAdapter, type WpsSdkLoader } from "./WpsWebOfficeAdapter";

function session(readonly: boolean): WpsContractEditorSession {
  return {
    provider: "wps",
    sdkUrl: "/vendor/web-office-sdk-solution.umd.js",
    appId: "test-app",
    fileId: "test-file",
    taskId: "contract_test",
    documentVersionId: "version_test",
    readonly,
    mode: "normal",
    token: { token: "short-lived-test-token", timeout: 600_000 },
  };
}

describe("WpsWebOfficeAdapter", () => {
  it("normalizes the SDK mode and leaves editable sessions unlocked", async () => {
    const setReadOnly = vi.fn();
    const destroy = vi.fn();
    const ready = vi.fn().mockResolvedValue(undefined);
    const init = vi.fn().mockReturnValue({
      Application: {
        ActiveDocument: {
          Find: { ClearHitHighlight: vi.fn(), Execute: vi.fn() },
          Range: vi.fn(),
          Content: { Text: "" },
          SetReadOnly: setReadOnly,
        },
      },
      ready,
      save: vi.fn(),
      destroy,
    });
    const loader = vi.fn().mockResolvedValue({
      OfficeType: { Writer: "writer" },
      init,
    }) as WpsSdkLoader;
    const adapter = new WpsWebOfficeAdapter(loader);

    await adapter.mount({} as HTMLElement, session(false));

    expect(init).toHaveBeenCalledWith(expect.objectContaining({
      mode: "nomal",
      appId: "test-app",
      fileId: "test-file",
      customArgs: expect.objectContaining({
        taskId: "contract_test",
        documentVersionId: "version_test",
      }),
    }));
    expect(ready).toHaveBeenCalledOnce();
    expect(setReadOnly).not.toHaveBeenCalled();
    adapter.destroy();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("applies the read-only API only when the server session is locked", async () => {
    const setReadOnly = vi.fn().mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue({
      OfficeType: { Writer: "writer" },
      init: vi.fn().mockReturnValue({
        Application: {
          ActiveDocument: {
            Find: { ClearHitHighlight: vi.fn(), Execute: vi.fn() },
            Range: vi.fn(),
            Content: { Text: "" },
            SetReadOnly: setReadOnly,
          },
        },
        ready: vi.fn().mockResolvedValue(undefined),
        save: vi.fn(),
        destroy: vi.fn(),
      }),
    }) as WpsSdkLoader;

    await new WpsWebOfficeAdapter(loader).mount({} as HTMLElement, session(true));

    expect(setReadOnly).toHaveBeenCalledWith({ Value: true });
  });
});
