import { HttpApiError } from "../infrastructure/http/errors";

export function redirectToLoginOnUnauthorized(error: unknown) {
  if (error instanceof HttpApiError && error.status === 401) {
    return {
      redirect: {
        destination: "/?auth=login#experience",
        permanent: false,
      },
    } as const;
  }

  throw error;
}
