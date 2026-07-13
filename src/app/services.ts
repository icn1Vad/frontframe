import type { DocumentRepository } from "../features/documents/application";
import { mockDocumentRepository } from "../features/documents/infrastructure";

export interface AppServices {
  readonly documents: DocumentRepository;
}

/** Application composition root. Swap adapters here, not inside pages or UI. */
export const appServices: AppServices = Object.freeze({
  documents: mockDocumentRepository,
});

