import { useCallback, useState } from 'react';

import { ModalShell } from './ModalShell';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}>;

export function ManualPasteModal({ open, onClose, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [isWorking, setIsWorking] = useState(false);

  const submit = useCallback(() => {
    if (isWorking) return;
    setIsWorking(true);
    onSubmit(text)
      .then(() => {
        setText('');
      })
      .finally(() => {
        setIsWorking(false);
      });
  }, [isWorking, onSubmit, text]);

  return (
    <ModalShell
      open={open}
      title="Paste link"
      subtitle="Clipboard access is blocked or empty. Paste a URL below and continue."
      onClose={onClose}
    >
      <textarea
        className="mt-3 min-h-[84px] w-full resize-none rounded-xl border border-border bg-panel px-3 py-2.5 text-[12px] text-textPrimary outline-none placeholder:text-textSecondary"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="https://www.instagram.com/..."
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
          Cancel
        </button>

        <button
          type="button"
          disabled={isWorking}
          className="rounded-xl border border-[rgba(201,168,106,0.45)] bg-[rgba(201,168,106,0.12)] px-3 py-2.5 text-[12px] tracking-[1px] text-textPrimary disabled:opacity-60"
          onClick={submit}
        >
          Download
        </button>
      </div>
    </ModalShell>
  );
}
