import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";
import { publishEvaluations } from "../../../actions";

export default async function ConfirmEvaluationsPage({
  params,
}: {
  params: Promise<{ course_id: string }>;
}) {
  const { course_id: courseId } = await params;
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const course = await prisma.course.findFirst({
    where: session.user.role === "ADMIN"
      ? { id: courseId }
      : { id: courseId, instructorId: session.user.id },
    include: {
      enrollments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  if (!course) notFound();
  if (course.evaluationsPublishedAt) redirect(`/teacher/lessons/${course.id}/evaluations`);

  const evaluations = await prisma.courseEvaluation.findMany({ where: { courseId } });
  const scoreByStudent = new Map(evaluations.map(({ studentId, score }) => [studentId, score]));
  const allScored = course.enrollments.length > 0 &&
    course.enrollments.every(({ userId }) => scoreByStudent.has(userId));
  if (!allScored) redirect(`/teacher/lessons/${course.id}/evaluations`);

  return (
    <section style={{ maxWidth: 800, margin: "0 auto" }}>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 4 }}>
        <Link href={`/teacher/lessons/${course.id}/evaluations`} style={linkStyle}>学生評価</Link> / 確認
      </p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>評価の確定</h1>
      <p style={{ color: "#64748B", marginBottom: 18 }}>
        {course.title}の評価を確認してください。確定後、各学生が自身の評価を閲覧できます。確定後の変更はできません。
      </p>
      <article style={panelStyle}>
        {course.enrollments.map(({ user }, index) => (
          <div key={user.id} style={rowStyle}>
            <span>{index + 1}. {user.name ?? user.email}</span>
            <strong>{scoreByStudent.get(user.id)} / 100点</strong>
          </div>
        ))}
        <form action={publishEvaluations} style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <input type="hidden" name="courseId" value={course.id} />
          <button type="submit" style={buttonStyle}>評価を確定して公開</button>
        </form>
      </article>
    </section>
  );
}

const panelStyle: CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };
const rowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 0", borderBottom: "1px solid #F1F5F9", color: "#334155" };
const linkStyle: CSSProperties = { color: "#4F46E5", textDecoration: "none" };
const buttonStyle: CSSProperties = { border: 0, borderRadius: 8, background: "#4F46E5", color: "#FFFFFF", padding: "10px 14px", cursor: "pointer", fontWeight: 600 };
