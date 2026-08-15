import {
  TbAlertCircle,
  TbAlertTriangle,
  TbInfoCircle,
  TbPencil,
  TbPlus,
  TbTrash,
  TbUserCheck,
  TbUserX,
} from 'react-icons/tb';

import type { LogEventType } from '@/types/core/Log';

const iconClassNames = {
  default: 'size-5 shrink-0 text-foreground',
  destructive: 'size-5 shrink-0 text-destructive',
  info: 'size-5 shrink-0 text-muted-foreground',
  success: 'size-5 shrink-0 text-success',
  warning: 'size-5 shrink-0 text-warning',
} as const;

/** Component to display a semantic Tabler icon for a log event. */
const LogEventIcon = ({ type }: { type: LogEventType }) => {
  switch (type) {
    case 'CREATE':
      return <TbPlus aria-hidden='true' className={iconClassNames.success} />;
    case 'UPDATE':
      return <TbPencil aria-hidden='true' className={iconClassNames.default} />;
    case 'DELETE':
      return (
        <TbTrash aria-hidden='true' className={iconClassNames.destructive} />
      );
    case 'LOGIN':
      return (
        <TbUserCheck aria-hidden='true' className={iconClassNames.success} />
      );
    case 'LOGOUT':
      return <TbUserX aria-hidden='true' className={iconClassNames.info} />;
    case 'WARNING':
      return (
        <TbAlertTriangle
          aria-hidden='true'
          className={iconClassNames.warning}
        />
      );
    case 'ERROR':
      return (
        <TbAlertCircle
          aria-hidden='true'
          className={iconClassNames.destructive}
        />
      );
    case 'INFO':
      return (
        <TbInfoCircle aria-hidden='true' className={iconClassNames.info} />
      );
    default:
      return null;
  }
};

export default LogEventIcon;
