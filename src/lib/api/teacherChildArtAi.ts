/** 教师首页「分析解读」：根据已上传画作 URL 调用多模态模型；可选传入幼儿画语文案（含录音转写） */

export async function teacherAnalyzeChildArt(
  imageUrl: string,
  transcriptNote?: string,
  portfolioArchiveItemId?: number,
): Promise<string> {
  const res = await fetch("/api/teacher/child-art-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      ...(transcriptNote?.trim()
        ? { transcriptNote: transcriptNote.trim() }
        : {}),
      ...(portfolioArchiveItemId != null
        ? { portfolioArchiveItemId }
        : {}),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    analysis?: string;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.message ?? "分析失败");
  }
  return data.analysis ?? "";
}
