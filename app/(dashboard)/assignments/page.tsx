import Link from "next/link";
import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/session";

function formatDueAt(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export default async function AssignmentsPage() {
  const session = await requireAuth();
  const isStudent = session.user.role === "STUDENT";
  const assignments = await prisma.assignment.findMany({
    where: isStudent
      ? { course: { enrollments: { some: { userId: session.user.id } } } }
      : session.user.role === "ADMIN"
        ? {}
        : { course: { instructorId: session.user.id } },
    include: {
      course: { select: { title: true, term: { select: { name: true } } } },
      submissions: {
        where: isStudent ? { userId: session.user.id } : undefined,
        select: { status: true },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  return (
    <section style={{ maxWidth: 1050, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div>
          <p style={{ color: "#6366F1", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            {isStudent ? "学習" : "教師メニュー"}
          </p>
          <h1 style={{ fontSize: 28, color: "#0F172A" }}>課題一覧</h1>
        </div>
        {!isStudent && (
          <Link href="/teacher/assignments" style={buttonLinkStyle}>課題を管理・作成</Link>
        )}
      </div>
      <p style={{ color: "#64748B", marginBottom: 20 }}>
        {isStudent ? "受講中の授業の課題と提出状況を確認できます。" : "担当授業の課題と提出状況を確認できます。"}
      </p>

      {assignments.length === 0 ? (
        <article style={panelStyle}>
          {isStudent ? "現在、受講中の授業に課題はありません。" : "管理できる課題はありません。"}
        </article>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {assignments.map((assignment) => {
            const submission = assignment.submissions[0];
            return (
              <article key={assignment.id} style={panelStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div>
                    <p style={{ color: "#6366F1", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>
                      {assignment.course.term.name} ・ {assignment.course.title}
                    </p>
                    <h2 style={{ fontSize: 18, marginBottom: 6 }}>{assignment.title}</h2>
                    <p style={{ color: "#64748B", fontSize: 13 }}>
                      提出期限: {formatDueAt(assignment.dueAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {isStudent ? (
                      <p style={{ color: submission?.status === "GRADED" ? "#15803D" : "#475569", fontSize: 13, marginBottom: 9 }}>
                        {submission?.status === "GRADED" ? "返却済み" : submission ? "提出済み" : "未提出"}
                      </p>
                    ) : (
                      <p style={{ color: "#475569", fontSize: 13, marginBottom: 9 }}>
                        提出 {assignment.submissions.filter((item) => item.status !== "PENDING").length} 件
                      </p>
                    )}
                    <Link href={`/assignments/${assignment.id}`} style={buttonLinkStyle}>
                      {isStudent ? "課題を開く" : "確認・返却"}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
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
const buttonLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 8,
  background: "#4F46E5",
  color: "#FFFFFF",
  padding: "9px 13px",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  whiteSpace: "nowrap",
};
