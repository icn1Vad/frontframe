export const MIN_CONTRACT_EDITOR_PERCENT = 60;
export const MAX_CONTRACT_EDITOR_PERCENT = 80;
export const DEFAULT_CONTRACT_EDITOR_PERCENT = 64;

export function normalizeContractEditorPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CONTRACT_EDITOR_PERCENT;
  return Math.min(
    MAX_CONTRACT_EDITOR_PERCENT,
    Math.max(MIN_CONTRACT_EDITOR_PERCENT, Math.round(value)),
  );
}
