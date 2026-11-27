import Link from "next/link";
import type { CSSProperties } from "react";
import { openNotification } from "./actions";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/session";

const categoryLabels = {
  ASSIGNMENT: "課題",
  MESSAGE: "メッセージ",
  ACHIEVEMENT: "実績",
  LESSON: "授業",
  DEADLINE: "提出期限",
  OVERDUE: "期限超過",
} as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export default async function NotificationsPage() {
  const session = await requireAuth();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((notification) => !notification.read);
  const read = notifications.filter((notification) => notification.read);

  return (
    <section style={{ maxWidth: 850, margin: "0 auto" }}>
      <p style={{ color: "#6366F1", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>通知</p>
      <h1 style={{ fontSize: 28, color: "#0F172A", marginBottom: 20 }}>お知らせ一覧</h1>

      <h2 style={headingStyle}>未読（{unread.length}件）</h2>
      {unread.length === 0 ? (
        <article style={panelStyle}><p style={mutedStyle}>未読のお知らせはありません。</p></article>
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {unread.map((notification) => (
            <article key={notification.id} style={panelStyle}>
              <p style={categoryStyle}>{categoryLabels[notification.type]}</p>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{notification.title}</h3>
              <p style={{ color: "#475569", whiteSpace: "pre-wrap", marginBottom: 8 }}>{notification.body}</p>
              <p style={{ ...mutedStyle, marginBottom: 12 }}>{formatDate(notification.createdAt)}</p>
              <form action={openNotification}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <button type="submit" style={buttonStyle}>既読にして開く</button>
              </form>
            </article>
          ))}
        </div>
      )}

      <h2 style={headingStyle}>閲覧済みの履歴</h2>
      {read.length === 0 ? (
        <article style={panelStyle}><p style={mutedStyle}>閲覧済みのお知らせはありません。</p></article>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {read.map((notification) => (
            <article key={notification.id} style={{ ...panelStyle, padding: 14, background: "#F8FAFC" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, marginBottom: 4 }}>{notification.title}</h3>
                  <p style={{ color: "#64748B", fontSize: 13, marginBottom: 6 }}>{notification.body}</p>
                  <p style={mutedStyle}>{formatDate(notification.createdAt)}</p>
                </div>
                {notification.href && (
                  <Link href={notification.href} style={historyLinkStyle}>開く</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 18,
};
const headingStyle: CSSProperties = { fontSize: 18, color: "#0F172A", margin: "20px 0 10px" };
const categoryStyle: CSSProperties = { color: "#6366F1", fontSize: 11, fontWeight: 700, marginBottom: 5 };
const mutedStyle: CSSProperties = { color: "#94A3B8", fontSize: 12 };
const buttonStyle: CSSProperties = {
  border: 0,
  borderRadius: 8,
  background: "#4F46E5",
  color: "#FFFFFF",
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};
const historyLinkStyle: CSSProperties = { color: "#4F46E5", fontSize: 13, textDecoration: "none", flexShrink: 0 };
