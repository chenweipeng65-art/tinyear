import {
  INDIVIDUAL_RADAR_DIMENSION_KEYS,
  INDIVIDUAL_RADAR_LABEL_SHORT_ZH,
  type IndividualRadarDimensionKey,
} from "../../../ai/txt-ai/lib/aiAnalysisReports";

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, n));
}

function radarPoints(
  scores: Partial<Record<IndividualRadarDimensionKey, number>> | Record<string, number>,
  keys: readonly IndividualRadarDimensionKey[],
  cx: number,
  cy: number,
  maxR: number,
): string {
  const n = keys.length;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = clampScore(Number(scores[keys[i] as string] ?? 0));
    const r = (v / 5) * maxR;
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
  }
  return pts.join(" ");
}

type IndividualRadarProps = {
  scores: Partial<Record<IndividualRadarDimensionKey, number>> | Record<string, number>;
};

/** 十维度 1～5 分雷达示意（SVG） */
function radarAxisLabel(key: IndividualRadarDimensionKey): string {
  const s = INDIVIDUAL_RADAR_LABEL_SHORT_ZH[key];
  return s.length > 4 ? s.slice(0, 4) : s;
}

export function IndividualRadarChart({ scores }: IndividualRadarProps) {
  const cx = 160;
  const cy = 160;
  const maxR = 92;
  const keys = INDIVIDUAL_RADAR_DIMENSION_KEYS;
  const poly = radarPoints(scores, keys, cx, cy, maxR);
  const grid = [1, 2, 3, 4, 5].map((step) => {
    const r = (step / 5) * maxR;
    const ringPts = keys
      .map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
        return `${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`;
      })
      .join(" ");
    return (
      <polygon
        key={step}
        points={ringPts}
        fill="none"
        stroke="rgb(182 199 234)"
        strokeWidth={step === 5 ? 1.2 : 0.6}
        opacity={0.85}
      />
    );
  });
  const spokes = keys.map((_, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    const x2 = cx + maxR * Math.cos(ang);
    const y2 = cy + maxR * Math.sin(ang);
    return (
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke="rgb(182 199 234 / 0.65)"
        strokeWidth={0.8}
      />
    );
  });
  const labels = keys.map((k, i) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    const lr = maxR + 30;
    const x = cx + lr * Math.cos(ang);
    const y = cy + lr * Math.sin(ang);
    const short = radarAxisLabel(k);
    return (
      <text
        key={k}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[rgb(70_88_130)]"
        style={{ fontSize: 10 }}
      >
        {short}
      </text>
    );
  });
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[rgb(182_199_234/0.5)] bg-[rgb(248_250_252)] p-3">
      <svg viewBox="0 0 320 320" className="mx-auto block h-auto max-h-[min(380px,88vw)] w-full max-w-[400px]">
        {grid}
        {spokes}
        <polygon
          points={poly}
          fill="rgb(145 172 224 / 0.35)"
          stroke="rgb(74 107 174)"
          strokeWidth={1.5}
        />
        {labels}
      </svg>
      <p className="mt-1 text-center text-[11px] text-slate-500">各维度 1～5 分示意（外圈为 5 分）</p>
    </div>
  );
}

type BarSeriesProps = {
  series: { label: string; value: number }[];
  /** 条最大宽度占容器的比例，默认按 5 分制 */
  maxValue?: number;
};

export function ScoreBarList({ series, maxValue = 5 }: BarSeriesProps) {
  return (
    <ul className="space-y-2 rounded-xl border border-[rgb(182_199_234/0.45)] bg-white p-3">
      {series.map((row) => {
        const w = (clampScore(row.value) / maxValue) * 100;
        return (
          <li key={row.label} className="space-y-0.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="min-w-0 flex-1 truncate pr-2">{row.label}</span>
              <span className="shrink-0 tabular-nums text-slate-800">{row.value.toFixed(1)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgb(236_241_250)]">
              <div
                className="h-full rounded-full bg-[rgb(125_155_210)] transition-[width] duration-500"
                style={{ width: `${w}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

type ClassStudentBarsProps = {
  items: { displayName: string; compositeScore: number }[];
};

/** 班级：每名幼儿综合分横向条 */
export function ClassStudentCompositeBars({ items }: ClassStudentBarsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
        暂无有个别化分析的幼儿，无法绘制对比柱条。
      </p>
    );
  }
  return (
    <ul className="space-y-2.5 rounded-xl border border-[rgb(182_199_234/0.45)] bg-white p-3">
      {items.map((row) => {
        const w = (clampScore(row.compositeScore) / 5) * 100;
        return (
          <li key={row.displayName} className="space-y-0.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="min-w-0 flex-1 truncate pr-2">{row.displayName}</span>
              <span className="shrink-0 tabular-nums font-medium text-[rgb(58_74_128)]">
                {row.compositeScore.toFixed(1)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(236_241_250)]">
              <div
                className="h-full rounded-full bg-[rgb(90_125_188)]"
                style={{ width: `${w}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
