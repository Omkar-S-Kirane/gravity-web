import type { PropsWithChildren } from 'react';

import { setHttpClient } from '../../services/http/httpClient';
import { createWebHttpClient } from '../../services/http/web/webHttpClient';
import { ToastProvider } from '../../components/toast/ToastProvider';

setHttpClient(createWebHttpClient());

export function AppProviders({ children }: PropsWithChildren) {
  return <ToastProvider>{children}</ToastProvider>;
}
