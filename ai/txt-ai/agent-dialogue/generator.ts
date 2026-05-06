"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import { listeningDialogueFormatSystemPrompt } from "./schema";

export type ListeningDialogueFormatInput = {
  /** 与首页下拉一致的幼儿展示名 */
  childDisplayName: string;
  /** 老师侧标签，默认「老师」 */
  teacherLabel?: string;
  /** ElevenLabs 等返回的整段转写 */
  rawTranscript: string;
};

function buildUserMessage(input: ListeningDialogueFormatInput): string {
  const teacher = (input.teacherLabel ?? "老师").trim() || "老师";
  const raw = input.rawTranscript.trim();
  return [
    `幼儿姓名：${input.childDisplayName.trim()}`,
    `老师称呼：${teacher}`,
    "",
    "【整段转写】",
    raw || "（空）",
  ].join("\n");
}

/**
 * 将整段转写整理为「幼儿姓名：… / 老师：…」分行格式（与 agent1 共用 TXT 模型，默认 deepseek-v3）
 */
export async function generateListeningDialogueFormat(
  input: ListeningDialogueFormatInput,
): Promise<{ success: boolean; text?: string; error?: string }> {
  const userContent = buildUserMessage(input);
  try {
    const { textStream } = streamText({
      model,
      system: listeningDialogueFormatSystemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let text = "";
    for await (const chunk of textStream) {
      text += chunk;
    }
    return { success: true, text: text.trim() };
  } catch (error) {
    console.error("[txt-ai/agent-dialogue] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}
