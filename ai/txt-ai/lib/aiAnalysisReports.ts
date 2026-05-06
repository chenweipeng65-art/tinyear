/**
 * 个别化 / 班级整体分析：模型输出中结构化 JSON 的定界与解析（供前端雷达图、柱状图、表格绑定）
 */

export const INDIVIDUAL_ANALYSIS_JSON_START = "---BEGIN_INDIVIDUAL_ANALYSIS_JSON---";
export const INDIVIDUAL_ANALYSIS_JSON_END = "---END_INDIVIDUAL_ANALYSIS_JSON---";

export const CLASS_OVERALL_ANALYSIS_JSON_START = "---BEGIN_CLASS_OVERALL_ANALYSIS_JSON---";
export const CLASS_OVERALL_ANALYSIS_JSON_END = "---END_CLASS_OVERALL_ANALYSIS_JSON---";

/** 雷达图维度键（与 agent-one / agent-all 提示词一致，1～5 分整数） */
export const INDIVIDUAL_RADAR_DIMENSION_KEYS = [
  "learning_curiosity_interest",
  "learning_initiative_persistence",
  "learning_imagination_creativity",
  "learning_reflection_planning",
  "cooperation",
  "inquiry",
  "game_spirit",
  "game_environment",
  "game_quality_reflection",
  "teaching_verbal_support",
] as const;

export type IndividualRadarDimensionKey = (typeof INDIVIDUAL_RADAR_DIMENSION_KEYS)[number];

/** 与 radarScores 键一一对应的中文名（前端图例、校验模型 barSeries 标签时可用） */
export const INDIVIDUAL_RADAR_LABEL_ZH: Record<IndividualRadarDimensionKey, string> = {
  learning_curiosity_interest: "好奇心与学习兴趣",
  learning_initiative_persistence: "主动性与坚持专注",
  learning_imagination_creativity: "想象与创造",
  learning_reflection_planning: "反思解释与目标感",
  cooperation: "合作能力",
  inquiry: "探究能力",
  game_spirit: "游戏精神",
  game_environment: "游戏环境",
  game_quality_reflection: "游戏特点与质量",
  teaching_verbal_support: "教学与言语策略",
};

/** 雷达图轴标签用（最多 4 个汉字，避免 SVG 上挤不全） */
export const INDIVIDUAL_RADAR_LABEL_SHORT_ZH: Record<IndividualRadarDimensionKey, string> = {
  learning_curiosity_interest: "好奇兴趣",
  learning_initiative_persistence: "主动坚持",
  learning_imagination_creativity: "想象创造",
  learning_reflection_planning: "反思计划",
  cooperation: "合作能力",
  inquiry: "探究能力",
  game_spirit: "游戏精神",
  game_environment: "游戏环境",
  game_quality_reflection: "游戏特点",
  teaching_verbal_support: "教学言语",
};

export type IndividualAnalysisJson = {
  childDisplayName: string;
  /** 基于几条档案摘要（0～3） */
  basedOnSnippetCount: number;
  radarScores: Record<IndividualRadarDimensionKey, number>;
  /** 柱状图：可与雷达同维度或综合条，label 为中文短名 */
  barSeries: { label: string; value: number }[];
};

export type ClassStudentTableRow = {
  displayName: string;
  hasPortfolio: boolean;
  hasIndividualAnalysis: boolean;
};

export type ClassOverallAnalysisJson = {
  studentTable: ClassStudentTableRow[];
  /** 仅对有个别化分析的幼儿聚合后的班级均值（无分析幼儿不参与） */
  classRadarAverages: Partial<Record<IndividualRadarDimensionKey, number>> | Record<string, number>;
  /** 每名幼儿综合分（1～5），仅包含有个别化分析的幼儿 */
  barByStudent: { displayName: string; compositeScore: number }[];
  counts: { withIndividualAnalysis: number; totalStudents: number };
};

/** 判断个别化 JSON 是否含完整雷达维度（供班级整体分析前校验） */
export function hasCompleteIndividualRadarScores(
  json: IndividualAnalysisJson | null | undefined,
): boolean {
  if (!json?.radarScores) return false;
  for (const k of INDIVIDUAL_RADAR_DIMENSION_KEYS) {
    const v = json.radarScores[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return Array.isArray(json.barSeries);
}

/** 供班级整体分析 user 消息：仅雷达十维 + 柱状序列，避免塞入完整 Markdown */
export function compactIndividualChartsForOverallPrompt(
  json: IndividualAnalysisJson,
): string {
  return JSON.stringify(
    {
      radarScores: json.radarScores,
      barSeries: json.barSeries,
    },
    null,
    0,
  );
}

export function splitIndividualAnalysisOutput(raw: string): {
  markdown: string;
  json: IndividualAnalysisJson | null;
} {
  const i = raw.indexOf(INDIVIDUAL_ANALYSIS_JSON_START);
  const j = raw.indexOf(INDIVIDUAL_ANALYSIS_JSON_END);
  if (i === -1 || j === -1 || j <= i) {
    return { markdown: raw.trim(), json: null };
  }
  const markdown = raw.slice(0, i).trim();
  const jsonStr = raw.slice(i + INDIVIDUAL_ANALYSIS_JSON_START.length, j).trim();
  try {
    const json = JSON.parse(jsonStr) as IndividualAnalysisJson;
    return { markdown, json };
  } catch {
    return { markdown: raw.trim(), json: null };
  }
}

export function splitClassOverallAnalysisOutput(raw: string): {
  markdown: string;
  json: ClassOverallAnalysisJson | null;
} {
  const i = raw.indexOf(CLASS_OVERALL_ANALYSIS_JSON_START);
  const j = raw.indexOf(CLASS_OVERALL_ANALYSIS_JSON_END);
  if (i === -1 || j === -1 || j <= i) {
    return { markdown: raw.trim(), json: null };
  }
  const markdown = raw.slice(0, i).trim();
  const jsonStr = raw.slice(i + CLASS_OVERALL_ANALYSIS_JSON_START.length, j).trim();
  try {
    const json = JSON.parse(jsonStr) as ClassOverallAnalysisJson;
    return { markdown, json };
  } catch {
    return { markdown: raw.trim(), json: null };
  }
}
