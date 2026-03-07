import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { forwardRef } from 'react';
import type * as React from 'react';
import { cx } from './cx';

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Content>;
type DropdownMenuItemProps = React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Item> & {
  danger?: boolean;
};
type DropdownMenuRadioItemProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.RadioItem
> & {
  danger?: boolean;
};

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;
export const DropdownMenuRadioGroup = RadixDropdownMenu.RadioGroup;

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  function DropdownMenuContent({ className, sideOffset = 8, ...props }, ref) {
    return (
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cx('ui-dropdown-content', className)}
          {...props}
        />
      </RadixDropdownMenu.Portal>
    );
  },
);

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ className, danger = false, ...props }, ref) {
    return (
      <RadixDropdownMenu.Item
        ref={ref}
        className={cx('ui-dropdown-item', danger && 'ui-dropdown-item--danger', className)}
        {...props}
      />
    );
  },
);

export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  function DropdownMenuRadioItem({ className, danger = false, children, ...props }, ref) {
    return (
      <RadixDropdownMenu.RadioItem
        ref={ref}
        className={cx('ui-dropdown-item', danger && 'ui-dropdown-item--danger', className)}
        {...props}
      >
        <span className="ui-dropdown-item-indicator" aria-hidden="true">
          <RadixDropdownMenu.ItemIndicator>
            <Check size={14} />
          </RadixDropdownMenu.ItemIndicator>
        </span>
        <span>{children}</span>
      </RadixDropdownMenu.RadioItem>
    );
  },
);

export function DropdownMenuSeparator() {
  return <RadixDropdownMenu.Separator className="ui-dropdown-separator" />;
}
