import Link from "next/link";
import type { CSSProperties } from "react";
import { toTokyoDateTimeLocal } from "@/src/lib/assignment-date";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";
import { createAssignment } from "../../assignments/actions";

export default async function TeacherAssignmentsPage() {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const courses = await prisma.course.findMany({
    where: session.user.role === "ADMIN" ? {} : { instructorId: session.user.id },
    select: { id: true, title: true, term: { select: { name: true } } },
    orderBy: { title: "asc" },
  });
  const assignments = await prisma.assignment.findMany({
    where: session.user.role === "ADMIN"
      ? {}
      : { course: { instructorId: session.user.id } },
    include: {
      course: {
        select: {
          title: true,
          term: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
      },
      submissions: { select: { status: true } },
    },
    orderBy: { dueAt: "asc" },
  });
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  defaultDueDate.setHours(23, 59, 0, 0);

  return (
    <section style={{ maxWidth: 1050, margin: "0 auto" }}>
      <p style={{ color: "#6366F1", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>教師メニュー</p>
      <h1 style={{ fontSize: 28, color: "#0F172A", marginBottom: 8 }}>課題管理</h1>
      <p style={{ color: "#64748B", marginBottom: 20 }}>
        担当授業の課題を作成し、提出物の確認・返却を行います。
      </p>

      <article style={panelStyle}>
        <h2 style={headingStyle}>課題を作成</h2>
        {courses.length === 0 ? (
          <p style={mutedStyle}>先に授業を作成してください。</p>
        ) : (
          <form action={createAssignment} style={{ display: "grid", gap: 12 }}>
            <label style={labelStyle}>
              対象授業
              <select name="courseId" required style={inputStyle} defaultValue={courses[0].id}>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.term.name} ・ {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              課題名
              <input name="title" required maxLength={200} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              課題の説明
              <textarea name="description" rows={4} maxLength={10000} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              提出期限
              <input
                type="datetime-local"
                name="dueAt"
                required
                defaultValue={toTokyoDateTimeLocal(defaultDueDate)}
                style={inputStyle}
              />
            </label>
            <button type="submit" style={buttonStyle}>課題を作成して受講生に公開</button>
          </form>
        )}
      </article>

      <h2 style={{ ...headingStyle, marginTop: 24 }}>作成した課題</h2>
      {assignments.length === 0 ? (
        <article style={panelStyle}>
          <p style={mutedStyle}>まだ課題はありません。</p>
        </article>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {assignments.map((assignment) => (
            <article key={assignment.id} style={{ ...panelStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div>
                <p style={{ color: "#6366F1", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {assignment.course.term.name} ・ {assignment.course.title}
                </p>
                <h3 style={{ fontSize: 16, marginBottom: 5 }}>{assignment.title}</h3>
                <p style={mutedStyle}>
                  提出 {assignment.submissions.filter((item) => item.status !== "PENDING").length} 件 / 全 {assignment.course._count.enrollments} 件
                </p>
              </div>
              <Link href={`/assignments/${assignment.id}`} style={buttonLinkStyle}>提出を確認</Link>
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
  marginBottom: 12,
};
const headingStyle: CSSProperties = { fontSize: 18, marginBottom: 14, color: "#0F172A" };
const labelStyle: CSSProperties = { display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 600 };
const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  padding: "9px 10px",
  color: "#0F172A",
  font: "inherit",
};
const buttonStyle: CSSProperties = {
  justifySelf: "start",
  border: 0,
  borderRadius: 8,
  background: "#4F46E5",
  color: "#FFFFFF",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
};
const buttonLinkStyle: CSSProperties = {
  ...buttonStyle,
  display: "inline-flex",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
const mutedStyle: CSSProperties = { color: "#64748B", fontSize: 13 };
