import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import AssignmentFilePicker from "@/src/components/AssignmentFilePicker";
import { toTokyoDateTimeLocal } from "@/src/lib/assignment-date";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/session";
import { returnSubmission, submitAssignment, updateAssignment } from "../actions";

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

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignment_id: string }>;
}) {
  const [{ assignment_id: assignmentId }, session] = await Promise.all([
    params,
    requireAuth(),
  ]);
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          instructorId: true,
          enrollments: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!assignment) notFound();

  const isInstructor = session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";
  const canManage =
    session.user.role === "ADMIN" ||
    (session.user.role === "INSTRUCTOR" && assignment.course.instructorId === session.user.id);
  if (isInstructor && !canManage) notFound();
  if (!isInstructor && assignment.course.enrollments.length === 0) notFound();

  const [studentSubmission, enrollments, submissions] = await Promise.all([
    isInstructor
      ? Promise.resolve(null)
      : prisma.submission.findUnique({
          where: {
            assignmentId_userId: {
              assignmentId: assignment.id,
              userId: session.user.id,
            },
          },
          include: { attachments: { orderBy: { createdAt: "asc" } } },
        }),
    canManage
      ? prisma.enrollment.findMany({
          where: { courseId: assignment.course.id },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
    canManage
      ? prisma.submission.findMany({
          where: { assignmentId: assignment.id },
          include: {
            user: { select: { id: true, name: true, email: true } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);
  const submissionByStudent = new Map(submissions.map((submission) => [submission.userId, submission]));

  return (
    <section style={{ maxWidth: 1050, margin: "0 auto" }}>
      <p style={{ color: "#64748B", fontSize: 13, marginBottom: 8 }}>
        <Link href={canManage ? "/teacher/assignments" : "/assignments"} style={linkStyle}>
          {canManage ? "課題管理" : "課題一覧"}
        </Link>
        {" / "}{assignment.course.title}
      </p>
      <article style={panelStyle}>
        <p style={{ color: "#6366F1", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
          {assignment.course.title}
        </p>
        <h1 style={{ fontSize: 26, color: "#0F172A", marginBottom: 8 }}>{assignment.title}</h1>
        <p style={{ color: "#64748B", fontSize: 13, marginBottom: 14 }}>
          提出期限: {formatDueAt(assignment.dueAt)}
        </p>
        {assignment.description ? (
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{assignment.description}</p>
        ) : (
          <p style={mutedStyle}>課題の説明はありません。</p>
        )}
      </article>

      {canManage ? (
        <>
          <article style={panelStyle}>
            <h2 style={headingStyle}>課題を編集</h2>
            <form action={updateAssignment} style={{ display: "grid", gap: 12 }}>
              <input type="hidden" name="assignmentId" value={assignment.id} />
              <label style={labelStyle}>
                課題名
                <input name="title" required maxLength={200} defaultValue={assignment.title} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                課題の説明
                <textarea name="description" rows={4} maxLength={10000} defaultValue={assignment.description ?? ""} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                提出期限
                <input type="datetime-local" name="dueAt" required defaultValue={toTokyoDateTimeLocal(assignment.dueAt)} style={inputStyle} />
              </label>
              <button type="submit" style={buttonStyle}>変更を保存</button>
            </form>
          </article>

          <h2 style={headingStyle}>提出物の確認・返却（{submissions.length}/{enrollments.length}件提出）</h2>
          {enrollments.length === 0 ? (
            <article style={panelStyle}><p style={mutedStyle}>この授業に受講生がいません。</p></article>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {enrollments.map(({ user }) => {
                const submission = submissionByStudent.get(user.id);
                return (
                  <article key={user.id} style={panelStyle}>
                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>{user.name ?? user.email}</h3>
                    <p style={{ ...mutedStyle, marginBottom: 12 }}>
                      {submission
                        ? `${submission.submittedAt ? `提出日時: ${formatDueAt(submission.submittedAt)} ・ ` : ""}${submission.status === "GRADED" ? "返却済み" : "確認待ち"}`
                        : "未提出"}
                    </p>
                    {submission && (
                      <>
                        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                          {submission.attachments.map((file) => (
                            <a key={file.id} href={`/api/assignment-files/${file.id}`} style={fileLinkStyle}>
                              {file.relativePath ? `${file.relativePath}/` : ""}{file.fileName}
                              <small style={{ color: "#64748B", marginLeft: 8 }}>{Math.ceil(file.fileSize / 1024)}KB</small>
                            </a>
                          ))}
                          {submission.attachments.length === 0 && (
                            <p style={mutedStyle}>添付ファイルはありません。</p>
                          )}
                        </div>
                        <form action={returnSubmission} style={{ display: "grid", gap: 10 }}>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input type="hidden" name="submissionId" value={submission.id} />
                          <label style={{ ...labelStyle, maxWidth: 240 }}>
                            点数（任意・0〜100点）
                            <input type="number" name="score" min={0} max={100} step={1} defaultValue={submission.score ?? ""} style={inputStyle} />
                          </label>
                          <label style={labelStyle}>
                            講評（任意）
                            <textarea name="feedback" rows={3} maxLength={5000} defaultValue={submission.feedback ?? ""} style={inputStyle} />
                          </label>
                          <button type="submit" style={buttonStyle}>返却する</button>
                        </form>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <article style={panelStyle}>
          <h2 style={headingStyle}>提出状況</h2>
          {studentSubmission?.status === "GRADED" ? (
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: "#15803D", fontWeight: 700, marginBottom: 8 }}>教師から課題が返却されました</p>
              {studentSubmission.score !== null && (
                <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                  {studentSubmission.score}<small style={{ color: "#64748B", fontSize: 13 }}> / 100点</small>
                </p>
              )}
              {studentSubmission.feedback && (
                <p style={{ whiteSpace: "pre-wrap", background: "#F8FAFC", borderRadius: 8, padding: 12 }}>
                  {studentSubmission.feedback}
                </p>
              )}
            </div>
          ) : studentSubmission ? (
            <p style={{ color: "#475569", marginBottom: 16 }}>提出済み・教師の確認待ちです。</p>
          ) : (
            <p style={{ color: "#475569", marginBottom: 16 }}>まだ提出されていません。</p>
          )}

          {studentSubmission && (
            <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
              <strong style={{ fontSize: 13 }}>提出済みファイル</strong>
              {studentSubmission.attachments.length === 0 ? (
                <p style={mutedStyle}>添付ファイルはありません。</p>
              ) : (
                studentSubmission.attachments.map((file) => (
                  <a key={file.id} href={`/api/assignment-files/${file.id}`} style={fileLinkStyle}>
                    {file.relativePath ? `${file.relativePath}/` : ""}{file.fileName}
                    <small style={{ color: "#64748B", marginLeft: 8 }}>{Math.ceil(file.fileSize / 1024)}KB</small>
                  </a>
                ))
              )}
            </div>
          )}

          <form action={submitAssignment} style={{ display: "grid", gap: 12 }}>
            <input type="hidden" name="assignmentId" value={assignment.id} />
            <AssignmentFilePicker />
            <button type="submit" style={buttonStyle}>
              {studentSubmission ? "再提出する" : "課題を提出する"}
            </button>
          </form>
        </article>
      )}
    </section>
  );
}

const panelStyle: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  padding: 18,
  marginBottom: 14,
};
const headingStyle: CSSProperties = { fontSize: 18, color: "#0F172A", marginBottom: 14 };
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
  padding: "9px 13px",
  cursor: "pointer",
  fontWeight: 600,
};
const linkStyle: CSSProperties = { color: "#4F46E5", textDecoration: "none" };
const fileLinkStyle: CSSProperties = {
  color: "#4F46E5",
  fontSize: 13,
  overflowWrap: "anywhere",
  textDecoration: "none",
};
const mutedStyle: CSSProperties = { color: "#64748B", fontSize: 13 };
