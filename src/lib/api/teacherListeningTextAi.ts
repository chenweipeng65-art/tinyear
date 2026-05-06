export type ListeningTextAiKind = "teacher_support" | "parent_guidance";

export async function teacherListeningTextAi(
  kind: ListeningTextAiKind,
  input: {
    transcriptNote: string;
    analysisInterpretation: string;
    sectionHint?: string;
    /** 与表征图上传返回的档案记录 id；有则写入支持策略或家长指导栏位（个性发展摘要在「保存记录」时生成） */
    portfolioArchiveItemId?: number;
  },
): Promise<string> {
  const res = await fetch("/api/teacher/listening-text-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      transcriptNote: input.transcriptNote,
      analysisInterpretation: input.analysisInterpretation,
      ...(input.sectionHint?.trim()
        ? { sectionHint: input.sectionHint.trim() }
        : {}),
      ...(input.portfolioArchiveItemId != null
        ? { portfolioArchiveItemId: input.portfolioArchiveItemId }
        : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    text?: string;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? "生成失败");
  }
  return data.text ?? "";
}
