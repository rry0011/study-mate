import type { CSSProperties } from "react";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default async function TeacherLessonsPage() {
  const session = await requireRole("INSTRUCTOR", "ADMIN");

  const courses = await prisma.course.findMany({
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
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

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
        <button type="button" style={primaryButtonStyle}>
          <span style={{ fontSize: 18 }}>+</span>
          授業を追加
        </button>
      </div>

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
                      <button type="button" style={secondaryButtonStyle}>
                        詳細
                      </button>
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
                        <p style={metaValueStyle}>{nextLesson?.room.name ?? "-"}</p>
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
                        {lesson.room.name}
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
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#475569",
  padding: "7px 12px",
  cursor: "pointer",
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
