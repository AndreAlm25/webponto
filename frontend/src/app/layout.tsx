import type { Metadata } from 'next';
import Script from 'next/script';
import { Comfortaa } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import React from 'react'

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'WebPonto - Sistema de Ponto Eletrônico',
  description: 'Sistema completo de controle de ponto com reconhecimento facial',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Bootstrap de tema: aplica 'light' ou 'dark' antes da hidratação para evitar flash, sem mismatch de hidratação */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storageKey = 'webponto-theme';
                  var saved = localStorage.getItem(storageKey);
                  var theme = saved || 'system';
                  var root = document.documentElement;
                  root.classList.remove('light','dark');
                  if (theme === 'system') {
                    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    root.classList.add(isDark ? 'dark' : 'light');
                  } else {
                    root.classList.add(theme);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${comfortaa.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
