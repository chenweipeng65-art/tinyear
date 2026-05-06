import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type MarkdownBodyProps = {
  markdown: string;
  className?: string;
};

/** 将模型返回的 Markdown 渲染为 HTML（Streamdown，样式见 index.css 引入） */
export function MarkdownBody({ markdown, className }: MarkdownBodyProps) {
  const text = markdown.trim();
  if (!text) {
    return <p className="text-sm text-slate-500">（无正文）</p>;
  }
  return (
    <div
      className={cn(
        "analysis-markdown text-sm leading-relaxed text-slate-800 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-1.5 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-1.5 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <Streamdown mode="static">{text}</Streamdown>
    </div>
  );
}
