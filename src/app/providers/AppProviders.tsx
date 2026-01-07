import type { PropsWithChildren } from 'react';

import { setHttpClient } from '../../services/http/httpClient';
import { createWebHttpClient } from '../../services/http/web/webHttpClient';

setHttpClient(createWebHttpClient());

export function AppProviders({ children }: PropsWithChildren) {
  return children;
}
