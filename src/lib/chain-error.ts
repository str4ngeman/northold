import { BaseError, ContractFunctionRevertedError } from "viem";

const REVERT: Record<string, string> = {
  AmountOutOfRange: "Amount is outside this plan’s USD range on-chain.",
  InactivePlan: "This plan is paused on-chain.",
  UnknownPlan: "This plan is not on the vault yet. Redeploy or create it again.",
  InactiveAsset: "This token is not enabled on the vault.",
  UnknownAsset: "This token is not enabled on the vault.",
  DepositsPaused: "Deposits are paused on the vault.",
  ExitsPaused: "Exits are paused on the vault.",
  StillLocked: "This lock has not matured yet.",
  AlreadyMatured: "Mature locks must use Release principal, not early exit.",
  NothingToClaim: "Nothing to claim yet.",
  NotCardOwner: "This wallet does not own that position card.",
  NotLocked: "This position is already closed.",
  InvalidBps: "Referral share must be 20% or less.",
          InsufficientAvailable: "The coupon treasury for this token is short. Fund rewards, then try again.",
};

export function decodeChainError(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && REVERT[name]) return REVERT[name];
      if (name) return name;
    }
    const text = `${err.shortMessage} ${err.message}`;
    if (/fetch|econnrefused|timeout|failed to fetch/i.test(text)) {
      return "Could not reach the RPC. Check the RPC URL in Admin → Settings.";
    }
    if (/user rejected|denied/i.test(text)) return "Transaction rejected in MetaMask.";
    return err.shortMessage || err.message;
  }
  return err instanceof Error ? err.message : "On-chain write failed";
}
