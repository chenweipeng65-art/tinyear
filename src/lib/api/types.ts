import type { ArchiveRecord } from "@/types/archiveRecord";

export type SchoolClassDto = {
  id: number;
  name: string;
  gradeBand: string;
  schoolYear: string | null;
  /** 管理端指定的教师端/家长端默认班级（全园最多一个为 true） */
  defaultForTeacher: boolean;
};

export type ClassesResponse = { items: SchoolClassDto[] };

export type ChildListItemDto = {
  id: number;
  /** 实名；家长端匹配与展示用 */
  displayName: string;
  /** 脱敏名；教师端下拉与列表展示用 */
  displayNameMasked: string;
  archiveCount: number;
  /** 头像地址；未上传时为 null，前端用姓名占位 */
  avatarUrl: string | null;
};

export type ChildrenResponse = { items: ChildListItemDto[] };

/** 与 `ArchiveRecord` 字段一致（§2.4.3） */
export type ArchiveItemsResponse = { items: ArchiveRecord[] };

export type IndividualAnalysisListItemDto = {
  id: number;
  createdAt: string;
  /** 含定界 JSON 的完整模型输出，前端用 splitIndividualAnalysisOutput 解析 */
  contentMarkdown: string;
};

export type IndividualAnalysesResponse = { items: IndividualAnalysisListItemDto[] };

export type ClassAnalysisListItemDto = {
  id: number;
  createdAt: string;
  contentMarkdown: string;
};

export type ClassAnalysesResponse = { items: ClassAnalysisListItemDto[] };
