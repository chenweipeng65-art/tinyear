/** 与 `GET /api/children/:id/archive-items` 返回的 `items[]` 字段一致（§2.4.3） */
export type ArchiveRecord = {
  id: number;
  title: string;
  date: string;
  /** 画语图 URL（`childArtImageUrl`） */
  image: string;
  /** 档案小结 */
  content: string;
  /** 与 `parentGuidanceAdvice` 相同，兼容家长端旧字段名 */
  educationSuggestion: string;
  recordingTranscript: string;
  analysisInterpretation: string;
  teacherSupportStrategies: string;
  parentGuidanceAdvice: string;
  teacherReflection: string;
};
