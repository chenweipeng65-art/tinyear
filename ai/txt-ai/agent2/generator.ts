"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { formatListeningContextForAgents } from "../lib/listeningContextPrompt";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import { parentGuidanceSystemPrompt } from "./schema";
import type { ListeningTextAgentInput } from "../lib/listeningAgentTypes";

const LOG_DEBUG =
  process.env.AI_LISTENING_TEXT_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

function debugLog(...args: unknown[]) {
  if (!LOG_DEBUG) return;
  console.log("[txt-ai/agent2 parent-guidance]", ...args);
}

/**
 * 生成「指导建议（家长）」正文
 */
export async function generateParentGuidanceAdvice(
  input: ListeningTextAgentInput,
): Promise<{ success: boolean; text?: string; error?: string }> {
  const userContent = formatListeningContextForAgents(input);
  debugLog("start", { chars: userContent.length });
  try {
    const { textStream } = streamText({
      model,
      system: parentGuidanceSystemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let text = "";
    for await (const chunk of textStream) {
      text += chunk;
    }
    debugLog("done", { outChars: text.length });
    return {
      success: true,
      text: text.trim(),
    };
  } catch (error) {
    console.error("[txt-ai/agent2 parent-guidance] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}
