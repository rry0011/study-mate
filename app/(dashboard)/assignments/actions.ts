"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseAssignmentDueAt } from "@/src/lib/assignment-date";
import { formatNotificationDate, insertNotifications } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";

const MAX_FILE_COUNT = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getUploadedFiles(formData: FormData) {
  const regularFiles = formData.getAll("files").filter(
    (entry): entry is File => entry instanceof File && entry.name.length > 0,
  );
  const folderFiles = formData.getAll("folderFiles").filter(
    (entry): entry is File => entry instanceof File && entry.name.length > 0,
  );
  const folderPaths = formData.getAll("folderPaths").filter(
    (entry): entry is string => typeof entry === "string",
  );
  if (folderFiles.length !== folderPaths.length) {
    throw new Error("フォルダ内ファイルの情報を読み取れませんでした。もう一度選択してください。");
  }
  const files = [
    ...regularFiles.map((file) => ({ file, relativePath: file.name })),
    ...folderFiles.map((file, index) => ({ file, relativePath: folderPaths[index] })),
  ];
  if (files.length > MAX_FILE_COUNT) {
    throw new Error("添付できるファイルは20個までです。");
  }
  if (files.some(({ file }) => file.size > MAX_FILE_SIZE)) {
    throw new Error("1ファイルあたりの上限は5MBです。");
  }
  if (files.reduce((total, { file }) => total + file.size, 0) > MAX_TOTAL_SIZE) {
    throw new Error("添付ファイルの合計は10MB以内にしてください。");
  }
  return files;
}

function attachmentData(file: File, relativeFilePath: string, submissionId: string) {
  const parts = relativeFilePath
    .split(/[\\/]/)
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.slice(0, 200));
  const fileName = parts.pop() || "attachment";

  return file.arrayBuffer().then((buffer) => ({
    submissionId,
    fileName,
    relativePath: parts.length ? parts.join("/") : null,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    data: new Uint8Array(buffer),
  }));
}

async function getManagedAssignment(assignmentId: string) {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const assignment = await prisma.assignment.findFirst({
    where: session.user.role === "ADMIN"
      ? { id: assignmentId }
      : { id: assignmentId, course: { instructorId: session.user.id } },
    select: {
      id: true,
      courseId: true,
      title: true,
      description: true,
      dueAt: true,
      course: {
        select: {
          title: true,
          enrollments: {
            where: { user: { role: "STUDENT" } },
            select: { userId: true },
          },
        },
      },
    },
  });
  if (!assignment) throw new Error("課題が見つからないか、管理する権限がありません。");
  return assignment;
}

export async function createAssignment(formData: FormData) {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const courseId = formString(formData, "courseId");
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const dueAt = parseAssignmentDueAt(formString(formData, "dueAt"));

  if (!title || title.length > 200) throw new Error("課題名を200文字以内で入力してください。");
  if (description.length > 10000) throw new Error("課題の説明は10,000文字以内で入力してください。");
  if (!dueAt) throw new Error("提出期限を正しく入力してください。");

  const course = await prisma.course.findFirst({
    where: session.user.role === "ADMIN"
      ? { id: courseId }
      : { id: courseId, instructorId: session.user.id },
    select: {
      id: true,
      title: true,
      enrollments: {
        where: { user: { role: "STUDENT" } },
        select: { userId: true },
      },
    },
  });
  if (!course) throw new Error("担当する授業を選択してください。");

  const assignment = await prisma.$transaction(async (transaction) => {
    const created = await transaction.assignment.create({
      data: { courseId, title, description: description || null, dueAt },
    });
    await insertNotifications(
      transaction,
      course.enrollments.map(({ userId }) => ({
        userId,
        type: "ASSIGNMENT",
        title: "新しい課題が割り当てられました",
        body: `${course.title}「${title}」の提出期限は${formatNotificationDate(dueAt)}です。`,
        href: `/assignments/${created.id}`,
        dedupeKey: `assignment:${created.id}:assigned:${userId}`,
      })),
    );
    return created;
  });
  revalidatePath("/", "layout");
  revalidatePath("/assignments");
  revalidatePath("/teacher/assignments");
  redirect(`/assignments/${assignment.id}`);
}

export async function updateAssignment(formData: FormData) {
  const assignmentId = formString(formData, "assignmentId");
  const assignment = await getManagedAssignment(assignmentId);
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const dueAt = parseAssignmentDueAt(formString(formData, "dueAt"));

  if (!title || title.length > 200) throw new Error("課題名を200文字以内で入力してください。");
  if (description.length > 10000) throw new Error("課題の説明は10,000文字以内で入力してください。");
  if (!dueAt) throw new Error("提出期限を正しく入力してください。");

  const changed =
    assignment.title !== title ||
    assignment.dueAt.getTime() !== dueAt.getTime() ||
    (assignment.description ?? "") !== description;
  await prisma.$transaction(async (transaction) => {
    await transaction.assignment.update({
      where: { id: assignment.id },
      data: { title, description: description || null, dueAt },
    });
    if (changed) {
      await insertNotifications(
        transaction,
        assignment.course.enrollments.map(({ userId }) => ({
          userId,
          type: "ASSIGNMENT",
          title: "課題が更新されました",
          body: `${assignment.course.title}「${title}」の内容または提出期限が更新されました。期限: ${formatNotificationDate(dueAt)}`,
          href: `/assignments/${assignment.id}`,
        })),
      );
    }
  });
  if (changed) revalidatePath("/", "layout");
  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath("/teacher/assignments");
}

export async function submitAssignment(formData: FormData) {
  const session = await requireRole("STUDENT");
  const assignmentId = formString(formData, "assignmentId");
  const files = getUploadedFiles(formData);
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      course: { enrollments: { some: { userId: session.user.id } } },
    },
    select: { id: true },
  });
  if (!assignment) throw new Error("この課題を提出する権限がありません。");

  await prisma.$transaction(async (transaction) => {
    const savedSubmission = await transaction.submission.upsert({
      where: {
        assignmentId_userId: {
          assignmentId: assignment.id,
          userId: session.user.id,
        },
      },
      create: {
        assignmentId: assignment.id,
        userId: session.user.id,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      update: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        score: null,
        feedback: null,
      },
      select: { id: true },
    });

    if (files.length > 0) {
      await transaction.submissionAttachment.deleteMany({
        where: { submissionId: savedSubmission.id },
      });
      await transaction.submissionAttachment.createMany({
        data: await Promise.all(
          files.map(({ file, relativePath }) =>
            attachmentData(file, relativePath, savedSubmission.id),
          ),
        ),
      });
    }
  });

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath("/teacher/assignments");
}

export async function returnSubmission(formData: FormData) {
  const assignmentId = formString(formData, "assignmentId");
  const submissionId = formString(formData, "submissionId");
  const assignment = await getManagedAssignment(assignmentId);
  const scoreText = formString(formData, "score");
  const feedback = formString(formData, "feedback");

  if (scoreText && (!/^\d{1,3}$/.test(scoreText) || Number(scoreText) > 100)) {
    throw new Error("点数は0から100の整数で入力してください。");
  }
  if (feedback.length > 5000) throw new Error("講評は5,000文字以内で入力してください。");

  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, assignmentId: assignment.id },
    select: { id: true, userId: true },
  });
  if (!submission) throw new Error("提出物が見つかりません。");

  await prisma.$transaction(async (transaction) => {
    await transaction.submission.update({
      where: { id: submission.id },
      data: {
        status: "GRADED",
        score: scoreText ? Number(scoreText) : null,
        feedback: feedback || null,
      },
    });
    await insertNotifications(transaction, [{
      userId: submission.userId,
      type: "ASSIGNMENT",
      title: "課題が返却されました",
      body: `${assignment.course.title}「${assignment.title}」の課題が返却されました。`,
      href: `/assignments/${assignment.id}`,
    }]);
  });
  revalidatePath("/", "layout");
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath("/assignments");
  revalidatePath("/teacher/assignments");
}
