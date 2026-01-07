import { VignetteBackground } from '../../components/VignetteBackground/VignetteBackground';

export function HomePage() {
  return (
    <VignetteBackground>
      <div className="min-h-screen px-6 pb-11">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
          <header className="pt-16 text-center">
            <h1 className="text-[20px] font-light tracking-[6px] text-textPrimary/90">GRAVITY</h1>
            <p className="mt-2.5 text-[11px] font-light tracking-[5px] text-textSecondary/90">
              What You Love, Offline
            </p>
          </header>

          <main className="flex flex-1 items-center justify-center pb-3">
            <button
              type="button"
              className="h-[208px] w-[208px] rounded-full border border-white/20 bg-white/[0.015] shadow-[0_14px_26px_rgba(0,0,0,0.65)]"
            />
          </main>

          <footer className="pb-1 text-center">
            <button type="button" className="mt-4 text-[12px] font-light tracking-[5px] text-accent/90">
              OMKAR KIRANE
            </button>
            <p className="mt-1.5 text-[8px] tracking-[3px] text-textSecondary/70">
              © {new Date().getFullYear()} · All rights reserved
            </p>
          </footer>
        </div>

        <div className="mx-auto hidden max-w-[1024px] md:block">
          <div className="h-0" />
        </div>
      </div>
    </VignetteBackground>
  );
}
