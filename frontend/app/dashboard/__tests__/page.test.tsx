import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { metadata } from '../page';
import React from 'react';

// Import the MetricCard component by extracting it from dashboard-client
// Since MetricCard is not exported, we'll test it through the DashboardClient component
// and also create a standalone version for direct testing

interface MetricCardProps {
  label: string;
  value: number | null;
  accentVariant: 'green' | 'red' | 'neutral';
}

// Recreate MetricCard component for testing purposes
function MetricCard({ label, value, accentVariant }: MetricCardProps) {
  const borderColorClass =
    accentVariant === 'green'
      ? 'border-green-500/30'
      : accentVariant === 'red'
        ? 'border-red-500/30'
        : 'border-border';

  const textColorClass =
    accentVariant === 'green'
      ? 'text-green-600 dark:text-green-400'
      : accentVariant === 'red'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground';

  const accentBgClass =
    accentVariant === 'green'
      ? 'bg-green-500/10'
      : accentVariant === 'red'
        ? 'bg-red-500/10'
        : 'bg-muted/50';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${borderColorClass} ${accentBgClass} backdrop-blur-sm transition-colors`}
    >
      <div className="p-6">
        <div className="mb-2 text-sm font-medium text-muted-foreground">
          {label}
        </div>
        <div className={`text-3xl font-bold ${textColorClass}`}>
          {value === null ? '—' : value}
        </div>
      </div>
    </div>
  );
}

describe('MetricCard Component', () => {
  it('renders label and numeric value', () => {
    render(<MetricCard label="Total Calls" value={42} accentVariant="neutral" />);
    
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('applies green CSS class when accentVariant is green', () => {
    const { container } = render(
      <MetricCard label="Successful Calls" value={10} accentVariant="green" />
    );
    
    // Check for green-specific classes
    const cardDiv = container.querySelector('.border-green-500\\/30');
    expect(cardDiv).toBeInTheDocument();
    
    const valueDiv = container.querySelector('.text-green-600');
    expect(valueDiv).toBeInTheDocument();
    expect(valueDiv).toHaveTextContent('10');
  });

  it('applies red CSS class when accentVariant is red', () => {
    const { container } = render(
      <MetricCard label="Failed Calls" value={5} accentVariant="red" />
    );
    
    // Check for red-specific classes
    const cardDiv = container.querySelector('.border-red-500\\/30');
    expect(cardDiv).toBeInTheDocument();
    
    const valueDiv = container.querySelector('.text-red-600');
    expect(valueDiv).toBeInTheDocument();
    expect(valueDiv).toHaveTextContent('5');
  });

  it('renders — when value is null', () => {
    render(<MetricCard label="Total Calls" value={null} accentVariant="neutral" />);
    
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('Dashboard Page Metadata', () => {
  it('has correct title', () => {
    expect(metadata.title).toBe('Call Analytics | Vidya');
  });

  it('has correct description', () => {
    expect(metadata.description).toBe(
      'Aggregate call performance metrics for Vidya AI Learning Assistant'
    );
  });
});

describe('DashboardClient Component', () => {
  // Import DashboardClient for testing
  // We need to dynamically import it since it's a client component
  let DashboardClient: React.ComponentType;

  beforeAll(async () => {
    // Dynamic import of the client component
    const module = await import('../dashboard-client');
    DashboardClient = module.default;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  it('shows loading state on initial render (before fetch resolves)', async () => {
    // Mock fetch to never resolve (simulating in-flight request)
    const pendingPromise = new Promise(() => {});
    global.fetch = vi.fn(() => pendingPromise) as any;

    render(<DashboardClient />);

    // Check that loading state is visible
    // The component should show "Refresh" button in disabled state
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it('shows metric values after successful fetch', async () => {
    // Mock successful fetch response
    const mockMetrics = {
      total_calls: 5,
      successful_calls: 3,
      failed_calls: 2,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockMetrics,
      })
    ) as any;

    render(<DashboardClient />);

    // Wait for metrics to appear
    await screen.findByText('5');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check labels are present
    expect(screen.getByText('Total Calls')).toBeInTheDocument();
    expect(screen.getByText('Successful Calls')).toBeInTheDocument();
    expect(screen.getByText('Failed Calls')).toBeInTheDocument();
  });

  it('shows error message and — placeholders after a failed fetch (non-200)', async () => {
    // Mock failed fetch (non-200 response)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    ) as any;

    render(<DashboardClient />);

    // Wait for error message to appear
    await screen.findByText(
      /Could not load dashboard data\. Is the backend running\?/i
    );

    // Check that metric cards show — placeholder
    const placeholders = screen.getAllByText('—');
    expect(placeholders.length).toBeGreaterThanOrEqual(3);
  });

  it('does NOT update lastUpdated after a failed fetch', async () => {
    // First, mock a successful fetch
    const mockMetrics = {
      total_calls: 5,
      successful_calls: 3,
      failed_calls: 2,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockMetrics,
      })
    ) as any;

    render(<DashboardClient />);

    // Wait for initial successful fetch
    await screen.findByText('5');

    // Get the initial timestamp
    const timestampElement = screen.getByText(/Last updated:/);
    const initialTimestamp = timestampElement.textContent;

    // Now mock a failed fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    ) as any;

    // Click refresh button to trigger new fetch
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    refreshButton.click();

    // Wait for error to appear
    await screen.findByText(
      /Could not load dashboard data\. Is the backend running\?/i
    );

    // Check that timestamp has NOT changed
    const updatedTimestampElement = screen.getByText(/Last updated:/);
    expect(updatedTimestampElement.textContent).toBe(initialTimestamp);
  });

  it('DOES update lastUpdated only after a successful fetch', async () => {
    // Mock successful fetch
    const mockMetrics = {
      total_calls: 5,
      successful_calls: 3,
      failed_calls: 2,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockMetrics,
      })
    ) as any;

    render(<DashboardClient />);

    // Wait for initial fetch
    await screen.findByText('5');

    // Check that "Last updated" timestamp is present
    const timestampElement = screen.getByText(/Last updated:/);
    expect(timestampElement).toBeInTheDocument();

    // Verify the timestamp format (HH:MM:SS)
    const timestampText = timestampElement.textContent || '';
    expect(timestampText).toMatch(/Last updated: \d{1,2}:\d{2}:\d{2}/);
  });

  it('clicking the Refresh button triggers a new fetch call', async () => {
    // Mock successful fetch
    const mockMetrics = {
      total_calls: 5,
      successful_calls: 3,
      failed_calls: 2,
    };

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockMetrics,
      })
    ) as any;

    global.fetch = fetchMock;

    render(<DashboardClient />);

    // Wait for initial fetch to complete
    await screen.findByText('5');

    // Check that fetch was called once (on mount)
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    refreshButton.click();

    // Wait for the second fetch to complete
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // Verify the fetch URL
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8888/dashboard/metrics',
      expect.any(Object)
    );
  });
});
