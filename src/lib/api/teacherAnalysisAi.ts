import type { ClassOverallAnalysisJson, IndividualAnalysisJson } from "../../../ai/txt-ai/lib/aiAnalysisReports";

/** 与 server 中 INDIVIDUAL_CONCURRENCY 一致，仅用于界面说明 */
export const CLASS_OVERALL_INDIVIDUAL_BATCH_SIZE = 8;

export type ClassOverallStreamProgress =
  | {
      type: "individual_progress";
      completed: number;
      total: number;
      batchIndex: number;
      batchCount: number;
    }
  | { type: "overall_start" }
  | { type: "overall_done" };

type ClassOverallStreamLine =
  | ClassOverallStreamProgress
  | {
      type: "complete";
      ok: true;
      id: number;
      markdown: string;
      structured: ClassOverallAnalysisJson | null;
      raw: string;
    }
  | { type: "error"; status?: number; message: string };

export type TeacherIndividualAnalysisResponse = {
  ok: true;
  id: number;
  markdown: string;
  structured: IndividualAnalysisJson | null;
  raw: string;
};

export type TeacherClassOverallAnalysisResponse = {
  ok: true;
  id: number;
  markdown: string;
  structured: ClassOverallAnalysisJson | null;
  raw: string;
};

export async function teacherRunIndividualAnalysis(
  childId: number,
): Promise<TeacherIndividualAnalysisResponse> {
  const res = await fetch("/api/teacher/analysis-individual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId }),
  });
  const data = (await res.json()) as TeacherIndividualAnalysisResponse & {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : `请求失败（${res.status}）`,
    );
  }
  return data;
}

export async function teacherRunClassOverallAnalysis(
  classId: number,
): Promise<TeacherClassOverallAnalysisResponse> {
  const res = await fetch("/api/teacher/analysis-class-overall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId }),
  });
  const data = (await res.json()) as TeacherClassOverallAnalysisResponse & {
    ok?: boolean;
    id?: number;
    message?: string;
  };
  if (!res.ok || !data.ok || typeof data.id !== "number") {
    throw new Error(
      typeof data.message === "string" ? data.message : `请求失败（${res.status}）`,
    );
  }
  return data;
}

/** 流式整体分析：先分批并发补齐个别化图表维度，再生成班级报告（NDJSON 进度） */
export async function teacherRunClassOverallAnalysisStream(
  classId: number,
  onProgress: (e: ClassOverallStreamProgress) => void,
): Promise<TeacherClassOverallAnalysisResponse> {
  const res = await fetch("/api/teacher/analysis-class-overall-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classId }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`请求失败（${res.status}）`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: TeacherClassOverallAnalysisResponse | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const obj = JSON.parse(line) as ClassOverallStreamLine;
      if (obj.type === "complete") {
        if (typeof obj.id !== "number") {
          throw new Error("未收到分析记录 id，请更新后端后重试");
        }
        final = {
          ok: true,
          id: obj.id,
          markdown: obj.markdown,
          structured: obj.structured,
          raw: obj.raw,
        };
      } else if (obj.type === "error") {
        throw new Error(
          typeof obj.message === "string" ? obj.message : "生成失败",
        );
      } else {
        onProgress(obj);
      }
    }
  }
  if (!final) {
    throw new Error("未收到完整分析结果");
  }
  return final;
}
