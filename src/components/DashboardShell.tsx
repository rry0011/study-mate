"use client";

import { useEffect, useState } from "react";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";

const MOBILE_BREAKPOINT = 768;

type DashboardShellProps = {
  children: React.ReactNode;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
};

export default function DashboardShell({
  children,
  role,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "#F8FAFC",
      }}
    >
      <Header onMenuClick={() => setSidebarOpen((current) => !current)} />

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          role={role}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            padding: "32px",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
