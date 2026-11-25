import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";

export default async function GradesPage() {
  const session = await requireRole("STUDENT", "INSTRUCTOR", "ADMIN");
  if (session.user.role !== "STUDENT") redirect("/teacher/lessons");
  const evaluations = await prisma.courseEvaluation.findMany({
    where: {
      studentId: session.user.id,
      course: { evaluationsPublishedAt: { not: null } },
    },
    include: {
      course: {
        select: {
          title: true,
          term: { select: { name: true } },
          evaluationsPublishedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <section style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, color: "#0F172A", marginBottom: 8 }}>成績・評価</h1>
      <p style={{ color: "#64748B", marginBottom: 20 }}>教師が確定した授業評価を確認できます。</p>
      {evaluations.length === 0 ? (
        <article style={panelStyle}>公開済みの評価はまだありません。</article>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {evaluations.map(({ id, score, course }) => (
            <article key={id} style={{ ...panelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <p style={{ color: "#6366F1", fontSize: 12, fontWeight: 700, marginBottom: 5 }}>{course.term.name}</p>
                <h2 style={{ fontSize: 17 }}>{course.title}</h2>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, whiteSpace: "nowrap" }}>{score}<small style={{ color: "#64748B", fontSize: 13 }}> / 100点</small></p>
            </article>
          ))}
        </div>
      )}
      <p style={{ marginTop: 18 }}><Link href="/dashboard" style={linkStyle}>ダッシュボードへ戻る</Link></p>
    </section>
  );
}

const panelStyle: CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const linkStyle: CSSProperties = { color: "#4F46E5", textDecoration: "none" };
