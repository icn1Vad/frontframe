import { describe, expect, it } from "vitest";
import {
  buildContinewAuthHeaders,
  resolveContinewAuthRoute,
} from "./continewAuthProxy";

describe("continewAuthProxy", () => {
  it("allows only the captcha and account login routes", () => {
    expect(resolveContinewAuthRoute(["captcha", "image"], "GET"))
      .toBe("/captcha/image");
    expect(resolveContinewAuthRoute(["auth", "login"], "POST"))
      .toBe("/auth/login");
    expect(resolveContinewAuthRoute(["auth", "login"], "GET"))
      .toBeUndefined();
    expect(resolveContinewAuthRoute(["business", "review"], "POST"))
      .toBeUndefined();
  });

  it("does not forward browser origin, host, cookies or identity headers", () => {
    const headers = buildContinewAuthHeaders({
      accept: "application/json",
      "content-type": "application/json",
      origin: "http://127.0.0.1:13001",
      host: "127.0.0.1:13001",
      cookie: "session=browser-value",
      "x-user-id": "forged-user",
    });

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.has("Origin")).toBe(false);
    expect(headers.has("Host")).toBe(false);
    expect(headers.has("Cookie")).toBe(false);
    expect(headers.has("X-User-Id")).toBe(false);
  });

  it("normalizes repeated allowed headers to their first value", () => {
    const headers = buildContinewAuthHeaders({
      accept: ["application/json", "text/plain"],
      "content-type": ["application/json", "text/plain"],
    });

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});
