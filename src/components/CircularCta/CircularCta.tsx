import type { ReactNode } from 'react';

type Props = Readonly<{
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: ReactNode;
  size?: number | string;
}>;

export function CircularCta({ onPress, disabled = false, busy = false, label, size = 'clamp(208px, 62vw, 248px)' }: Props) {
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
          'absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.012)_58%,rgba(255,255,255,0)_100%)] ' +
          (busy ? 'animate-pulse opacity-45' : 'opacity-20')
        }
      />
      <div aria-hidden className="absolute inset-0 rounded-full border border-white/20" />
      <div aria-hidden className="absolute inset-[6px] rounded-full border border-white/10" />
      <div aria-hidden className="absolute inset-[18%] rounded-full bg-white/[0.008]" />

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
