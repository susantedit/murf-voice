'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

// ── Types ──────────────────────────────────────────────────────────────────

interface ForgetConfirmModalProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the modal requests an open/close state change. */
  onOpenChange: (open: boolean) => void;
  /** Async function that deletes the learner's memory. */
  onConfirm: () => Promise<void>;
}

// ── ForgetConfirmModal ─────────────────────────────────────────────────────

export function ForgetConfirmModal({ open, onOpenChange, onConfirm }: ForgetConfirmModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (confirming) return;
    setConfirming(true);

    try {
      await onConfirm();
      toast.success('Your learning memory has been cleared.');
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />

        {/* Content */}
        <Dialog.Content
          className="border-border/60 bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 shadow-xl focus:outline-none"
          aria-describedby="forget-modal-description"
        >
          {/* Icon */}
          <div
            className="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            aria-hidden="true"
          >
            <Trash size={24} weight="regular" className="text-destructive" />
          </div>

          {/* Title */}
          <Dialog.Title className="text-foreground mb-2 text-lg font-bold">
            Forget your learning memory?
          </Dialog.Title>

          {/* Body */}
          <Dialog.Description
            id="forget-modal-description"
            className="text-muted-foreground mb-6 text-sm leading-relaxed"
          >
            This will permanently delete all of your saved learning information — your name, level,
            language preference, goal, and topics. This action{' '}
            <strong className="text-foreground font-semibold">cannot be undone</strong>.
          </Dialog.Description>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={confirming}>
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={confirming}
              aria-label="Confirm permanent deletion of learning memory"
            >
              {confirming ? (
                <>
                  <span
                    className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden="true"
                  />
                  Forgetting...
                </>
              ) : (
                <>
                  <Trash size={14} weight="regular" aria-hidden="true" />
                  Forget Everything
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
