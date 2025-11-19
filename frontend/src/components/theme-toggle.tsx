'use client';

import { Moon, Sun } from 'lucide-react';
import { useCallback } from 'react';
import { useTheme } from './theme-provider';

export function ThemeToggle({ className }: { className?: string }) {
  // Usa o ThemeProvider (storageKey: 'webponto-theme') para garantir persistência
  const { setTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
  }, [setTheme]);

  // Renderiza os dois ícones e deixa o CSS decidir qual mostrar imediatamente (sem flicker)
  return (
    <button
      onClick={toggleTheme}
      className={className || "relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background hover:bg-accent hover:text-accent-foreground transition-colors"}
      aria-label="Alternar tema"
    >
      <Sun className="h-5 w-5 hidden dark:block" />
      <Moon className="h-5 w-5 dark:hidden" />
    </button>
  );
}
