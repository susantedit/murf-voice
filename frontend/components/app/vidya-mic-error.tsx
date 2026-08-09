'use client';

import { Button } from '@/components/ui/button';

interface VidyaMicErrorProps {
  errorType: 'denied' | 'notfound' | 'unknown';
  onRetry: () => void;
}

/**
 * User-friendly microphone error screen.
 * Never exposes raw browser error names or stack traces.
 */
export function VidyaMicError({ errorType, onRetry }: VidyaMicErrorProps) {
  const info = getErrorInfo(errorType);

  return (
    <div
      className="flex min-h-svh w-full flex-col items-center justify-center px-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-destructive/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl">
        🎤
      </div>

      <h2 className="text-foreground mb-2 text-xl font-bold">{info.title}</h2>
      <p className="text-muted-foreground mb-6 max-w-xs text-sm leading-relaxed">{info.message}</p>

      <Button
        onClick={onRetry}
        className="rounded-full px-6"
        aria-label="Try microphone access again"
      >
        🔄 Try Again
      </Button>
    </div>
  );
}

function getErrorInfo(type: 'denied' | 'notfound' | 'unknown') {
  switch (type) {
    case 'denied':
      return {
        title: 'Microphone access is needed',
        message:
          'Microphone access was blocked. Allow microphone access in your browser settings, then try again.',
      };
    case 'notfound':
      return {
        title: 'No microphone found',
        message: "We couldn't find a working microphone. Check your microphone and try again.",
      };
    default:
      return {
        title: 'Microphone error',
        message: 'Something went wrong with the microphone. Please try again.',
      };
  }
}
