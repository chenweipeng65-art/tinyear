export type ListeningTranscribeDialogueResponse = {
  ok: true;
  rawTranscript: string;
  formattedText: string;
  message?: string;
};

export async function teacherListeningTranscribeDialogue(
  audioBlob: Blob,
  childId: number,
): Promise<ListeningTranscribeDialogueResponse> {
  const fd = new FormData();
  fd.append("audio", audioBlob, "recording.webm");
  fd.append("childId", String(childId));
  const res = await fetch("/api/teacher/listening-transcribe-dialogue", {
    method: "POST",
    body: fd,
  });
  const data = (await res.json()) as ListeningTranscribeDialogueResponse & {
    ok?: boolean;
    message?: string;
    rawTranscript?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(typeof data.message === "string" ? data.message : `请求失败（${res.status}）`);
  }
  return data as ListeningTranscribeDialogueResponse;
}
