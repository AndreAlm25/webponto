'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from './theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ClientOnlyWebSocket } from './client-only-websocket';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="webponto-theme">
        <AuthProvider>
          <ClientOnlyWebSocket>
            {children}
          </ClientOnlyWebSocket>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
