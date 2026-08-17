"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFee, formatTokenAmount, formatUsd } from "@/lib/format";
import { emergencyFeeAmount } from "@/lib/math";
import type { PositionView } from "@/lib/types";

type EmergencyDialogProps = {
  view: PositionView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export function EmergencyDialog({
  view,
  open,
  onOpenChange,
  onConfirm,
}: EmergencyDialogProps) {
  const [busy, setBusy] = useState(false);
  const fee = emergencyFeeAmount(view.principalAmount, view.plan.emergencyFeeBps);
  const returned = view.principalAmount - fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-lenis-prevent className="glass" style={{ borderRadius: 0, maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle>Break the seal?</DialogTitle>
          <DialogDescription>
            Emergency unlock takes {formatFee(view.plan.emergencyFeeBps)} of principal.
            Unclaimed USDT ({formatUsd(view.claimableUsdt)}) is forfeited. Already-claimed
            yield stays in your wallet.
          </DialogDescription>
        </DialogHeader>
        <dl className="glass" style={{ padding: "1rem", fontSize: "var(--fs-small)" }}>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">You get back</dt>
            <dd>{formatTokenAmount(returned, view.token.symbol)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Fee</dt>
            <dd>{formatTokenAmount(fee, view.token.symbol)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Forfeited USDT</dt>
            <dd>{formatUsd(view.claimableUsdt)}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep the lock
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unlock failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Break seal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
