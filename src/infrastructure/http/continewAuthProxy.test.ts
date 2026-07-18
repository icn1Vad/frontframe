import { describe, expect, it } from "vitest";
import {
  buildContinewProxyHeaders,
  resolveContinewProxyRoute,
} from "./continewAuthProxy";

describe("continewAuthProxy", () => {
  it("allows authentication and explicitly supported business routes", () => {
    expect(resolveContinewProxyRoute(["captcha", "image"], "GET"))
      .toBe("/captcha/image");
    expect(resolveContinewProxyRoute(["auth", "login"], "POST"))
      .toBe("/auth/login");
    expect(resolveContinewProxyRoute(["auth", "user", "info"], "GET"))
      .toBe("/auth/user/info");
    expect(resolveContinewProxyRoute(["business", "documents"], "POST"))
      .toBe("/business/documents");
    expect(resolveContinewProxyRoute(
      ["business", "chat", "conversations", "c1", "messages", "stream"],
      "POST",
    )).toBe("/business/chat/conversations/c1/messages/stream");
    expect(resolveContinewProxyRoute(["auth", "login"], "GET"))
      .toBeUndefined();
    expect(resolveContinewProxyRoute(["business", "unknown"], "POST"))
      .toBeUndefined();
    expect(resolveContinewProxyRoute(
      ["business", "chat", "conversations", "..", "messages"],
      "GET",
    )).toBeUndefined();
    expect(resolveContinewProxyRoute(
      ["business", "chat", "conversations", "c1", "messages"],
      "DELETE",
    )).toBeUndefined();
    expect(resolveContinewProxyRoute(["business", "review"], "POST"))
      .toBeUndefined();
  });

  it("forwards only protocol headers and strips browser identity context", () => {
    const headers = buildContinewProxyHeaders({
      accept: "application/json",
      "content-type": "application/json",
      authorization: "Bearer token",
      "idempotency-key": "idem-1",
      origin: "http://127.0.0.1:13001",
      host: "127.0.0.1:13001",
      cookie: "session=browser-value",
      "x-user-id": "forged-user",
    });

    expect(headers).toEqual({
      accept: "application/json",
      authorization: "Bearer token",
      "content-type": "application/json",
      "idempotency-key": "idem-1",
    });
  });

  it("normalizes repeated allowed headers to their first value", () => {
    const headers = buildContinewProxyHeaders({
      accept: ["application/json", "text/plain"],
      "content-type": ["application/json", "text/plain"],
    });

    expect(headers.accept).toBe("application/json");
    expect(headers["content-type"]).toBe("application/json");
  });
});
