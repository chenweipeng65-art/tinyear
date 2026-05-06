/**
 * 幼儿姓名脱敏：2 字「张三」→「张*」；3 字及以上「张霞光」→「张*光」（首尾 + 中间 *）。
 */
export function maskChildDisplayName(fullName: string): string {
  const s = fullName.trim();
  const chars = Array.from(s);
  const len = chars.length;
  if (len === 0) return "*";
  if (len === 1) return `${chars[0]}*`;
  if (len === 2) return `${chars[0]}*`;
  return `${chars[0]}*${chars[len - 1]}`;
}
