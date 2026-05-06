"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import {
  splitIndividualAnalysisOutput,
  type IndividualAnalysisJson,
} from "../lib/aiAnalysisReports";
import { childIndividualAnalysisSystemPrompt } from "./schema";

export type PortfolioSnippetForIndividual = {
  displayDate: string;
  title: string;
  developmentAnalysisSnippet: string | null;
};

export type ChildIndividualAnalysisInput = {
  childDisplayName: string;
  /** 新→旧，通常取最近 3 条 PortfolioArchiveItem */
  recentPortfolioItems: PortfolioSnippetForIndividual[];
};

const LOG_DEBUG =
  process.env.AI_LISTENING_TEXT_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

function debugLog(...args: unknown[]) {
  if (!LOG_DEBUG) return;
  console.log("[txt-ai/agent-one individual]", ...args);
}

export function buildChildIndividualAnalysisUserMessage(
  input: ChildIndividualAnalysisInput,
): string {
  const lines: string[] = [
    `# 幼儿：${input.childDisplayName}`,
    "",
    "## 最近成长档案条目（含个性发展分析摘要，新→旧）",
    "",
  ];
  const items = input.recentPortfolioItems.slice(0, 3);
  if (items.length === 0) {
    lines.push("（当前无档案条目，请仍输出报告结构，并在正文中说明材料不足；JSON 中分数取 2～3 并注明依据不足）");
  }
  items.forEach((row, idx) => {
    lines.push(`### 第 ${idx + 1} 条（${row.displayDate}）${row.title}`);
    lines.push(
      row.developmentAnalysisSnippet?.trim()
        ? row.developmentAnalysisSnippet.trim()
        : "（本条暂无个性发展分析摘要）",
    );
    lines.push("");
  });
  return lines.join("\n");
}

export type ChildIndividualAnalysisResult = {
  success: boolean;
  /** 模型完整原文（含定界 JSON） */
  raw?: string;
  /** 定界符之前的 Markdown 报告 */
  markdown?: string;
  /** 解析出的结构化数据；解析失败时为 null */
  structured?: IndividualAnalysisJson | null;
  error?: string;
};

/**
 * 生成一名幼儿的个别化分析报告（Markdown + 雷达/柱状图用 JSON）
 */
export async function generateChildIndividualAnalysis(
  input: ChildIndividualAnalysisInput,
): Promise<ChildIndividualAnalysisResult> {
  const userContent = buildChildIndividualAnalysisUserMessage(input);
  debugLog("start", { child: input.childDisplayName, chars: userContent.length });
  try {
    const { textStream } = streamText({
      model,
      system: childIndividualAnalysisSystemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let text = "";
    for await (const chunk of textStream) {
      text += chunk;
    }
    const raw = text.trim();
    const { markdown, json } = splitIndividualAnalysisOutput(raw);
    debugLog("done", { rawChars: raw.length, parsedJson: json != null });
    return {
      success: true,
      raw,
      markdown,
      structured: json,
    };
  } catch (error) {
    console.error("[txt-ai/agent-one individual] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}

export { splitIndividualAnalysisOutput } from "../lib/aiAnalysisReports";
