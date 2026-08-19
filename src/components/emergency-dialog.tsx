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
import { formatFee, formatTokenAmount } from "@/lib/format";
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
      <DialogContent className="max-w-md rounded-none border-[var(--rule)] bg-[var(--slate)]">
        <DialogHeader>
          <DialogTitle className="display text-2xl">Abandon the shaft?</DialogTitle>
          <DialogDescription>
            Abandoning early costs {formatFee(view.plan.emergencyFeeBps)} of principal.
            Unlifted {view.token.symbol} ({formatTokenAmount(view.claimableReward, view.token.symbol)}) is forfeited. Coupon you
            already lifted stays in your wallet.
          </DialogDescription>
        </DialogHeader>
        <dl className="border border-[var(--rule)] bg-[var(--pitch)] p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="tag">You get back</dt>
            <dd className="num">{formatTokenAmount(returned, view.token.symbol)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="tag">Fee</dt>
            <dd className="num">{formatTokenAmount(fee, view.token.symbol)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="tag">Forfeited coupon</dt>
            <dd className="num">{formatTokenAmount(view.claimableReward, view.token.symbol)}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep it open
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
