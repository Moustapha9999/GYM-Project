import { AppIconName } from '@shared/components/app-icon/app-icon.types';

export type DialogVariant = 'default' | 'danger' | 'warning' | 'info' | 'success';

export interface DialogConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  icon?: AppIconName;
}

export interface DialogAlertOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: DialogVariant;
  icon?: AppIconName;
}

interface DialogBaseState {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant: DialogVariant;
  icon?: AppIconName;
}

export interface DialogConfirmState extends DialogBaseState {
  mode: 'confirm';
  resolve: (confirmed: boolean) => void;
}

export interface DialogAlertState extends DialogBaseState {
  mode: 'alert';
  resolve: () => void;
}

export type DialogState = DialogConfirmState | DialogAlertState;
