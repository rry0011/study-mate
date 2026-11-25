import type { CSSProperties } from "react";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";
import { createCourse } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default async function TeacherLessonsPage() {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const instructor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { schoolId: true },
  });
  const schoolId = instructor?.schoolId;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [courses, terms] = await Promise.all([
    prisma.course.findMany({
    where: session.user.role === "ADMIN"
      ? {}
      : { instructorId: session.user.id },
    include: {
      term: true,
      school: true,
      enrollments: true,
      assignments: {
        orderBy: { dueAt: "desc" },
        take: 1,
        include: {
          submissions: true,
        },
      },
      lessons: {
        orderBy: [{ date: "asc" }, { period: "asc" }],
        include: {
          room: true,
          lessonAttendances: true,
        },
      },
    },
    orderBy: { title: "asc" },
    }),
    schoolId
      ? prisma.term.findMany({
          where: { schoolId, endDate: { gte: today } },
          orderBy: { startDate: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const todaysLessons = courses.flatMap((course) =>
    course.lessons
      .filter((lesson) => lesson.date >= today && lesson.date < tomorrow)
      .map((lesson) => ({
        course,
        lesson,
      })),
  );

  const studentCount = courses.reduce(
    (total, course) => total + course.enrollments.length,
    0,
  );
  const lessonCount = courses.reduce(
    (total, course) => total + course.lessons.length,
    0,
  );

  return (
    <section style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <p style={{ color: "#64748B", fontSize: 13, marginBottom: 4 }}>教師メニュー</p>
          <h1 style={{ fontSize: 28, color: "#0F172A" }}>授業管理</h1>
        </div>
        <a href="#create-course" style={primaryButtonStyle}>
          <span style={{ fontSize: 18 }}>+</span>
          授業を追加
        </a>
      </div>

      <form
        id="create-course"
        action={createCourse}
        style={{ ...panelStyle, padding: 18, marginBottom: 24 }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>授業を作成</h2>
        {terms.length === 0 ? (
          <p style={{ color: "#64748B" }}>
            選択できる学期がありません。所属学校の現在または今後の学期を確認してください。
          </p>
        ) : (
          <>
            <div className="course-create-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <label style={fieldLabelStyle}>
                学期
                <select name="termId" required style={inputStyle}>
                  {terms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name}</option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                授業名
                <input name="title" required maxLength={200} style={inputStyle} />
              </label>
              <label style={fieldLabelStyle}>
                基本の曜日
                <select name="dayOfWeek" required style={inputStyle} defaultValue="1">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
                    <option key={day} value={index}>{day}曜日</option>
                  ))}
                </select>
              </label>
              <label style={fieldLabelStyle}>
                基本の時限
                <select name="period" required style={inputStyle} defaultValue="1">
                  {Array.from({ length: 20 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>第{index + 1}時限</option>
                  ))}
                </select>
              </label>
              <label style={{ ...fieldLabelStyle, gridColumn: "span 2" }}>
                授業内容（任意）
                <textarea name="description" rows={2} style={inputStyle} />
              </label>
            </div>
            <p style={{ color: "#64748B", fontSize: 12, margin: "10px 0" }}>
              選択した曜日・時限で学期中の講義を作成します。教室と受講者は作成後に割り当てできます。
            </p>
            <button type="submit" style={primaryButtonStyle}>授業を作成</button>
          </>
        )}
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <article style={statCardStyle}>
          <p style={statLabelStyle}>担当授業</p>
          <p style={statValueStyle}>{courses.length}<small style={statUnitStyle}> 件</small></p>
        </article>
        <article style={statCardStyle}>
          <p style={statLabelStyle}>登録受講者</p>
          <p style={statValueStyle}>{studentCount}<small style={statUnitStyle}> 人</small></p>
        </article>
        <article style={statCardStyle}>
          <p style={statLabelStyle}>登録授業回数</p>
          <p style={statValueStyle}>{lessonCount}<small style={statUnitStyle}> 回</small></p>
        </article>
        <article style={statCardStyle}>
          <p style={statLabelStyle}>本日の授業</p>
          <p style={statValueStyle}>{todaysLessons.length}<small style={statUnitStyle}> 回</small></p>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.7fr)", gap: 16 }} className="teacher-lessons-grid">
        <div>
          <div style={sectionHeaderStyle}>
            <h2 style={{ fontSize: 18 }}>担当授業</h2>
            <span style={{ color: "#94A3B8", fontSize: 13 }}>{courses.length}件</span>
          </div>

          {courses.length === 0 ? (
            <article style={{ ...panelStyle, padding: 32, textAlign: "center", color: "#64748B" }}>
              担当授業はまだ登録されていません。
            </article>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {courses.map((course) => {
                const nextLesson = course.lessons.find((lesson) => lesson.date >= today);
                const latestAssignment = course.assignments[0];
                const submittedCount = latestAssignment
                  ? latestAssignment.submissions.filter((submission) => submission.status !== "PENDING").length
                  : 0;

                return (
                  <article key={course.id} style={{ ...panelStyle, padding: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                      <div>
                        <p style={{ color: "#6366F1", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          {course.term.name}
                        </p>
                        <h3 style={{ fontSize: 17, marginBottom: 6 }}>{course.title}</h3>
                        <p style={{ color: "#64748B", fontSize: 13 }}>
                          {course.school.name} ・ {course.enrollments.length}名の受講者
                        </p>
                      </div>
                      <Link href={`/teacher/lessons/${course.id}`} style={secondaryButtonStyle}>
                        管理・評価
                      </Link>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 16 }} className="course-meta">
                      <div style={metaBoxStyle}>
                        <p style={metaLabelStyle}>次回授業</p>
                        <p style={metaValueStyle}>
                          {nextLesson
                            ? `${formatDate(nextLesson.date)} 第${nextLesson.period}`
                            : "未設定"}
                        </p>
                      </div>
                      <div style={metaBoxStyle}>
                        <p style={metaLabelStyle}>教室</p>
                        <p style={metaValueStyle}>{nextLesson?.room?.name ?? "-"}</p>
                      </div>
                      <div style={metaBoxStyle}>
                        <p style={metaLabelStyle}>課題提出</p>
                        <p style={metaValueStyle}>
                          {latestAssignment
                            ? `${submittedCount}/${course.enrollments.length}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside>
          <div style={sectionHeaderStyle}>
            <h2 style={{ fontSize: 18 }}>本日の授業</h2>
            <span style={{ color: "#94A3B8", fontSize: 13 }}>{formatDate(today)}</span>
          </div>
          <article style={{ ...panelStyle, padding: 12 }}>
            {todaysLessons.length === 0 ? (
              <p style={{ color: "#64748B", textAlign: "center", padding: "24px 8px" }}>
                本日の授業はありません。
              </p>
            ) : (
              todaysLessons
                .sort((a, b) => a.lesson.period - b.lesson.period)
                .map(({ course, lesson }) => (
                  <div key={lesson.id} style={{ display: "flex", gap: 12, padding: "10px 6px", borderBottom: "1px solid #F1F5F9" }}>
                    <div style={{ width: 48, flexShrink: 0, textAlign: "center" }}>
                      <p style={{ fontWeight: 700, color: "#6366F1" }}>{lesson.period}</p>
                      <p style={{ fontSize: 11, color: "#94A3B8" }}>時限</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>{course.title}</p>
                      <p style={{ color: "#64748B", fontSize: 12 }}>
                        {lesson.room?.name ?? "教室未割り当て"}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </article>
        </aside>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .teacher-lessons-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 540px) {
          .course-meta { grid-template-columns: 1fr !important; }
          .course-create-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

const statCardStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: "16px 18px",
};

const statLabelStyle: CSSProperties = {
  color: "#64748B",
  fontSize: 12,
  marginBottom: 8,
};

const statValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
};

const statUnitStyle: CSSProperties = {
  fontSize: 12,
  color: "#64748B",
  fontWeight: 400,
};

const primaryButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  border: 0,
  borderRadius: 8,
  background: "#4F46E5",
  color: "#FFFFFF",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 600,
  textDecoration: "none",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#475569",
  padding: "7px 12px",
  cursor: "pointer",
  textDecoration: "none",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  padding: "9px 10px",
  color: "#0F172A",
  font: "inherit",
};

const metaBoxStyle: CSSProperties = {
  background: "#F8FAFC",
  borderRadius: 8,
  padding: "10px",
};

const metaLabelStyle: CSSProperties = {
  color: "#94A3B8",
  fontSize: 11,
  marginBottom: 4,
};

const metaValueStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
};
