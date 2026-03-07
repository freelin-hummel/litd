import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';

interface AppAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  cancelLabel?: string;
  onAction: () => void;
  tone?: 'default' | 'danger';
}

export function AppAlertDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  cancelLabel = 'Cancel',
  onAction,
  tone = 'default',
}: AppAlertDialogProps) {
  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="ui-alert-overlay" />
        <RadixAlertDialog.Content className="ui-alert-content">
          <RadixAlertDialog.Title className="ui-alert-title">{title}</RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="ui-alert-description">
            {description}
          </RadixAlertDialog.Description>
          <div className="ui-alert-actions">
            <RadixAlertDialog.Cancel className="ui-button ui-button--outline ui-button--sm">
              {cancelLabel}
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action
              className={`ui-button ui-button--${tone === 'danger' ? 'danger' : 'solid'} ui-button--sm`}
              onClick={onAction}
            >
              {actionLabel}
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
