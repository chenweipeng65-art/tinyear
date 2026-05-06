/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import TeacherLayout from "./layouts/TeacherLayout";
import TeacherHome from "./pages/teacher/Home";
import TeacherAnalysis from "./pages/teacher/Analysis";
import TeacherPortfolio from "./pages/teacher/Portfolio";
import ParentLayout from "./layouts/ParentLayout";
import ParentLogin from "./pages/parent/Login";
import ParentDashboard from "./pages/parent/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import AdminLogin from "./pages/admin/Login";
import AdminClasses from "./pages/admin/Classes";
import AdminClassDetail from "./pages/admin/ClassDetail";
import { TeacherClassProvider } from "./lib/teacher/TeacherClassContext";
import { AppAlertProvider } from "./components/ui/AppAlertProvider";

const PARENT_OPEN_TARGETS = new Set([
  "/parent/login",
  "/parent",
  "/parent/dashboard",
]);

/** 根路径：若地址栏带 ?open= 则进家长端（分享链接），否则进教师首页 */
function RootRedirect() {
  const params = new URLSearchParams(window.location.search);
  const open = params.get("open");
  if (open && PARENT_OPEN_TARGETS.has(open)) {
    return <Navigate to={open} replace />;
  }
  return <Navigate to="/teacher/home" replace />;
}

/** 去掉 ?open=，避免地址栏长期带分享参数；仅处理浏览器地址栏中的 search，与 Hash 路由并存 */
function StripOpenQueryParam() {
  useEffect(() => {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("open")) return;
    u.searchParams.delete("open");
    window.history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`);
  }, []);
  return null;
}

export default function App() {
  return (
    <AppAlertProvider>
      <HashRouter>
        <StripOpenQueryParam />
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route
            path="/teacher"
            element={
              <TeacherClassProvider>
                <TeacherLayout />
              </TeacherClassProvider>
            }
          >
            <Route index element={<Navigate to="/teacher/home" replace />} />
            <Route path="home" element={<TeacherHome />} />
            <Route path="analysis" element={<TeacherAnalysis />} />
            <Route path="portfolio" element={<TeacherPortfolio />} />
          </Route>

          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/classes" replace />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="classes/:classId" element={<AdminClassDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/teacher/home" replace />} />
        </Routes>
      </HashRouter>
    </AppAlertProvider>
  );
}
