'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { List, Microphone, Phone, X } from '@phosphor-icons/react';
import { VidyaLogo } from '@/components/app/vidya-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';
import { getUserId } from '@/lib/user-identity';

// ── Types ──────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/#home' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Practice', href: '/#learning' },
  { label: 'Teacher Support', href: '/#schedule' },
  { label: 'Privacy', href: '/#privacy' },
];

const API_BASE = process.env.NEXT_PUBLIC_MEMORY_API_URL ?? 'http://localhost:8888';

// ── Call Now button ────────────────────────────────────────────────────────

function CallNowButton({ className }: { className?: string }) {
  const [status, setStatus] = useState<'idle' | 'calling' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCall = async () => {
    if (status === 'calling') return;
    const userId = getUserId();
    if (!userId || userId === 'server-side') {
      setStatus('error');
      setErrorMsg('No user ID');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('calling');
    setErrorMsg('');
    try {
      // Fetch saved SIP URI
      const memRes = await fetch(`${API_BASE}/memory/${encodeURIComponent(userId)}`);
      const mem = (await memRes.json()) as { sip_uri?: string };
      const sipUri = mem.sip_uri;
      if (!sipUri) {
        alert(
          'No SIP URI saved.\nScroll down to "Daily Practice Call" and enter your Linphone SIP address first.'
        );
        setStatus('idle');
        return;
      }

      // POST to trigger — this blocks until Linphone is answered (up to 60s)
      const res = await fetch(`${API_BASE}/call/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, sip_uri: sipUri }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStatus('success');
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setErrorMsg(data.error ?? 'call failed');
        setStatus('error');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch {
      setErrorMsg('network error');
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const label =
    status === 'calling'
      ? 'Ringing...'
      : status === 'success'
        ? 'Connected!'
        : status === 'error'
          ? `Error: ${errorMsg}`
          : 'Call Now';

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCall}
      disabled={status === 'calling'}
      className={cn(
        'rounded-full font-mono text-xs font-bold tracking-widest uppercase transition-all duration-200',
        status === 'calling' && 'cursor-wait border-amber-400/40 text-amber-400 opacity-90',
        status === 'success' && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
        status === 'error' && 'border-red-500/40 text-red-400',
        className
      )}
      aria-label="Trigger an outbound call to your Linphone now"
    >
      {status === 'calling' ? (
        <span
          className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : status === 'success' ? (
        <Phone size={13} weight="fill" aria-hidden="true" />
      ) : (
        <Phone size={13} weight="bold" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}

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

  // Strip hash fragment before comparing to pathname (all nav links are scroll anchors)
  const isActive = (href: string) => pathname === href.split('#')[0] || pathname === href;

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
          <Link href="/" className="flex items-center gap-2" aria-label="Vidya — home">
            <VidyaLogo size={28} className="text-primary" />
            <span className="text-muted-foreground hidden text-[10px] tracking-widest uppercase sm:inline">
              AI Learning Companion
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
            <CallNowButton />
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

              <li className="mt-3 flex flex-col gap-2">
                <CallNowButton className="w-full" />
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
