'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, List, Microphone, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Learn', href: '/' },
  { label: 'Memory', href: '/memory' },
  { label: 'Privacy', href: '/#privacy' },
  { label: 'About', href: '/#how-it-works' },
];

// ── NavBar ─────────────────────────────────────────────────────────────────

/**
 * NavBar
 *
 * Sticky top navigation bar with brand, nav links, and a CTA.
 * Includes a hamburger menu for mobile with a dropdown.
 * Uses usePathname() to highlight the active Memory link.
 */
export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header
      className="border-border/40 bg-background/80 fixed top-0 left-0 z-50 w-full border-b backdrop-blur-sm"
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        {/* ── Brand ── */}
        <Link href="/" className="flex flex-col leading-tight" aria-label="Vidya — home">
          <span className="text-foreground text-base font-bold tracking-tight">VIDYA</span>
          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
            AI Learning Assistant
          </span>
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
          {/* Memory indicator */}
          <Link
            href="/memory"
            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors"
            aria-label="View learning memory"
          >
            <Brain size={12} weight="duotone" aria-hidden="true" />
            Memory
          </Link>
          <Link href="/">
            <Button
              size="sm"
              className="rounded-full font-mono text-xs font-bold tracking-widest uppercase"
              aria-label="Go to homepage to start learning"
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
          {mobileOpen ? <X size={20} aria-hidden="true" /> : <List size={20} aria-hidden="true" />}
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="border-border/40 bg-background/95 border-t px-4 pt-2 pb-4 md:hidden"
          role="navigation"
          aria-label="Mobile site navigation"
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-sm transition-colors duration-200',
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

            <li className="mt-2">
              <Link href="/" onClick={() => setMobileOpen(false)}>
                <Button
                  size="sm"
                  className="w-full rounded-full font-mono text-xs font-bold tracking-widest uppercase"
                  aria-label="Go to homepage to start learning"
                >
                  <Microphone size={13} weight="bold" aria-hidden="true" />
                  Start Learning
                </Button>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
