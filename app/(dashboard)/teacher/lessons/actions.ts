"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatNotificationDate, insertNotifications } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";
import { requireRole } from "@/src/lib/session";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

function getToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatLessonDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function lessonNotificationData(
  recipients: { userId: string }[],
  title: string,
  body: string,
  dedupeKey: string,
) {
  return recipients.map(({ userId }) => ({
    userId,
    type: "LESSON" as const,
    title,
    body,
    href: "/timetable",
    dedupeKey: `${dedupeKey}:${userId}`,
  }));
}

async function getManagedCourse(courseId: string) {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      instructorId: true,
      schoolId: true,
      title: true,
      term: { select: { startDate: true, endDate: true } },
      evaluationsPublishedAt: true,
    },
  });

  if (!course || (session.user.role !== "ADMIN" && course.instructorId !== session.user.id)) {
    throw new Error("授業が見つからないか、管理する権限がありません。");
  }
  return { course, session };
}

export async function createCourse(formData: FormData) {
  const session = await requireRole("INSTRUCTOR", "ADMIN");
  const instructor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { schoolId: true },
  });
  const schoolId = instructor?.schoolId;
  const termId = formString(formData, "termId");
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  const dayOfWeek = Number(formString(formData, "dayOfWeek"));
  const period = Number(formString(formData, "period"));

  if (!schoolId) throw new Error("所属学校が設定されていません。");
  if (!title || title.length > 200) throw new Error("授業名を入力してください。");
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("曜日を選択してください。");
  }
  if (!Number.isInteger(period) || period < 1 || period > 20) {
    throw new Error("有効な時限を選択してください。");
  }

  const term = await prisma.term.findFirst({
    where: { id: termId, schoolId, endDate: { gte: getToday() } },
  });
  if (!term) throw new Error("選択した学期は所属学校の現在または今後の学期ではありません。");

  const lessonDates: Date[] = [];
  for (
    let date = new Date(term.startDate);
    date <= term.endDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    if (date.getUTCDay() === dayOfWeek) lessonDates.push(new Date(date));
  }
  if (lessonDates.length === 0) throw new Error("学期中に該当する曜日がありません。");

  const course = await prisma.$transaction(async (transaction) => {
    const createdCourse = await transaction.course.create({
      data: {
        instructorId: session.user.id,
        schoolId,
        termId,
        title,
        description: description || null,
      },
    });
    await transaction.lesson.createMany({
      data: lessonDates.map((date) => ({
        courseId: createdCourse.id,
        date,
        period,
        roomId: null,
      })),
    });
    return createdCourse;
  });

  revalidatePath("/teacher/lessons");
  redirect(`/teacher/lessons/${course.id}`);
}

export async function updateCourse(formData: FormData) {
  const courseId = formString(formData, "courseId");
  await getManagedCourse(courseId);
  const title = formString(formData, "title");
  const description = formString(formData, "description");
  if (!title || title.length > 200) throw new Error("授業名を入力してください。");

  await prisma.course.update({
    where: { id: courseId },
    data: { title, description: description || null },
  });
  revalidatePath(`/teacher/lessons/${courseId}`);
  revalidatePath("/teacher/lessons");
}

export async function updateEnrollments(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const { course } = await getManagedCourse(courseId);
  if (course.evaluationsPublishedAt) {
    throw new Error("評価確定後は受講者を変更できません。");
  }
  const selectedIds = Array.from(new Set(formData.getAll("studentIds").filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  )));
  const eligibleStudents = await prisma.user.findMany({
    where: {
      id: { in: selectedIds },
      schoolId: course.schoolId,
      role: "STUDENT",
    },
    select: { id: true },
  });
  if (eligibleStudents.length !== selectedIds.length) {
    throw new Error("所属学校の学生以外は受講者に設定できません。");
  }
  const previousEnrollments = await prisma.enrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  const previousIds = new Set(previousEnrollments.map(({ userId }) => userId));
  const newlyEnrolledIds = selectedIds.filter((userId) => !previousIds.has(userId));

  await prisma.$transaction(async (transaction) => {
    await transaction.enrollment.deleteMany({ where: { courseId } });
    if (selectedIds.length > 0) {
      await transaction.enrollment.createMany({
        data: selectedIds.map((userId) => ({ courseId, userId })),
      });
      await transaction.courseEvaluation.deleteMany({
        where: { courseId, studentId: { notIn: selectedIds } },
      });
    } else {
      await transaction.courseEvaluation.deleteMany({ where: { courseId } });
    }
    if (newlyEnrolledIds.length > 0) {
      const assignments = await transaction.assignment.findMany({
        where: { courseId },
        select: { id: true, title: true, dueAt: true },
      });
      await insertNotifications(
        transaction,
        newlyEnrolledIds.flatMap((userId) =>
          assignments.map((assignment) => ({
            userId,
            type: "ASSIGNMENT" as const,
            title: "受講授業に課題があります",
            body: `${course.title}「${assignment.title}」の提出期限は${formatNotificationDate(assignment.dueAt)}です。`,
            href: `/assignments/${assignment.id}`,
            dedupeKey: `assignment:${assignment.id}:assigned:${userId}`,
          })),
        ),
      );
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const upcomingLessonCount = await transaction.lesson.count({
        where: { courseId, date: { gte: today } },
      });
      if (upcomingLessonCount > 0) {
        await insertNotifications(
          transaction,
          newlyEnrolledIds.map((userId) => ({
            userId,
            type: "LESSON" as const,
            title: "受講授業の予定を確認してください",
            body: `${course.title}の受講登録が完了しました。授業予定を確認できます。`,
            href: "/timetable",
          })),
        );
      }
    }
  });
  if (newlyEnrolledIds.length > 0) revalidatePath("/", "layout");
  revalidatePath(`/teacher/lessons/${courseId}`);
  revalidatePath(`/teacher/lessons/${courseId}/evaluations`);
}

export async function updateLesson(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  const { course } = await getManagedCourse(courseId);
  const date = parseDate(formString(formData, "date"));
  const period = Number(formString(formData, "period"));
  const roomId = formString(formData, "roomId");
  if (!date || date < course.term.startDate || date > course.term.endDate) {
    throw new Error("講義日は学期の開始日から終了日の範囲で指定してください。");
  }
  if (!Number.isInteger(period) || period < 1 || period > 20) {
    throw new Error("有効な時限を選択してください。");
  }
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
  if (!lesson) throw new Error("講義が見つかりません。");
  if (roomId) {
    const room = await prisma.room.findFirst({
      where: { id: roomId, schoolId: course.schoolId },
      select: { id: true },
    });
    if (!room) throw new Error("所属学校の教室を選択してください。");
  }

  const scheduleChanged =
    lesson.date.getTime() !== date.getTime() || lesson.period !== period;
  await prisma.$transaction(async (transaction) => {
    await transaction.lesson.update({
      where: { id: lessonId },
      data: { date, period, roomId: roomId || null },
    });
    if (scheduleChanged) {
      const recipients = await transaction.enrollment.findMany({
        where: { courseId, user: { role: "STUDENT" } },
        select: { userId: true },
      });
      const oldSchedule = `${formatLessonDate(lesson.date)} 第${lesson.period}時限`;
      const newSchedule = `${formatLessonDate(date)} 第${period}時限`;
      await insertNotifications(
        transaction,
        lessonNotificationData(
          recipients,
          "授業日時が変更されました",
          `${course.title}の授業が${oldSchedule}から${newSchedule}に変更されました。`,
          `lesson-updated:${lesson.id}:${crypto.randomUUID()}`,
        ),
      );
    }
  });
  if (scheduleChanged) revalidatePath("/", "layout");
  revalidatePath(`/teacher/lessons/${courseId}`);
  revalidatePath("/teacher/lessons");
  revalidatePath("/timetable");
}

export async function createLesson(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const { course } = await getManagedCourse(courseId);
  const date = parseDate(formString(formData, "date"));
  const period = Number(formString(formData, "period"));
  if (!date || date < course.term.startDate || date > course.term.endDate) {
    throw new Error("講義日は学期の開始日から終了日の範囲で指定してください。");
  }
  if (!Number.isInteger(period) || period < 1 || period > 20) {
    throw new Error("有効な時限を選択してください。");
  }

  await prisma.$transaction(async (transaction) => {
    const lesson = await transaction.lesson.create({
      data: { courseId, date, period, roomId: null },
      select: { id: true },
    });
    const recipients = await transaction.enrollment.findMany({
      where: { courseId, user: { role: "STUDENT" } },
      select: { userId: true },
    });
    await insertNotifications(
      transaction,
      lessonNotificationData(
        recipients,
        "授業が追加されました",
        `${course.title}に${formatLessonDate(date)} 第${period}時限の授業が追加されました。`,
        `lesson-added:${lesson.id}`,
      ),
    );
  });
  revalidatePath("/", "layout");
  revalidatePath(`/teacher/lessons/${courseId}`);
  revalidatePath("/teacher/lessons");
  revalidatePath("/timetable");
}

export async function deleteLesson(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const lessonId = formString(formData, "lessonId");
  const { course } = await getManagedCourse(courseId);
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } });
  if (!lesson) throw new Error("講義が見つかりません。");
  await prisma.$transaction(async (transaction) => {
    await transaction.lessonAttendance.deleteMany({ where: { lessonId } });
    const deleted = await transaction.lesson.deleteMany({ where: { id: lessonId, courseId } });
    if (deleted.count === 0) throw new Error("講義はすでに削除されています。");
    const recipients = await transaction.enrollment.findMany({
      where: { courseId, user: { role: "STUDENT" } },
      select: { userId: true },
    });
    await insertNotifications(
      transaction,
      lessonNotificationData(
        recipients,
        "授業が取り消されました",
        `${course.title}の${formatLessonDate(lesson.date)} 第${lesson.period}時限の授業が取り消されました。`,
        `lesson-cancelled:${lesson.id}`,
      ),
    );
  });
  revalidatePath("/", "layout");
  revalidatePath(`/teacher/lessons/${courseId}`);
  revalidatePath("/teacher/lessons");
  revalidatePath("/timetable");
}

export async function saveEvaluation(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const studentId = formString(formData, "studentId");
  const { course } = await getManagedCourse(courseId);
  const scoreText = formString(formData, "score");
  const score = Number(scoreText);
  if (!/^\d{1,3}$/.test(scoreText) || !Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error("評価は0から100の整数で入力してください。");
  }
  if (course.evaluationsPublishedAt) {
    throw new Error("確定済みの評価は変更できません。");
  }
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: studentId, courseId } },
    select: { id: true },
  });
  if (!enrollment) throw new Error("この授業に所属していない学生です。");

  await prisma.courseEvaluation.upsert({
    where: { courseId_studentId: { courseId, studentId } },
    create: { courseId, studentId, score },
    update: { score },
  });

  const [enrollmentCount, evaluationCount] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.courseEvaluation.count({ where: { courseId } }),
  ]);
  revalidatePath(`/teacher/lessons/${courseId}/evaluations`);
  if (enrollmentCount > 0 && enrollmentCount === evaluationCount) {
    redirect(`/teacher/lessons/${courseId}/evaluations/confirm`);
  }
  redirect(`/teacher/lessons/${courseId}/evaluations?studentId=${encodeURIComponent(studentId)}`);
}

export async function publishEvaluations(formData: FormData) {
  const courseId = formString(formData, "courseId");
  const { course } = await getManagedCourse(courseId);
  if (course.evaluationsPublishedAt) {
    redirect(`/teacher/lessons/${courseId}/evaluations`);
  }
  const [enrollmentCount, evaluationCount] = await Promise.all([
    prisma.enrollment.count({ where: { courseId } }),
    prisma.courseEvaluation.count({ where: { courseId } }),
  ]);
  if (enrollmentCount === 0 || enrollmentCount !== evaluationCount) {
    throw new Error("受講者全員の評価が入力されていません。");
  }
  await prisma.course.update({
    where: { id: courseId },
    data: { evaluationsPublishedAt: new Date() },
  });
  revalidatePath(`/teacher/lessons/${courseId}/evaluations`);
  revalidatePath("/grades");
  redirect(`/teacher/lessons/${courseId}/evaluations`);
}
