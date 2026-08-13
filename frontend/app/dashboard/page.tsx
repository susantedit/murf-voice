import type { Metadata } from 'next';
import DashboardClient from './dashboard-client';

// ── Metadata (server-side export) ──────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Call Analytics | Vidya',
  description: 'Aggregate call performance metrics for Vidya AI Learning Assistant',
};

// ── Server Component Page ──────────────────────────────────────────────────

export default function DashboardPage() {
  return <DashboardClient />;
}
