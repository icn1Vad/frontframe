import type { ComponentProps } from "react";
import type Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ActionMenu,
  IconButton,
  IconLink,
  type ActionMenuItem,
} from "@/shared/ui";
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
  readonly isPrimary?: (document: DocumentSummary) => boolean;
  readonly variant?: "primary" | "secondary";
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
  availableDialogs?: Partial<Record<DocumentDialogKind, boolean>>;
  pendingCommand?: {
    readonly documentId: DocumentId;
    readonly command: DocumentCommand;
  } | null;
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
  availableDialogs = {},
  pendingCommand = null,
  openDialog,
}: DocumentActionCellProps) {
  const visibleActions = actions.filter((action) => {
    if (action.isVisible && !action.isVisible(document)) return false;
    if (action.type === "dialog") {
      return availableDialogs[action.dialog] ?? true;
    }
    if (action.type === "command") {
      return Boolean(commands[action.command]);
    }
    return true;
  });
  const primaryActions = visibleActions.filter((action) =>
    action.isPrimary?.(document),
  );
  const secondaryActions = visibleActions.filter((action) =>
    !action.isPrimary?.(document),
  );

  const renderPrimaryAction = (action: DocumentActionDefinition) => {
    const label = getLabel(action, document);
    const ActionIcon = action.icon;
    const className = `row-primary-action ${action.variant ?? "secondary"}`;

    if (action.type === "link") {
      return (
        <IconLink
          href={action.href(document)}
          label={label}
          visibleLabel={label}
          className={className}
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
          visibleLabel={label}
          className={className}
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
    const pending =
      pendingCommand?.documentId === document.id &&
      pendingCommand.command === action.command;
    return (
      <IconButton
        label={pending ? `${label}中` : label}
        visibleLabel={pending ? `${label}中` : label}
        className={className}
        danger={action.danger}
        disabled={Boolean(pendingCommand)}
        aria-busy={pending}
        onClick={() => handler?.(document.id)}
        key={action.id}
      >
        {pending ? <span className="button-spinner" aria-hidden="true" /> : <ActionIcon />}
      </IconButton>
    );
  };

  const menuItems = secondaryActions.map<ActionMenuItem>((action) => {
    const label = getLabel(action, document);
    if (action.type === "link") {
      return {
        id: action.id,
        label,
        icon: action.icon,
        href: action.href(document),
        danger: action.danger,
      };
    }
    if (action.type === "dialog") {
      return {
        id: action.id,
        label,
        icon: action.icon,
        danger: action.danger,
        onSelect: () =>
          openDialog({
            kind: action.dialog,
            documentId: document.id,
          }),
      };
    }
    const pending =
      pendingCommand?.documentId === document.id &&
      pendingCommand.command === action.command;
    return {
      id: action.id,
      label,
      icon: action.icon,
      danger: action.danger,
      disabled: Boolean(pendingCommand),
      busy: pending,
      onSelect: () => commands[action.command]?.(document.id),
    };
  });

  return (
    <span className="actions touch-actions">
      {primaryActions.map(renderPrimaryAction)}
      <ActionMenu label={`${document.name}的更多操作`} items={menuItems} />
    </span>
  );
}
