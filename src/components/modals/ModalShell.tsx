import type { PropsWithChildren, ReactNode } from 'react';

type Props = PropsWithChildren<
  Readonly<{
    open: boolean;
    title?: ReactNode;
    subtitle?: ReactNode;
    onClose: () => void;
  }>
>;

export function ModalShell({ open, title, subtitle, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-[560px] rounded-2xl border border-border bg-[rgba(10,10,12,0.94)] p-4">
        {title ? <div className="text-[16px] font-medium text-textPrimary">{title}</div> : null}
        {subtitle ? <div className="mt-1.5 text-[12px] text-textSecondary">{subtitle}</div> : null}
        {children}
      </div>
    </div>
  );
}
