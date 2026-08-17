"use client";

import type { ReactNode } from "react";

import { CtaButton } from "@/components/ui/cta-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  busy,
  submitLabel = "Save",
  danger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>;
  busy?: boolean;
  submitLabel?: string;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88vh,720px)] overflow-y-auto rounded-[1.75rem] border-white/10 bg-[#11161f] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {onSubmit ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            {children}
            <DialogFooter className="mx-0 mb-0 rounded-none border-0 bg-transparent p-0 pt-2">
              <CtaButton variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
                Cancel
              </CtaButton>
              <CtaButton type="submit" disabled={busy} variant={danger ? "danger" : "primary"} className="h-11">
                {busy ? "Saving…" : submitLabel}
              </CtaButton>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">{children}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
