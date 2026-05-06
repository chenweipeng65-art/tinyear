import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type SelectOptionItem = {
  value: string
  label: string
  /** 下拉项右侧圆形记录数，不传则不显示 */
  count?: number
  /** 与 `value` 为幼儿姓名时配套使用，供上传等接口 */
  childId?: number
}

export interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOptionItem[]
  placeholder?: string
  /** 外层容器，用于宽度等 */
  className?: string
  /** 合并到触发按钮上（覆盖默认边框/背景/圆角等） */
  triggerClassName?: string
  /** 合并到当前选中值展示文本上 */
  displayClassName?: string
  /** 合并到右侧下拉箭头上 */
  iconClassName?: string
  /**
   * 右侧独立图标栏：左侧竖线分隔 + 固定宽度（默认 w-11），与日期等控件的右侧留白对齐
   */
  splitEndAffix?: boolean
  /** 合并到右侧图标栏容器上 */
  endAffixClassName?: string
  /** 与 splitEndAffix 联用：更矮的触发器与较窄右侧栏（如首页姓名/日期行） */
  splitCompact?: boolean
  disabled?: boolean
  id?: string
  "aria-label"?: string
  tone?: "sky" | "emerald" | "analysis"
  size?: "default" | "sm"
}

const LIST_GAP = 4

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "请选择",
      className,
      triggerClassName,
      displayClassName,
      iconClassName,
      splitEndAffix = false,
      endAffixClassName,
      splitCompact = false,
      disabled,
      id,
      "aria-label": ariaLabel,
      tone = "sky",
      size = "default",
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)
    const listRef = React.useRef<HTMLUListElement>(null)
    const listId = React.useId()
    const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })

    const selected = options.find((o) => o.value === value)
    const display = selected?.label ?? placeholder

    const updatePosition = React.useCallback(() => {
      const btn = containerRef.current?.querySelector("button")
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      setCoords({
        top: rect.bottom + LIST_GAP,
        left: rect.left,
        width: rect.width,
      })
    }, [])

    React.useLayoutEffect(() => {
      if (!open) return
      updatePosition()
    }, [open, updatePosition])

    React.useEffect(() => {
      if (!open) return
      window.addEventListener("scroll", updatePosition, true)
      window.addEventListener("resize", updatePosition)
      return () => {
        window.removeEventListener("scroll", updatePosition, true)
        window.removeEventListener("resize", updatePosition)
      }
    }, [open, updatePosition])

    React.useEffect(() => {
      if (!open) return
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node
        if (containerRef.current?.contains(t) || listRef.current?.contains(t)) return
        setOpen(false)
      }
      document.addEventListener("mousedown", onDoc)
      return () => document.removeEventListener("mousedown", onDoc)
    }, [open])

    React.useEffect(() => {
      if (!open) return
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false)
      }
      document.addEventListener("keydown", onKey)
      return () => document.removeEventListener("keydown", onKey)
    }, [open])

    const focusRing =
      tone === "emerald"
        ? "focus-visible:border-emerald-400 focus-visible:ring-emerald-100"
        : tone === "analysis"
          ? "focus-visible:border-[rgb(140_158_200)] focus-visible:ring-[rgb(182_199_234/0.45)]"
          : "focus-visible:border-[rgb(140_158_200)] focus-visible:ring-[rgb(182_199_234/0.45)]"

    const selectedOption =
      tone === "emerald"
        ? "bg-emerald-50 font-medium text-emerald-800"
        : tone === "analysis"
          ? "bg-[rgb(182_199_234/0.4)] font-medium text-[rgb(58_74_128)]"
          : "bg-[rgb(182_199_234)] font-medium text-[rgb(48_62_108)]"

    const list = open && (
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: coords.top,
          left: coords.left,
          width: coords.width,
          zIndex: 100,
        }}
        className="max-h-56 overflow-auto rounded-lg border border-slate-200/90 bg-white py-1 shadow-lg ring-1 ring-slate-900/5"
      >
        {options.map((opt) => {
          const isSelected = opt.value === value
          return (
            <li
              key={opt.value === "" ? "__placeholder" : opt.value}
              role="option"
              aria-selected={isSelected}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onValueChange(opt.value)
                setOpen(false)
              }}
              className={cn(
                "cursor-pointer px-3 py-2.5 text-sm transition-colors",
                isSelected ? selectedOption : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="flex w-full min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate">{opt.label}</span>
                {opt.count != null && opt.value !== "" ? (
                  <span
                    className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-slate-200 px-1.5 text-[11px] font-medium tabular-nums text-slate-700"
                    aria-hidden
                  >
                    {opt.count}
                  </span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>
    )

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          ref={ref}
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return
            if (open) {
              setOpen(false)
              return
            }
            const btn = containerRef.current?.querySelector("button")
            if (btn) {
              const rect = btn.getBoundingClientRect()
              setCoords({
                top: rect.bottom + LIST_GAP,
                left: rect.left,
                width: rect.width,
              })
            }
            setOpen(true)
          }}
          className={cn(
            "flex w-full min-w-0 rounded-md border-2 border-slate-200 bg-white text-left text-sm transition-all",
            splitEndAffix
              ? "items-stretch gap-0"
              : "items-center justify-between gap-2",
            "focus-visible:outline-none focus-visible:ring-4",
            focusRing,
            "disabled:cursor-not-allowed disabled:opacity-50",
            !splitEndAffix && size === "sm" && "h-10 px-3 py-1.5",
            !splitEndAffix && size === "default" && "h-12 px-4 py-2",
            !selected && "text-slate-400",
            selected && "text-slate-800",
            triggerClassName
          )}
        >
          {splitEndAffix ? (
            <>
              <span
                className={cn(
                  "flex min-w-0 flex-1 items-center pr-2",
                  splitCompact
                    ? "min-h-9 py-1 pl-2.5"
                    : "min-h-12 py-2 pl-4"
                )}
              >
                <span className={cn("truncate text-left", displayClassName)}>{display}</span>
              </span>
              <span
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center self-stretch border-l border-[rgb(65_100_170)]",
                  splitCompact ? "w-9" : "w-11",
                  endAffixClassName
                )}
              >
                <span
                  className={cn(
                    "h-0 w-0 border-x-transparent border-t-[rgb(65_100_170)] transition-transform",
                    splitCompact ? "border-x-[3.5px] border-t-[5px]" : "border-x-[5px] border-t-[7px]",
                    open && "scale-y-[-1]"
                  )}
                  aria-hidden
                />
              </span>
            </>
          ) : (
            <>
              <span className={cn("truncate text-left", displayClassName)}>{display}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                  open && "rotate-180",
                  iconClassName
                )}
                aria-hidden
              />
            </>
          )}
        </button>
        {typeof document !== "undefined" && list ? createPortal(list, document.body) : null}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Select }
