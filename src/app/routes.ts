export type AppRoute = `/${string}`;

function routeSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} cannot be empty.`);
  }
  return encodeURIComponent(normalized);
}

export const routes = {
  home: "/" as const,
  login: "/login" as const,
  register: "/register" as const,
  dashboard: "/dashboard" as const,
  fileClassification: "/file-classification" as const,
  classificationTasks: "/classification-tasks" as const,
  reviewTasks: "/review-tasks" as const,
  knowledge: "/knowledge" as const,
  chat: "/chat" as const,
  reviewReport(taskId: string): AppRoute {
    return `/review-tasks/${routeSegment(taskId, "Review task id")}/report`;
  },
} as const;
