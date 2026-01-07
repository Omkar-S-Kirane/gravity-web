import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export type ToastPayload = Readonly<{
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
}>;

type ToastContextValue = Readonly<{
  show: (payload: ToastPayload) => void;
}>;

const ToastContext = createContext<ToastContextValue | null>(null);

type VisibleToast = Readonly<{ payload: ToastPayload; visible: boolean }>;

function normalizePayload(payload: ToastPayload): ToastPayload {
  return {
    durationMs: payload.durationMs ?? 2200,
    variant: payload.variant ?? 'info',
    title: payload.title,
    message: payload.message,
  };
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<VisibleToast | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<ToastPayload[]>([]);
  const isShowingRef = useRef(false);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (!next) {
      isShowingRef.current = false;
      setToast(null);
      return;
    }

    const normalized = normalizePayload(next);
    isShowingRef.current = true;

    setToast({ payload: normalized, visible: false });
    requestAnimationFrame(() => {
      setToast({ payload: normalized, visible: true });
    });

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    hideTimer.current = setTimeout(() => {
      setToast(prev => (prev ? { ...prev, visible: false } : null));
      setTimeout(() => {
        showNext();
      }, 180);
    }, normalized.durationMs);
  }, []);

  const show = useCallback(
    (payload: ToastPayload) => {
      queueRef.current.push(normalizePayload(payload));

      if (!isShowingRef.current) {
        showNext();
      }
    },
    [showNext],
  );

  const value = useMemo(() => ({ show }), [show]);

  const borderClass = toast?.payload.variant === 'error'
    ? 'border-red-400/40'
    : toast?.payload.variant === 'success'
      ? 'border-emerald-300/30'
      : 'border-border';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className={
            'pointer-events-none fixed left-0 right-0 bottom-6 z-50 flex justify-center px-4 ' +
            'md:left-auto md:right-6 md:top-6 md:bottom-auto md:justify-end'
          }
        >
          <div
            className={
              'w-full max-w-[520px] rounded-[14px] border bg-[rgba(10,10,12,0.92)] px-[14px] py-3 ' +
              'transition-all duration-200 ease-out ' +
              borderClass +
              ' ' +
              (toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')
            }
          >
            <div className="truncate text-[14px] font-medium tracking-[0.2px] text-textPrimary">
              {toast.payload.title}
            </div>
            {toast.payload.message ? (
              <div className="mt-1 overflow-hidden text-[12px] font-normal tracking-[0.2px] text-textSecondary [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                {toast.payload.message}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
