import crypto from "crypto";

export function makeReferralCode() {
  return crypto.randomBytes(4).toString("hex");
}
