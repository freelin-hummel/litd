import * as RadixToggleGroup from '@radix-ui/react-toggle-group';
import { forwardRef } from 'react';
import type * as React from 'react';
import { cx } from './cx';

type ToggleGroupRootProps = React.ComponentPropsWithoutRef<typeof RadixToggleGroup.Root>;
type ToggleGroupItemProps = React.ComponentPropsWithoutRef<typeof RadixToggleGroup.Item>;

export function ToggleGroup({ className, ...props }: ToggleGroupRootProps) {
  return <RadixToggleGroup.Root className={cx('ui-toggle-group', className)} {...props} />;
}

export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  function ToggleGroupItem({ className, ...props }, ref) {
    return <RadixToggleGroup.Item ref={ref} className={cx('ui-toggle-item', className)} {...props} />;
  },
);
