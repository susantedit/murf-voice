import { Noto_Sans_Devanagari, Public_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { ThemeProvider } from '@/components/app/theme-provider';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { cn } from '@/lib/shadcn/utils';
import { getAppConfig, getStyles } from '@/lib/utils';
import '@/styles/globals.css';

const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const commitMono = localFont({
  display: 'swap',
  variable: '--font-commit-mono',
  src: [
    {
      path: '../fonts/CommitMono-400-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/CommitMono-700-Regular.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/CommitMono-400-Italic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../fonts/CommitMono-700-Italic.otf',
      weight: '700',
      style: 'italic',
    },
  ],
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  const styles = getStyles(appConfig);
  const { pageTitle, pageDescription } = appConfig;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        publicSans.variable,
        notoDevanagari.variable,
        commitMono.variable,
        'scroll-smooth font-sans antialiased'
      )}
    >
      <head>
        {styles && <style>{styles}</style>}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </head>
      <body className="overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <header className="fixed top-0 left-0 z-50 w-full flex flex-row items-center justify-between px-5 py-3 md:px-8 bg-background/80 backdrop-blur-sm border-b border-border/40">
            {/* Vidya wordmark */}
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-bold text-base tracking-tight">Vidya</span>
              <span className="text-muted-foreground text-[10px] tracking-wider uppercase">AI Learning Assistant</span>
            </div>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-6" aria-label="Site navigation">
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200">How it works</a>
              <a href="#languages" className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200">Languages</a>
            </nav>
          </header>

          {children}
          <div className="group fixed bottom-0 left-1/2 z-50 mb-2 -translate-x-1/2">
            <ThemeToggle className="translate-y-20 transition-transform delay-150 duration-300 group-hover:translate-y-0" />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
