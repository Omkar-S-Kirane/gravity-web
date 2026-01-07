import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren;

export function VignetteBackground({ children }: Props) {
  return (
    <div className="relative min-h-screen bg-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-40%] right-[-40%] top-[-10%] h-[860px] rounded-[999px] bg-white/10 opacity-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-[8%] right-[8%] top-[28%] h-[640px] rounded-[999px] bg-white/10 opacity-[0.08]"
      />
      {children}
    </div>
  );
}
