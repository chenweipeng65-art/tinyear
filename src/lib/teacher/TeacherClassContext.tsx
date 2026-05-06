import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchClasses } from "@/lib/api/readData";
import type { SchoolClassDto } from "@/lib/api/types";

const STORAGE_KEY = "teacher_selected_class_id";

type TeacherClassContextValue = {
  /** 教师端可见班级（与 GET /api/classes 一致） */
  classes: SchoolClassDto[];
  /** 当前选用班级 id；无可见班级时为 null */
  selectedClassId: number | null;
  setSelectedClassId: (id: number) => void;
  loading: boolean;
  reload: () => Promise<void>;
};

const TeacherClassContext = createContext<TeacherClassContextValue | null>(null);

export function TeacherClassProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<SchoolClassDto[]>([]);
  const [selectedClassId, setSelectedClassIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const applySelection = useCallback((items: SchoolClassDto[]) => {
    if (items.length === 0) {
      setSelectedClassIdState(null);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
    const fromStore = raw != null ? Number.parseInt(raw, 10) : NaN;
    const validStored = Number.isFinite(fromStore) && items.some((c) => c.id === fromStore);
    const defaultItem = items.find((c) => c.defaultForTeacher) ?? items[0];
    const next = validStored ? fromStore : defaultItem.id;
    setSelectedClassIdState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await fetchClasses();
      setClasses(items);
      applySelection(items);
    } catch {
      setClasses([]);
      setSelectedClassIdState(null);
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setSelectedClassId = useCallback((id: number) => {
    setSelectedClassIdState(id);
    try {
      sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      classes,
      selectedClassId,
      setSelectedClassId,
      loading,
      reload,
    }),
    [classes, selectedClassId, setSelectedClassId, loading, reload],
  );

  return <TeacherClassContext.Provider value={value}>{children}</TeacherClassContext.Provider>;
}

export function useTeacherClass(): TeacherClassContextValue {
  const ctx = useContext(TeacherClassContext);
  if (!ctx) {
    throw new Error("useTeacherClass must be used within TeacherClassProvider");
  }
  return ctx;
}
