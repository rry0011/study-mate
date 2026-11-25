import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";
import { saveEvaluation } from "../../actions";

const attendanceLabels: Record<string, string> = {
  ATTENDANCE: "出席",
  ABSENCE: "欠席",
  AUTHORIZED_ABSENCE: "公欠",
};

const submissionLabels: Record<string, string> = {
  PENDING: "未提出",
  SUBMITTED: "提出済み",
  GRADED: "採点済み",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" }).format(date);
}

export default async function CourseEvaluationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ course_id: string }>;
  searchParams: Promise<{ studentId?: string }>;
}) {
  const [{ course_id: courseId }, query, session] = await Promise.all([
    params,
    searchParams,
    requireRole("INSTRUCTOR", "ADMIN"),
  ]);
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

  const enrolledIds = course.enrollments.map(({ userId }) => userId);
  const evaluations = await prisma.courseEvaluation.findMany({
    where: { courseId, studentId: { in: enrolledIds } },
  });
  const evaluationByStudent = new Map(evaluations.map((evaluation) => [evaluation.studentId, evaluation]));
  const selectedStudent = course.enrollments.find(({ userId }) => userId === query.studentId);
  const [attendance, assignments] = selectedStudent
    ? await Promise.all([
        prisma.lessonAttendance.findMany({
          where: { userId: selectedStudent.userId, lesson: { courseId } },
          include: { lesson: { select: { date: true, period: true } } },
        }),
        prisma.assignment.findMany({
          where: { courseId },
          orderBy: { dueAt: "asc" },
          include: {
            submissions: {
              where: { userId: selectedStudent.userId },
              select: { status: true, score: true, submittedAt: true },
            },
          },
        }),
      ])
    : [[], []];
  const completedCount = course.enrollments.filter(({ userId }) => evaluationByStudent.has(userId)).length;

  return (
    <section style={{ maxWidth: 1050, margin: "0 auto" }}>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 4 }}>
        <Link href={`/teacher/lessons/${course.id}`} style={linkStyle}>{course.title}</Link> / 学生評価
      </p>
      <h1 style={{ fontSize: 28, color: "#0F172A", marginBottom: 8 }}>学生評価</h1>
      <p style={{ color: "#64748B", marginBottom: 20 }}>
        評価入力済み: {completedCount}/{course.enrollments.length}人
        {course.evaluationsPublishedAt ? " ・ 確定済み" : ""}
      </p>

      {course.enrollments.length === 0 ? (
        <article style={panelStyle}>受講者がいません。授業管理から学生を割り当ててください。</article>
      ) : (
        <>
          <form method="get" style={{ ...panelStyle, display: "flex", flexWrap: "wrap", alignItems: "end", gap: 10 }}>
            <label style={{ ...labelStyle, flex: "1 1 280px" }}>
              学生を選択
              <select name="studentId" defaultValue={selectedStudent?.userId ?? ""} required style={inputStyle}>
                <option value="" disabled>学生を選択してください</option>
                {course.enrollments.map(({ user }) => (
                  <option key={user.id} value={user.id}>{user.name ?? user.email}</option>
                ))}
              </select>
            </label>
            <button type="submit" style={buttonStyle}>学生情報を表示</button>
          </form>

          {selectedStudent && (
            <article style={panelStyle}>
              <h2 style={headingStyle}>{selectedStudent.user.name ?? selectedStudent.user.email}</h2>
              <p style={{ color: "#64748B", fontSize: 13, marginBottom: 18 }}>{selectedStudent.user.email}</p>

              <h3 style={subheadingStyle}>出欠情報</h3>
              {attendance.length === 0 ? (
                <p style={mutedStyle}>出欠情報はまだありません。</p>
              ) : (
                <div style={{ display: "grid", gap: 7, marginBottom: 20 }}>
                  {attendance
                    .sort((a, b) => a.lesson.date.getTime() - b.lesson.date.getTime() || a.lesson.period - b.lesson.period)
                    .map((item) => (
                      <div key={item.id} style={dataRowStyle}>
                        <span>{formatDate(item.lesson.date)}・第{item.lesson.period}時限</span>
                        <strong>{item.status ? attendanceLabels[item.status] : "未記録"}</strong>
                      </div>
                    ))}
                </div>
              )}

              <h3 style={subheadingStyle}>課題の提出状況・得点</h3>
              {assignments.length === 0 ? (
                <p style={mutedStyle}>課題はありません。</p>
              ) : (
                <div style={{ display: "grid", gap: 7, marginBottom: 20 }}>
                  {assignments.map((assignment) => {
                    const submission = assignment.submissions[0];
                    return (
                      <div key={assignment.id} style={dataRowStyle}>
                        <span>
                          {assignment.title}
                          <small style={{ display: "block", color: "#64748B" }}>期限: {formatDate(assignment.dueAt)}</small>
                        </span>
                        <span style={{ textAlign: "right" }}>
                          {submission ? submissionLabels[submission.status] : "未提出"}
                          {submission?.score !== null && submission?.score !== undefined && ` ・ ${submission.score}点`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <form action={saveEvaluation} style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="studentId" value={selectedStudent.userId} />
                <label style={{ ...labelStyle, maxWidth: 280, marginBottom: 12 }}>
                  評価（100点満点）
                  <input
                    type="number"
                    name="score"
                    min={0}
                    max={100}
                    step={1}
                    required
                    defaultValue={evaluationByStudent.get(selectedStudent.userId)?.score}
                    disabled={Boolean(course.evaluationsPublishedAt)}
                    style={inputStyle}
                  />
                </label>
                {course.evaluationsPublishedAt ? (
                  <p style={mutedStyle}>この授業の評価は確定済みのため変更できません。</p>
                ) : (
                  <button type="submit" style={buttonStyle}>評価を保存</button>
                )}
              </form>
            </article>
          )}

          {completedCount === course.enrollments.length && completedCount > 0 && !course.evaluationsPublishedAt && (
            <div style={{ ...panelStyle, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span>全員の評価が入力されました。確定前に一覧を確認してください。</span>
              <Link href={`/teacher/lessons/${course.id}/evaluations/confirm`} style={buttonLinkStyle}>評価を確認</Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const panelStyle: CSSProperties = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, marginBottom: 14 };
const headingStyle: CSSProperties = { fontSize: 19, marginBottom: 4 };
const subheadingStyle: CSSProperties = { fontSize: 15, margin: "18px 0 9px" };
const labelStyle: CSSProperties = { display: "grid", gap: 6, color: "#475569", fontSize: 13, fontWeight: 600 };
const inputStyle: CSSProperties = { width: "100%", border: "1px solid #CBD5E1", borderRadius: 8, background: "#FFFFFF", padding: "9px 10px", color: "#0F172A", font: "inherit" };
const buttonStyle: CSSProperties = { border: 0, borderRadius: 8, background: "#4F46E5", color: "#FFFFFF", padding: "9px 13px", cursor: "pointer", fontWeight: 600 };
const buttonLinkStyle: CSSProperties = { ...buttonStyle, textDecoration: "none", display: "inline-flex" };
const linkStyle: CSSProperties = { color: "#4F46E5", textDecoration: "none" };
const mutedStyle: CSSProperties = { color: "#64748B", fontSize: 13 };
const dataRowStyle: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", borderBottom: "1px solid #F1F5F9", padding: "8px 0", color: "#334155", fontSize: 13 };
