import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'ghost' | 'outline' | 'solid' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'ghost', size = 'md', iconOnly = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        iconOnly && 'ui-button--icon-only',
        className,
      )}
      {...props}
    />
  );
});

interface IconButtonProps extends Omit<ButtonProps, 'iconOnly'> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, title, ...props },
  ref,
) {
  return <Button ref={ref} {...props} iconOnly aria-label={label} title={title ?? label} />;
});
