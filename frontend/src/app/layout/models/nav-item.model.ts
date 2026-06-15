import { AppIconName } from '@shared/components/app-icon/app-icon.types';

export interface NavItem {
  label: string;
  route: string;
  icon: AppIconName;
  permissions?: string[];
}
