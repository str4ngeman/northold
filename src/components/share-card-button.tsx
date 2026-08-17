"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatTokenId } from "@/lib/format";

type ShareCardButtonProps = {
  tokenId: number;
  targetRef: React.RefObject<HTMLElement | null>;
};

export function ShareCardButton({ tokenId, targetRef }: ShareCardButtonProps) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  async function download() {
    if (!targetRef.current || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#07070c",
      });
      const link = document.createElement("a");
      link.download = `leagueto-vault-${formatTokenId(tokenId).slice(1)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card image saved");
    } catch {
      toast.error("Could not export this card");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={download} disabled={busy}>
      <Download data-icon="inline-start" />
      Save card PNG
    </Button>
  );
}
