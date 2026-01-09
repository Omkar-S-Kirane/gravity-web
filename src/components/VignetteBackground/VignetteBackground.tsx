import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren;

export function VignetteBackground({ children }: Props) {
  return (
    <div className="relative min-h-[100svh] overflow-x-hidden bg-[#07080A]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.055)_0%,rgba(11,12,15,0)_52%,rgba(0,0,0,0.85)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-40%] right-[-40%] top-[-12%] h-[860px] rounded-[999px] bg-white/10 opacity-[0.06]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[10%] right-[10%] top-[30%] h-[640px] rounded-[999px] bg-white/10 opacity-[0.05]"
      />
      {children}
    </div>
  );
}
