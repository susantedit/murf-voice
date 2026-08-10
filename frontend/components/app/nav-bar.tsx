'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { List, Microphone, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Privacy', href: '/#privacy' },
  { label: 'Learning', href: '/#learning' },
  { label: 'Memory', href: '/memory' },
];

// ── NavBar ─────────────────────────────────────────────────────────────────

/**
 * NavBar
 *
 * Sticky top navigation with glass effect, Vidya logo, nav links, and CTA.
 * Mobile: hamburger → animated slide-down drawer.
 */
export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed top-0 left-0 z-50 w-full" role="banner">
      {/* Glass bar */}
      <div className="bg-background/90 relative border-b border-white/[0.08] backdrop-blur-xl">
        {/* Subtle gradient line at the bottom of the border */}
        <div
          className="absolute bottom-0 left-0 h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, oklch(0.65 0.22 264 / 0.4) 30%, oklch(0.65 0.22 264 / 0.7) 50%, oklch(0.65 0.22 264 / 0.4) 70%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 md:px-8">
          {/* ── Brand ── */}
          <Link href="/" className="flex items-center gap-2.5" aria-label="Vidya — home">
            <Image
              src="/vidya-logo.png"
              alt="Vidya"
              width={32}
              height={32}
              className="shrink-0 rounded-lg"
              priority
            />
            <div className="flex flex-col leading-none">
              <span className="text-foreground text-sm font-bold tracking-tight">VIDYA</span>
              <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                AI Learning Assistant
              </span>
            </div>
          </Link>

          {/* ── Desktop nav links ── */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Site navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'text-sm transition-colors duration-200',
                  isActive(href)
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive(href) ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop CTA ── */}
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/">
              <Button
                size="sm"
                className="rounded-full px-5 font-mono text-xs font-bold tracking-widest uppercase"
                aria-label="Start your learning session with Vidya"
              >
                <Microphone size={13} weight="bold" aria-hidden="true" />
                Start Learning
              </Button>
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center justify-center rounded-md p-2 transition-colors duration-200 md:hidden"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <List size={20} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile slide-down drawer ── */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            key="mobile-drawer"
            id="mobile-nav-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="bg-background/95 overflow-hidden border-b border-white/[0.08] backdrop-blur-xl"
            role="navigation"
            aria-label="Mobile site navigation"
          >
            <ul className="flex flex-col gap-1 px-4 pt-2 pb-4">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 text-sm transition-colors duration-200',
                      isActive(href)
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    aria-current={isActive(href) ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                </li>
              ))}

              <li className="mt-3">
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full rounded-full font-mono text-xs font-bold tracking-widest uppercase"
                    aria-label="Start your learning session with Vidya"
                  >
                    <Microphone size={13} weight="bold" aria-hidden="true" />
                    Start Learning
                  </Button>
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
