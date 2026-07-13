import type { ComponentProps } from "react";
import type Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { IconButton, IconLink } from "@/shared/ui";
import type { DocumentId, DocumentSummary } from "../domain";

export type DocumentDialogKind = "preview" | "delete" | "progress";

export type DocumentDialogState =
  | {
      readonly kind: DocumentDialogKind;
      readonly documentId: DocumentId;
    }
  | null;

export type DocumentCommand = "publish" | "startReview";

export type DocumentCommandHandler = (
  documentId: DocumentId,
) => void | Promise<void>;

export interface DocumentCommandHandlers {
  readonly publish?: DocumentCommandHandler;
  readonly startReview?: DocumentCommandHandler;
}

interface ActionBase {
  readonly id: string;
  readonly label: string | ((document: DocumentSummary) => string);
  readonly icon: LucideIcon;
  readonly danger?: boolean;
  readonly isVisible?: (document: DocumentSummary) => boolean;
}

export type DocumentActionDefinition =
  | (ActionBase & {
      readonly type: "dialog";
      readonly dialog: DocumentDialogKind;
    })
  | (ActionBase & {
      readonly type: "command";
      readonly command: DocumentCommand;
    })
  | (ActionBase & {
      readonly type: "link";
      readonly href: (
        document: DocumentSummary,
      ) => ComponentProps<typeof Link>["href"];
    });

export interface DocumentActionCellProps {
  document: DocumentSummary;
  actions: readonly DocumentActionDefinition[];
  commands?: DocumentCommandHandlers;
  openDialog: (state: Exclude<DocumentDialogState, null>) => void;
}

function getLabel(
  action: DocumentActionDefinition,
  document: DocumentSummary,
): string {
  return typeof action.label === "function"
    ? action.label(document)
    : action.label;
}

export function DocumentActionCell({
  document,
  actions,
  commands = {},
  openDialog,
}: DocumentActionCellProps) {
  return (
    <span className="actions">
      {actions.map((action) => {
        if (action.isVisible && !action.isVisible(document)) return null;

        const label = getLabel(action, document);
        const ActionIcon = action.icon;

        if (action.type === "link") {
          return (
            <IconLink
              href={action.href(document)}
              label={label}
              danger={action.danger}
              key={action.id}
            >
              <ActionIcon />
            </IconLink>
          );
        }

        if (action.type === "dialog") {
          return (
            <IconButton
              label={label}
              danger={action.danger}
              onClick={() =>
                openDialog({
                  kind: action.dialog,
                  documentId: document.id,
                })
              }
              key={action.id}
            >
              <ActionIcon />
            </IconButton>
          );
        }

        const handler = commands[action.command];
        return (
          <IconButton
            label={label}
            danger={action.danger}
            disabled={!handler}
            onClick={() => handler?.(document.id)}
            key={action.id}
          >
            <ActionIcon />
          </IconButton>
        );
      })}
    </span>
  );
}
