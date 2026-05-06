/** 教师端：单条成长档案的保存与部分字段 PATCH */

export type SavePortfolioRecordBody = {
  teacherReflection: string;
  recordingTranscript: string;
  analysisInterpretation: string;
  teacherSupportStrategies: string;
  parentGuidanceAdvice: string;
  /** 首页日期 yyyy-MM-dd，与上传时观察日对齐或更正 */
  observedDay?: string;
};

export type SavePortfolioRecordResult = {
  ok?: boolean;
  snippetGenerated?: boolean;
  snippetMessage?: string;
  message?: string;
  error?: string;
};

/** 首页「保存记录」：合并写入各栏 + 个性发展摘要 AI */
export async function saveTeacherPortfolioRecord(
  id: number,
  body: SavePortfolioRecordBody,
): Promise<SavePortfolioRecordResult> {
  const res = await fetch(`/api/teacher/portfolio-archive-items/${id}/save-record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as SavePortfolioRecordResult;
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? data.error ?? "保存失败");
  }
  return data;
}

/** 仅更新反思或录音稿（不经由完整保存流程） */
export async function patchTeacherPortfolioArchiveItem(
  id: number,
  body: { teacherReflection?: string; recordingTranscript?: string },
): Promise<void> {
  const res = await fetch(`/api/teacher/portfolio-archive-items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? data.error ?? "保存失败");
  }
}
