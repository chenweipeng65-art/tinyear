export type LiveAssistantChunkResponse = {
  ok: true;
  transcript: string;
  suggestion: string;
};

export async function teacherLiveAssistantChunk(
  audioBlob: Blob,
  childDisplayName: string,
): Promise<LiveAssistantChunkResponse> {
  const fd = new FormData();
  fd.append("audio", audioBlob, "chunk.webm");
  fd.append("childDisplayName", childDisplayName);
  const res = await fetch("/api/teacher/live-assistant-chunk", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json()) as LiveAssistantChunkResponse & {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `请求失败（${res.status}）`);
  }
  return data as LiveAssistantChunkResponse;
}
