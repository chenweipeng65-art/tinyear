"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { formatListeningContextForAgents } from "../lib/listeningContextPrompt";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import { childDevelopmentAnalysisSystemPrompt } from "./schema";
import type { ListeningTextAgentInput } from "../lib/listeningAgentTypes";
const LOG_DEBUG =
  process.env.AI_LISTENING_TEXT_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

function debugLog(...args: unknown[]) {
  if (!LOG_DEBUG) return;
  console.log("[txt-ai/agent3 development-analysis]", ...args);
}

/**
 * 生成「个性发展分析」正文
 */
export async function generateChildDevelopmentAnalysis(
  input: ListeningTextAgentInput,
): Promise<{ success: boolean; text?: string; error?: string }> {
  const userContent = formatListeningContextForAgents(input);
  debugLog("start", { chars: userContent.length });
  try {
    const { textStream } = streamText({
      model,
      system: childDevelopmentAnalysisSystemPrompt,
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
    console.error("[txt-ai/agent3 development-analysis] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}
