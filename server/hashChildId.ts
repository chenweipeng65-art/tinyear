/** 幼儿身份证后六位：与家长端绑定、管理端修正共用（盐见 `ID_CARD_PEPPER`） */
import { createHmac } from "node:crypto";

export function idCardPepper(): string {
  return process.env.ID_CARD_PEPPER ?? "dev-m1-pepper";
}

export function hashIdCardLastSix(displayName: string, lastSix: string): string {
  return createHmac("sha256", idCardPepper()).update(`${displayName}:${lastSix}`).digest("hex");
}
