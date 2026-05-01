/* ── Shared: Error Banner ── */

import type { ReactNode } from 'react';
import { MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';

interface ErrorBannerProps {
  title?: string;
  message: ReactNode;
}

export function ErrorBanner({ title = 'Error', message }: ErrorBannerProps) {
  return (
    <MessageBar intent="error">
      <MessageBarBody>
        <MessageBarTitle>{title}</MessageBarTitle>
        {message}
      </MessageBarBody>
    </MessageBar>
  );
}
