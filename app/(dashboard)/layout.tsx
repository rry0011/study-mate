"use client";

import { useState, useEffect } from "react";
import Header from "@/src/components/Header";
import Sidebar from "@/src/components/Sidebar";

const MOBILE_BREAKPOINT = 768;

export default function AppLayout({ children }: { children: React.ReactNode }) {
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

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <>
        <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#F8FAFC" }}>
          
            <Header onMenuClick={toggleSidebar} />

          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: "32px" }}>
              {children}
            </main>

          </div>
        </div>
    </>
  );
}