"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
};

const navItems: NavItem[] = [
  {
    label: "ダッシュボード",
    href: "/",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "コース一覧",
    href: "/courses",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: "課題・提出",
    href: "/assignments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    badge: 3,
  },
  {
    label: "学習カレンダー",
    href: "/calendar",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "成績・レポート",
    href: "/grades",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "質問・フォーラム",
    href: "/forum",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    badge: 12,
  },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
};

const adminItems: NavItem[] = [
  {
    label: "ユーザー管理",
    href: "../users",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "学校・学期管理",
    href: "../schools",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

const MOBILE_BREAKPOINT = 768;

const NavLink = ({ item, isActive }: { item: NavItem; isActive: boolean }) => (
  <Link
    href={item.href}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "9px 10px",
      borderRadius: "8px",
      marginBottom: "2px",
      color: isActive ? "#6366F1" : "#475569",
      background: isActive ? "#EEF2FF" : "transparent",
      textDecoration: "none",
      fontFamily: "'Inter', sans-serif",
      fontSize: "14px",
      fontWeight: isActive ? 600 : 400,
      transition: "background 0.15s, color 0.15s",
    }}
  >
    <span style={{ flexShrink: 0 }}>{item.icon}</span>
    <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
    {item.badge && (
      <span
        style={{
          background: isActive ? "#6366F1" : "#E2E8F0",
          color: isActive ? "white" : "#64748B",
          fontSize: "11px",
          fontWeight: 600,
          padding: "1px 7px",
          borderRadius: "999px",
        }}
      >
        {item.badge}
      </span>
    )}
  </Link>
)

const SectionLabel = ({ label }: { label: string }) => (
  <p
    style={{
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.08em",
      color: "#94A3B8",
      textTransform: "uppercase",
      padding: "0 8px",
      marginBottom: "6px",
    }}
  >
    {label}
  </p>
);

export default function Sidebar({ open, onClose, role }: SidebarProps) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isAdmin = role === "ADMIN";

  return (
    <>
      {/* モバイル用オーバーレイ */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.3)",
            zIndex: 49,
            backdropFilter: "blur(2px)",
          }}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        style={{
          position: "sticky",
          top: 0,
          height: "calc(100vh - 64px)",
          width: "260px",
          background: "#F8FAFC",
          borderRight: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 50,
        }}
        className="sidebar"
      >
        <nav style={{ padding: "16px 12px 0", flex: 1, overflowY: "auto" }}>
          <SectionLabel label="メニュー" />
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={pathname === item.href} />
          ))}

          {/* 管理者メニュー */}
          {isAdmin && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ margin: "0 8px 8px", height: "1px", background: "#E2E8F0" }} />
              <SectionLabel label="管理者メニュー" />
              {adminItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname.startsWith(item.href)}
                />
              ))}
            </div>
          )}
        </nav>

        {/* User profile */}
        <div
          style={{
            padding: "16px 12px",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366F1, #22D3EE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "13px",
              fontWeight: 700,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              flexShrink: 0,
            }}
          >
            田
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              田中 太郎
            </p>
            <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              tanaka@example.com
            </p>
          </div>
        </div>
      </aside>

      {/* レスポンシブ */}
      <style>{`
        .sidebar {
          position: sticky;
          top: 0;
          height: calc(100vh - 65px);
          transform: translateX(0);
          transition: transform 0.25s ease;
        }

        @media (max-width: 767px) {
          .sidebar {
            position: fixed;
            top: 64px;
            left: 0;
            height: calc(100vh - 65px);
            transform: translateX(${open ? "0" : "-100%"});
            box-shadow: 4px 0 24px rgba(0,0,0,0.12);
          }
        }
      `}</style>
    </>
  );
}