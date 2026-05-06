"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { extractStreamTextErrorMessage } from "../lib/extractStreamTextError";
import {
  splitClassOverallAnalysisOutput,
  type ClassOverallAnalysisJson,
} from "../lib/aiAnalysisReports";
import { classOverallAnalysisSystemPrompt } from "./schema";

export type StudentLatestIndividualSlot = {
  displayName: string;
  hasPortfolioArchive: boolean;
  hasIndividualAnalysis: boolean;
  /**
   * 最新个别化分析中与「雷达图 + 柱状图」对应的结构化片段（JSON 字符串，仅含 radarScores、barSeries）；
   * 无可用结构化数据时为 null（不参与班级维度归纳）。
   */
  individualChartsJson: string | null;
};

export type ClassOverallAnalysisInput = {
  /** 展示用，如「中一班」 */
  classDisplayLabel: string;
  students: StudentLatestIndividualSlot[];
};

const LOG_DEBUG =
  process.env.AI_LISTENING_TEXT_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

function debugLog(...args: unknown[]) {
  if (!LOG_DEBUG) return;
  console.log("[txt-ai/agent-all class-overall]", ...args);
}

export function buildClassOverallAnalysisUserMessage(
  input: ClassOverallAnalysisInput,
): string {
  const lines: string[] = [
    `# 班级：${input.classDisplayLabel}`,
    "",
    "## 学生清单（请对每一名输出报告与 JSON 表格行；无个别化分析的学生不得虚构报告内容）",
    "",
  ];
  for (const s of input.students) {
    lines.push(`### ${s.displayName}`);
    lines.push(`- 是否有成长档案：${s.hasPortfolioArchive ? "是" : "否"}`);
    lines.push(`- 是否有个别化分析报告：${s.hasIndividualAnalysis ? "是" : "否"}`);
    if (s.individualChartsJson?.trim()) {
      lines.push("");
      lines.push("#### 个别化分析·图表维度数据（仅雷达十维与柱状序列，非报告全文）");
      lines.push(s.individualChartsJson.trim());
    } else {
      lines.push("- 个别化分析·图表维度数据：（无，该幼儿不参与班级雷达/柱状量化归纳）");
    }
    lines.push("");
  }
  return lines.join("\n");
}

export type ClassOverallAnalysisResult = {
  success: boolean;
  raw?: string;
  markdown?: string;
  structured?: ClassOverallAnalysisJson | null;
  error?: string;
};

/**
 * 生成班级整体分析报告（汇总各幼儿最新个别化分析中的「雷达 + 柱状」维度数据；Markdown + 表格与图表 JSON）
 */
export async function generateClassOverallAnalysis(
  input: ClassOverallAnalysisInput,
): Promise<ClassOverallAnalysisResult> {
  const userContent = buildClassOverallAnalysisUserMessage(input);
  debugLog("start", {
    class: input.classDisplayLabel,
    students: input.students.length,
    chars: userContent.length,
  });
  try {
    const { textStream } = streamText({
      model,
      system: classOverallAnalysisSystemPrompt,
      messages: [{ role: "user", content: userContent }],
    });
    let text = "";
    for await (const chunk of textStream) {
      text += chunk;
    }
    const raw = text.trim();
    const { markdown, json } = splitClassOverallAnalysisOutput(raw);
    debugLog("done", { rawChars: raw.length, parsedJson: json != null });
    return {
      success: true,
      raw,
      markdown,
      structured: json,
    };
  } catch (error) {
    console.error("[txt-ai/agent-all class-overall] failed", error);
    return { success: false, error: extractStreamTextErrorMessage(error) };
  }
}

export { splitClassOverallAnalysisOutput } from "../lib/aiAnalysisReports";
