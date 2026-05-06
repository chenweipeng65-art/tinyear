/** 将幼儿画语 + 分析解读 + 本栏手写要点拼成用户消息（供三个文本智能体共用） */
export function formatListeningContextForAgents(input: {
  transcriptNote: string;
  analysisInterpretation: string;
  sectionHint?: string;
}): string {
  const t = input.transcriptNote.trim() || "（当前未填写幼儿画语 / 录音转写）";
  const a =
    input.analysisInterpretation.trim() || "（当前未填写分析解读）";
  const h = input.sectionHint?.trim() || "（本栏未填写额外要点）";
  return `# 幼儿画语（谈话记录、画作描述、录音转写等）\n${t}\n\n# 分析解读（对幼儿表征图的解读）\n${a}\n\n# 本栏教师已输入的要点（可选）\n${h}\n\n请严格依据系统角色与维度要求，结合以上材料生成输出。`;
}
