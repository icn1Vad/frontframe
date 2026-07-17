import { describe, expect, it } from "vitest";

import { HttpApiError } from "../infrastructure/http/errors";
import { redirectToLoginOnUnauthorized } from "./ssr-auth";

function apiError(status: number): HttpApiError {
  return new HttpApiError({
    title: "Request failed",
    status,
    code: `HTTP_${status}`,
  });
}

describe("redirectToLoginOnUnauthorized", () => {
  it("redirects an HTTP 401 response to the login panel", () => {
    expect(redirectToLoginOnUnauthorized(apiError(401))).toEqual({
      redirect: {
        destination: "/?auth=login#experience",
        permanent: false,
      },
    });
  });

  it("rethrows other HTTP failures unchanged", () => {
    const error = apiError(403);
    let thrown: unknown;

    try {
      redirectToLoginOnUnauthorized(error);
    } catch (caught) {
      thrown = caught;
    }

    expect(thrown).toBe(error);
  });

  it("rethrows non-HTTP errors unchanged", () => {
    const error = new Error("network unavailable");
    let thrown: unknown;

    try {
      redirectToLoginOnUnauthorized(error);
    } catch (caught) {
      thrown = caught;
    }

    expect(thrown).toBe(error);
  });
});
