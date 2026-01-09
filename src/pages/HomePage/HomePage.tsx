import { useMemo, useState } from "react";

import { CircularCta } from "../../components/CircularCta/CircularCta";
import { ProgressBar } from "../../components/ProgressBar/ProgressBar";
import { InstagramCookieModal } from "../../components/modals/InstagramCookieModal";
import { ManualPasteModal } from "../../components/modals/ManualPasteModal";
import { VignetteBackground } from "../../components/VignetteBackground/VignetteBackground";
import { useClipboardDownloadFlow } from "../../hooks/useClipboardDownloadFlow";
import { loadInstagramAuthCookie } from "../../services/instagramAuth/authStorage";
import { formatBytes } from "../../utils/format";

export function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cookieDraft, setCookieDraft] = useState('');

  const openCookieModal = () => {
    loadInstagramAuthCookie()
      .then((v) => {
        if (typeof v === "string") {
          setCookieDraft(v);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setSettingsOpen(true);
      });
  };

  const { state, run, manualPaste } = useClipboardDownloadFlow({
    onStoryAuthRequired: () => {
      openCookieModal();
    },
  });

  const ctaLabel = useMemo(() => {
    if (!state.isBusy) return undefined;
    if (state.isResolving) return "…";
    const pct = state.progressPercent;
    if (pct === null) {
      const received = state.progress?.receivedBytes ?? 0;
      if (received > 0) return formatBytes(received);
      return "…";
    }
    return `${pct}%`;
  }, [
    state.isBusy,
    state.isResolving,
    state.progressPercent,
    state.progress?.receivedBytes,
  ]);

  return (
    <VignetteBackground>
      <div className="flex min-h-[100svh] w-full justify-center">
        <div className="flex min-h-[100svh] w-full max-w-[430px] flex-col px-7">
          <header className="pt-[calc(56px+env(safe-area-inset-top))] text-center">
            <h1 className="text-[22px] font-light tracking-[8px] text-textPrimary/80">GRAVITY</h1>
            <p className="mt-3 text-[11px] font-light tracking-[6px] text-textSecondary/75">
              What You Love, Offline
            </p>
          </header>

          <main className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center">
              <CircularCta onPress={run} disabled={state.isBusy} busy={state.isBusy} label={ctaLabel} />

              {state.isBusy && state.progressPercent !== null ? (
                <div className="mt-[18px] w-[min(248px,62vw)]">
                  <ProgressBar fraction={(state.progress?.fraction ?? 0) as number} height={6} />
                </div>
              ) : null}

              {state.isBusy &&
              state.progressPercent === null &&
              (state.progress?.receivedBytes ?? 0) > 0 ? (
                <div className="mt-4">
                  <div className="text-[12px] tracking-[2px] text-textSecondary/80">
                    {formatBytes(state.progress?.receivedBytes ?? 0)}
                  </div>
                </div>
              ) : null}
            </div>
          </main>

          <footer className="pb-[calc(28px+env(safe-area-inset-bottom))] text-center">
            <button
              type="button"
              className="text-[12px] font-light tracking-[5px] text-accent/90"
              onClick={() => {
                openCookieModal();
              }}
            >
              OMKAR KIRANE
            </button>
            <p className="mt-2 text-[8px] tracking-[3px] text-textSecondary/60">
              © {new Date().getFullYear()} · All rights reserved
            </p>
          </footer>
        </div>
      </div>

      <InstagramCookieModal
        open={settingsOpen}
        initialDraft={cookieDraft}
        onDraftChange={setCookieDraft}
        onClose={() => setSettingsOpen(false)}
      />

      <ManualPasteModal
        open={manualPaste.isOpen}
        onClose={manualPaste.close}
        onSubmit={manualPaste.submit}
      />
    </VignetteBackground>
  );
}
