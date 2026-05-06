import { useCallback, useEffect, useState } from "react";
import type { ArchiveRecord } from "@/types/archiveRecord";
import { useTeacherClass } from "@/lib/teacher/TeacherClassContext";
import { fetchArchiveItemsForChild, fetchChildrenInClass } from "@/lib/api/readData";

export type StudentSelectOption = {
  value: string;
  label: string;
  count?: number;
  avatarUrl?: string | null;
  childId?: number;
};

type UseChildDropdownOptionsArgs = {
  emptyLabel?: string;
};

export function useChildDropdownOptions(args: UseChildDropdownOptionsArgs = {}) {
  const emptyLabel = args.emptyLabel ?? "选择幼儿";
  const { selectedClassId, loading: classLoading } = useTeacherClass();
  const [options, setOptions] = useState<StudentSelectOption[]>([{ value: "", label: emptyLabel }]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedClassId == null) {
        setOptions([{ value: "", label: emptyLabel }]);
        return;
      }
      const data = await fetchChildrenInClass(selectedClassId);
      setOptions([
        { value: "", label: emptyLabel },
        ...data.items.map((c) => ({
          value: String(c.id),
          label: c.displayNameMasked?.trim() ? c.displayNameMasked : c.displayName,
          count: c.archiveCount,
          avatarUrl: c.avatarUrl,
          childId: c.id,
        })),
      ]);
    } catch {
      setOptions([{ value: "", label: emptyLabel }]);
    } finally {
      setLoading(false);
    }
  }, [emptyLabel, selectedClassId]);

  useEffect(() => {
    if (classLoading) return;
    void load();
  }, [load, classLoading]);

  return { options, loading: loading || classLoading, reload: load };
}

export type MatchedChildBrief = { id: number; displayName: string; avatarUrl: string | null };

export type UseArchiveRecordsByClassOptions = {
  /** 为 true 时不请求（例如教师端班级列表尚未就绪） */
  suspendWhile?: boolean;
};

/**
 * 按「班级 id + 幼儿标识」拉取档案：教师端传幼儿 id 字符串，家长端传 displayName。
 */
export function useArchiveRecordsByClass(
  /**
   * 教师端：班内幼儿 id 的字符串（与下拉框 value 一致，仅数字）。
   * 家长端：幼儿 displayName（与登录写入的姓名一致）。
   */
  selectedChildKey: string,
  classId: number | null,
  options: UseArchiveRecordsByClassOptions = {},
) {
  const suspendWhile = options.suspendWhile ?? false;
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchedChild, setMatchedChild] = useState<MatchedChildBrief | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!selectedChildKey || classId == null || suspendWhile) {
      setRecords([]);
      setMatchedChild(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setMatchedChild(null);
    (async () => {
      try {
        const { items: children } = await fetchChildrenInClass(classId);
        const key = selectedChildKey.trim();
        const byId = /^\d+$/.test(key);
        const child = byId
          ? children.find((c) => String(c.id) === key)
          : children.find((c) => c.displayName === key);
        if (!child) {
          if (!cancelled) {
            setRecords([]);
            setMatchedChild(null);
          }
          return;
        }
        if (!cancelled) {
          setMatchedChild({
            id: child.id,
            displayName: byId
              ? child.displayNameMasked?.trim()
                ? child.displayNameMasked
                : child.displayName
              : child.displayName,
            avatarUrl: child.avatarUrl,
          });
        }
        const { items } = await fetchArchiveItemsForChild(child.id);
        if (!cancelled) setRecords(items);
      } catch {
        if (!cancelled) {
          setRecords([]);
          setMatchedChild(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedChildKey, classId, suspendWhile, reloadTick]);

  const reloadChildAndRecords = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  return { records, loading: loading || suspendWhile, matchedChild, reloadChildAndRecords };
}

export function useArchiveRecordsForStudent(selectedChildIdStr: string) {
  const { selectedClassId, loading: classLoading } = useTeacherClass();
  return useArchiveRecordsByClass(selectedChildIdStr, selectedClassId, {
    suspendWhile: classLoading,
  });
}
