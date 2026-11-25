import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";
import {
  createLesson,
  deleteLesson,
  updateCourse,
  updateEnrollments,
  updateLesson,
} from "../actions";

function dateValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function ManageCoursePage({
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
      term: true,
      enrollments: { include: { user: true }, orderBy: { user: { name: "asc" } } },
      lessons: { include: { room: true }, orderBy: [{ date: "asc" }, { period: "asc" }] },
    },
  });
  if (!course) notFound();

  const [rooms, students] = await Promise.all([
    prisma.room.findMany({ where: { schoolId: course.schoolId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { schoolId: course.schoolId, role: "STUDENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const enrolledIds = new Set(course.enrollments.map(({ userId }) => userId));

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto" }}>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 4 }}>
        <Link href="/teacher/lessons" style={linkStyle}>授業管理</Link> / {course.term.name}
      </p>
      <h1 style={{ fontSize: 28, color: "#0F172A", marginBottom: 20 }}>{course.title}</h1>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Link href={`/teacher/lessons/${course.id}/evaluations`} style={primaryLinkStyle}>
          学生評価へ
        </Link>
        <span style={{ ...mutedStyle, alignSelf: "center" }}>
          {course.enrollments.length}名の受講者・{course.lessons.length}回の講義
        </span>
      </div>

      <article style={panelStyle}>
        <h2 style={headingStyle}>授業内容</h2>
        <form action={updateCourse} style={{ display: "grid", gap: 12 }}>
          <input type="hidden" name="courseId" value={course.id} />
          <label style={labelStyle}>
            授業名
            <input name="title" defaultValue={course.title} maxLength={200} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            授業内容
            <textarea name="description" rows={3} defaultValue={course.description ?? ""} style={inputStyle} />
          </label>
          <button type="submit" style={buttonStyle}>内容を保存</button>
        </form>
      </article>

      <article style={panelStyle}>
        <h2 style={headingStyle}>学生の割り当て</h2>
        {students.length === 0 ? (
          <p style={mutedStyle}>所属学校に登録済みの学生がいません。</p>
        ) : (
          <form action={updateEnrollments}>
            <input type="hidden" name="courseId" value={course.id} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginBottom: 14 }}>
              {students.map((student) => (
                <label key={student.id} style={studentLabelStyle}>
                  <input
                    type="checkbox"
                    name="studentIds"
                    value={student.id}
                    defaultChecked={enrolledIds.has(student.id)}
                  />
                  <span>
                    <strong>{student.name ?? student.email}</strong>
                    {student.name && <small style={{ display: "block", color: "#64748B" }}>{student.email}</small>}
                  </span>
                </label>
              ))}
            </div>
            <button type="submit" style={buttonStyle}>受講者を保存</button>
          </form>
        )}
      </article>

      <article style={panelStyle}>
        <h2 style={headingStyle}>講義・教室の割り当て</h2>
        <p style={{ ...mutedStyle, marginBottom: 14 }}>
          学期: {dateValue(course.term.startDate)} 〜 {dateValue(course.term.endDate)}
        </p>
        {course.lessons.length === 0 ? (
          <p style={{ ...mutedStyle, marginBottom: 14 }}>講義は登録されていません。</p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {course.lessons.map((lesson) => (
              <div key={lesson.id} style={lessonRowStyle}>
                <form action={updateLesson} className="lesson-edit-form" style={{ display: "grid", gridTemplateColumns: "minmax(130px, 1fr) 120px minmax(150px, 1fr) auto", gap: 8, flex: 1, alignItems: "end" }}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <label style={labelStyle}>
                    日付
                    <input type="date" name="date" defaultValue={dateValue(lesson.date)} required style={inputStyle} />
                  </label>
                  <label style={labelStyle}>
                    時限
                    <select name="period" defaultValue={lesson.period} style={inputStyle}>
                      {Array.from({ length: 20 }, (_, index) => (
                        <option key={index + 1} value={index + 1}>第{index + 1}時限</option>
                      ))}
                    </select>
                  </label>
                  <label style={labelStyle}>
                    教室
                    <select name="roomId" defaultValue={lesson.roomId ?? ""} style={inputStyle}>
                      <option value="">未割り当て</option>
                      {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                    </select>
                  </label>
                  <button type="submit" style={buttonStyle}>保存</button>
                </form>
                <form action={deleteLesson}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <button type="submit" style={deleteButtonStyle}>削除</button>
                </form>
              </div>
            ))}
          </div>
        )}
        {rooms.length === 0 && (
          <p role="status" style={{ color: "#92400E", background: "#FFFBEB", padding: 10, borderRadius: 8, marginBottom: 14 }}>
            教室が登録されていません。講義は未割り当てのまま保存できます。
          </p>
        )}
        <form action={createLesson} className="new-lesson-form" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end", borderTop: "1px solid #E2E8F0", paddingTop: 16 }}>
          <input type="hidden" name="courseId" value={course.id} />
          <label style={labelStyle}>
            講義を追加（日付）
            <input type="date" name="date" min={dateValue(course.term.startDate)} max={dateValue(course.term.endDate)} required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            時限
            <select name="period" defaultValue="1" style={inputStyle}>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index + 1} value={index + 1}>第{index + 1}時限</option>
              ))}
            </select>
          </label>
          <button type="submit" style={buttonStyle}>講義を追加</button>
        </form>
      </article>

      <style>{`
        @media (max-width: 760px) {
          .lesson-edit-form { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 500px) {
          .lesson-edit-form { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
};
const headingStyle: CSSProperties = { fontSize: 18, marginBottom: 14 };
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
  border: 0,
  borderRadius: 8,
  background: "#4F46E5",
  color: "#FFFFFF",
  padding: "9px 13px",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const deleteButtonStyle: CSSProperties = {
  border: "1px solid #FECACA",
  borderRadius: 8,
  background: "#FEF2F2",
  color: "#B91C1C",
  padding: "9px 13px",
  cursor: "pointer",
};
const linkStyle: CSSProperties = { color: "#4F46E5", textDecoration: "none" };
const primaryLinkStyle: CSSProperties = {
  ...buttonStyle,
  display: "inline-flex",
  textDecoration: "none",
};
const mutedStyle: CSSProperties = { color: "#64748B", fontSize: 13 };
const studentLabelStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: 10,
  color: "#334155",
};
const lessonRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "end",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: 10,
};
