type Props = Readonly<{
  fraction: number;
  height?: number;
}>;

export function ProgressBar({ fraction, height = 6 }: Props) {
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div className="w-full rounded-full bg-white/10" style={{ height }}>
      <div
        className="h-full rounded-full bg-accent/70 transition-[width] duration-150 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
