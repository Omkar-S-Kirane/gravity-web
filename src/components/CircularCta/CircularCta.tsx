import type { ReactNode } from 'react';

type Props = Readonly<{
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: ReactNode;
  size?: number;
}>;

export function CircularCta({ onPress, disabled = false, busy = false, label, size = 208 }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label="Download"
      className={
        'relative flex items-center justify-center rounded-full shadow-[0_14px_26px_rgba(0,0,0,0.65)] ' +
        'transition-transform duration-100 ease-out active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70'
      }
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden
        className={
          'absolute inset-0 rounded-full bg-white/[0.03] ' +
          (busy ? 'animate-pulse opacity-30' : 'opacity-20')
        }
      />
      <div aria-hidden className="absolute inset-0 rounded-full border-2 border-white/20" />
      <div aria-hidden className="absolute inset-[4%] rounded-full border border-white/10 bg-white/[0.015]" />
      <div aria-hidden className="absolute inset-[19%] rounded-full bg-white/10 opacity-[0.12]" />

      {label ? (
        <div
          className={
            'absolute max-w-[80%] truncate text-center font-medium tracking-[1px] ' +
            (busy ? 'text-[13px] text-white/90' : 'text-[12px] text-textSecondary')
          }
        >
          {label}
        </div>
      ) : null}
    </button>
  );
}
