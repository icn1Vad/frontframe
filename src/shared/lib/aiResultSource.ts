export const aiResultSources = ["STUB", "AI"] as const;

export type AiResultSource = (typeof aiResultSources)[number];
