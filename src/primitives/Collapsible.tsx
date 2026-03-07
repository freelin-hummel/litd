import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { forwardRef } from 'react';
import type * as React from 'react';
import { cx } from './cx';

type CollapsibleTriggerProps = React.ComponentPropsWithoutRef<typeof RadixCollapsible.Trigger>;
type CollapsibleContentProps = React.ComponentPropsWithoutRef<typeof RadixCollapsible.Content>;

export const Collapsible = RadixCollapsible.Root;

export const CollapsibleTrigger = forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  function CollapsibleTrigger({ className, ...props }, ref) {
    return (
      <RadixCollapsible.Trigger
        ref={ref}
        className={cx('ui-collapsible-trigger', className)}
        {...props}
      />
    );
  },
);

export const CollapsibleContent = forwardRef<HTMLDivElement, CollapsibleContentProps>(
  function CollapsibleContent({ className, ...props }, ref) {
    return (
      <RadixCollapsible.Content
        ref={ref}
        className={cx('ui-collapsible-content', className)}
        {...props}
      />
    );
  },
);
