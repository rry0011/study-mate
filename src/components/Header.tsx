"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: "assignment" | "message" | "achievement";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const notifications: Notification[] = [
  {
    id: "1",
    type: "assignment",
    title: "課題の締め切りが近づいています",
    body: "「React Hooks 演習」の提出期限は明日です",
    time: "30分前",
    read: false,
  },
  {
    id: "2",
    type: "achievement",
    title: "バッジを獲得しました 🎉",
    body: "「7日間連続学習」達成おめでとうございます！",
    time: "2時間前",
    read: false,
  },
  {
    id: "3",
    type: "message",
    title: "講師からのフィードバック",
    body: "第3章の課題にコメントが届いています",
    time: "昨日",
    read: true,
  },
];

const notificationIcon = (type: Notification["type"]) => {
  const styles = {
    assignment: { bg: "#EEF2FF", color: "#6366F1" },
    message: { bg: "#F0FDF4", color: "#22C55E" },
    achievement: { bg: "#FFFBEB", color: "#F59E0B" },
  };
  const s = styles[type];
  return (
    <div
      style={{
        width: "34px",
        height: "34px",
        borderRadius: "50%",
        background: s.bg,
        color: s.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {type === "assignment" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )}
      {type === "message" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {type === "achievement" && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      )}
    </div>
  );
};

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const notifRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <header
      style={{
        height: "64px",
        background: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: "16px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {/* ハンバーガーメニュー（モバイルのみ表示） */}
        <button
          onClick={onMenuClick}
          className="header-hamburger"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#475569",
            padding: "6px",
            borderRadius: "6px",
            alignItems: "center",
          }}
          aria-label="メニューを開閉"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <style>{`
          .header-hamburger { display: none; }
          @media (max-width: 767px) { .header-hamburger { display: flex; } }
        `}</style>

        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "17px",
              color: "#0F172A",
              letterSpacing: "-0.3px",
              whiteSpace: "nowrap",
            }}
          >
            StudyMate
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "#E2E8F0", flexShrink: 0 }} />

      {/* Breadcrumb */}
      <nav
        style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
        aria-label="パンくずリスト"
      >
        <Link
          href="/dashboard"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#94A3B8", textDecoration: "none" }}
        >
          ダッシュボード
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>
          コース一覧
        </span>
      </nav>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: "440px", margin: "0 auto", position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: searchFocused ? "#FFFFFF" : "#F1F5F9",
            border: `1.5px solid ${searchFocused ? "#6366F1" : "transparent"}`,
            borderRadius: "10px",
            padding: "0 14px",
            transition: "background 0.15s, border-color 0.15s",
            boxShadow: searchFocused ? "0 0 0 3px rgba(99,102,241,0.12)" : "none",
          }}
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={searchFocused ? "#6366F1" : "#94A3B8"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "stroke 0.15s" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="コース・トピックを検索..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "#0F172A",
              padding: "10px 0",
            }}
          />
          {searchValue && (
            <button
              onClick={() => setSearchValue("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", padding: 0 }}
              aria-label="検索をクリア"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "11px",
              color: "#CBD5E1",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "4px",
              padding: "2px 5px",
              display: searchFocused || searchValue ? "none" : "block",
              flexShrink: 0,
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexShrink: 0 }}>
        {/* Daily streak */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 12px",
            background: "#FFFBEB",
            borderRadius: "999px",
            border: "1px solid #FDE68A",
          }}
        >
          <span style={{ fontSize: "14px" }}>🔥</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "13px", fontWeight: 700, color: "#D97706" }}>
            7日
          </span>
        </div>

        {/* Notification bell */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "9px",
              background: notifOpen ? "#EEF2FF" : "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: notifOpen ? "#6366F1" : "#475569",
              position: "relative",
              transition: "background 0.15s, color 0.15s",
            }}
            aria-label={`お知らせ（${unreadCount}件の未読）`}
            aria-expanded={notifOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  right: "6px",
                  width: "8px",
                  height: "8px",
                  background: "#EF4444",
                  borderRadius: "50%",
                  border: "2px solid white",
                }}
              />
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "340px",
                background: "white",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                overflow: "hidden",
                zIndex: 200,
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #F1F5F9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  お知らせ
                </span>
                {unreadCount > 0 && (
                  <button style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#6366F1", fontWeight: 500 }}>
                    すべて既読にする
                  </button>
                )}
              </div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "12px 16px",
                    background: n.read ? "white" : "#FAFBFF",
                    borderBottom: "1px solid #F1F5F9",
                    cursor: "pointer",
                  }}
                >
                  {notificationIcon(n.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: n.read ? 400 : 600, color: "#0F172A" }}>
                      {n.title}
                    </p>
                    <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.body}
                    </p>
                    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "#94A3B8" }}>
                      {n.time}
                    </p>
                  </div>
                  {!n.read && (
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366F1", flexShrink: 0, marginTop: "6px" }} />
                  )}
                </div>
              ))}
              <div style={{ padding: "10px 16px" }}>
                <Link href="/notifications" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#6366F1", textDecoration: "none", fontWeight: 500 }}>
                  すべて見る →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button
          style={{ width: "38px", height: "38px", borderRadius: "9px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}
          aria-label="ヘルプ"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>

        {/* Avatar */}
        <button
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)",
            border: "2px solid white",
            boxShadow: "0 0 0 2px #6366F1",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 700,
          }}
          aria-label="プロフィールメニュー"
        >
          田
        </button>
      </div>
    </header>
  );
}