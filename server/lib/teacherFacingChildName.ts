/** 教师端展示用幼儿姓名（脱敏）；空则回退实名 */
export function teacherFacingChildName(child: {
  displayName: string;
  displayNameMasked: string;
}): string {
  const m = child.displayNameMasked?.trim() ?? "";
  return m.length > 0 ? m : child.displayName;
}
