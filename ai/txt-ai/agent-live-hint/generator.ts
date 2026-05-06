"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import { liveListeningHintSystemPrompt } from "./schema";

export type LiveListeningHintInput = {
  /** 约 10 秒 STT 文本 */
  transcript: string;
  /** 展示用幼儿名，可为空 */
  childDisplayName?: string;
};

function buildUserMessage(input: LiveListeningHintInput): string {
  const name = (input.childDisplayName ?? "").trim() || "（未选姓名）";
  const t = input.transcript.trim();
  return [`幼儿姓名：${name}`, "", "【近 10 秒转写】", t || "（空）"].join("\n");
}

/** 将极短转写整理为 5～10 字教师提示 */
export async function generateLiveListeningHint(
  input: LiveListeningHintInput,
): Promise<{ success: boolean; text?: string; error?: string }> {
  const userContent = buildUserMessage(input);
  try {
    const { textStream } = streamText({
      model,
      system: liveListeningHintSystemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let text = "";
    for await (const chunk of textStream) {
      text += chunk;
    }
    return { success: true, text: text.trim() };
  } catch (error) {
    console.error("[txt-ai/agent-live-hint] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}
