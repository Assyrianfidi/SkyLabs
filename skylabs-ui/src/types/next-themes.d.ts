import 'next-themes';

declare module 'next-themes' {
  export interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: string;
    storageKey?: string;
    disableTransitionOnChange?: boolean;
    enableSystem?: boolean;
    enableColorScheme?: boolean;
    defaultTheme?: string;
    attribute?: string | 'class';
    value?: { [key: string]: string };
    nonce?: string;
  }
}
