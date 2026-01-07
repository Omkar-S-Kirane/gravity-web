import { useCallback, useMemo, useState } from 'react';

import { useToast } from '../toast/ToastProvider';
import { clearInstagramAuthCookie, saveInstagramAuthCookie } from '../../services/instagramAuth/authStorage';
import { ModalShell } from './ModalShell';

type Props = Readonly<{
  open: boolean;
  initialDraft: string;
  onClose: () => void;
  onDraftChange: (next: string) => void;
}>;

export function InstagramCookieModal({ open, initialDraft, onClose, onDraftChange }: Props) {
  const { show } = useToast();
  const [isWorking, setIsWorking] = useState(false);

  const subtitle = useMemo(
    () => 'Paste a cookie string that includes sessionid. This is required for most story downloads.',
    [],
  );

  const onClear = useCallback(() => {
    if (isWorking) return;
    setIsWorking(true);

    clearInstagramAuthCookie()
      .then(() => {
        onDraftChange('');
        show({ title: 'Instagram cookie cleared', variant: 'info' });
      })
      .catch(() => {
        show({ title: 'Failed to clear cookie', variant: 'error' });
      })
      .finally(() => {
        setIsWorking(false);
      });
  }, [isWorking, onDraftChange, show]);

  const onSave = useCallback(() => {
    if (isWorking) return;

    const trimmed = initialDraft.trim();
    if (!trimmed) {
      show({ title: 'Cookie is empty', message: 'Paste a cookie that includes sessionid.', variant: 'info' });
      return;
    }

    if (!trimmed.includes('sessionid=')) {
      show({
        title: 'Missing sessionid',
        message: 'This cookie does not include sessionid. Stories will still fail.',
        variant: 'info',
      });
    }

    setIsWorking(true);
    saveInstagramAuthCookie(trimmed)
      .then(() => {
        show({ title: 'Instagram cookie saved', variant: 'success' });
        onClose();
      })
      .catch(() => {
        show({ title: 'Failed to save cookie', variant: 'error' });
      })
      .finally(() => {
        setIsWorking(false);
      });
  }, [initialDraft, isWorking, onClose, show]);

  return (
    <ModalShell open={open} title="Instagram Cookie" subtitle={subtitle} onClose={onClose}>
      <textarea
        className="mt-3 min-h-[84px] w-full resize-none rounded-xl border border-border bg-panel px-3 py-2.5 text-[12px] text-textPrimary outline-none placeholder:text-textSecondary"
        value={initialDraft}
        onChange={e => onDraftChange(e.target.value)}
        placeholder="sessionid=...;"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />

      <div className="mt-3 flex flex-wrap justify-end gap-2.5">
        <button
          type="button"
          disabled={isWorking}
          className="rounded-xl border border-borderStrong bg-panel px-3 py-2.5 text-[12px] tracking-[1px] text-textPrimary disabled:opacity-60"
          onClick={onClose}
        >
          Close
        </button>

        <button
          type="button"
          disabled={isWorking}
          className="rounded-xl border border-borderStrong bg-panel px-3 py-2.5 text-[12px] tracking-[1px] text-textPrimary disabled:opacity-60"
          onClick={onClear}
        >
          Clear
        </button>

        <button
          type="button"
          disabled={isWorking}
          className="rounded-xl border border-[rgba(201,168,106,0.45)] bg-[rgba(201,168,106,0.12)] px-3 py-2.5 text-[12px] tracking-[1px] text-textPrimary disabled:opacity-60"
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </ModalShell>
  );
}
