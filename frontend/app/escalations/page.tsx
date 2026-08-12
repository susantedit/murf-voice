import type { Metadata } from 'next';
import { EscalationsDashboard } from '@/components/app/escalations-dashboard';

export const metadata: Metadata = {
  title: 'Escalation Requests — Vidya',
  description: 'Dashboard for human help and teacher support requests from Vidya learners.',
};

export default function EscalationsPage() {
  return (
    <main className="relative min-h-svh w-full overflow-hidden">
      {/* Ambient background — matches the app-wide dark glass aesthetic */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="bg-primary/8 absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 -left-40 h-[350px] w-[350px] rounded-full bg-violet-400/6 blur-[120px]" />
        <div className="absolute right-0 bottom-0 h-[300px] w-[400px] rounded-full bg-red-400/4 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-28 pb-20">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1">
          <div className="bg-primary/10 text-primary mb-2 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-widest uppercase">
            <span className="bg-primary inline-block h-1.5 w-1.5 rounded-full" aria-hidden="true" />
            Day 7 — Human Help
          </div>
          <h1 className="text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
            Escalation Requests
          </h1>
          <p className="text-muted-foreground text-sm">
            Teacher support requests raised by Vidya learners. Review, act, and resolve.
          </p>
        </div>

        <EscalationsDashboard />
      </div>
    </main>
  );
}
