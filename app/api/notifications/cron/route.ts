import { timingSafeEqual } from "node:crypto";
import { insertNotifications } from "@/src/lib/notifications";
import { prisma } from "@/src/lib/prisma";

export const runtime = "nodejs";

function isAuthorized(request: Request, secret: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

function notificationData(
  assignment: {
    id: string;
    title: string;
    dueAt: Date;
    course: { id: string; title: string; instructorId: string };
  },
  userId: string,
  type: "DEADLINE" | "OVERDUE",
  studentName?: string,
  studentId?: string,
) {
  const dueAt = assignment.dueAt.toISOString();
  const deadlineLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(assignment.dueAt);

  if (type === "DEADLINE") {
    return {
      userId,
      type,
      title: "課題の提出期限が近づいています",
      body: `${assignment.course.title}「${assignment.title}」の提出期限は${deadlineLabel}です。`,
      href: `/assignments/${assignment.id}`,
      dedupeKey: `deadline:${assignment.id}:${userId}:${dueAt}`,
    };
  }
  return {
    userId,
    type,
    title: "未提出の課題があります",
    body: `${studentName ?? "受講生"}は${assignment.course.title}「${assignment.title}」を提出していません（期限: ${deadlineLabel}）。`,
    href: `/assignments/${assignment.id}`,
    dedupeKey: `overdue:${assignment.id}:${studentId ?? userId}:${dueAt}`,
  };
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const reminderLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [upcomingAssignments, overdueAssignments] = await Promise.all([
    prisma.assignment.findMany({
      where: { dueAt: { gt: now, lte: reminderLimit } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructorId: true,
            enrollments: {
              where: { user: { role: "STUDENT" } },
              select: { userId: true },
            },
          },
        },
        submissions: {
          where: { status: { in: ["SUBMITTED", "GRADED"] } },
          select: { userId: true },
        },
      },
    }),
    prisma.assignment.findMany({
      where: { dueAt: { lte: now } },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            instructorId: true,
            enrollments: {
              where: { user: { role: "STUDENT" } },
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        submissions: {
          where: { status: { in: ["SUBMITTED", "GRADED"] } },
          select: { userId: true },
        },
      },
    }),
  ]);

  const deadlineNotifications = upcomingAssignments.flatMap((assignment) => {
    const submittedIds = new Set(assignment.submissions.map(({ userId }) => userId));
    return assignment.course.enrollments
      .filter(({ userId }) => !submittedIds.has(userId))
      .map(({ userId }) => notificationData(assignment, userId, "DEADLINE"));
  });
  const overdueNotifications = overdueAssignments.flatMap((assignment) => {
    const submittedIds = new Set(assignment.submissions.map(({ userId }) => userId));
    return assignment.course.enrollments
      .filter(({ userId }) => !submittedIds.has(userId))
      .map(({ user, userId }) =>
        notificationData(
          assignment,
          assignment.course.instructorId,
          "OVERDUE",
          user.name ?? user.email,
          userId,
        ),
      );
  });

  const [deadlineResult, overdueResult] = await prisma.$transaction(async (transaction) =>
    Promise.all([
      insertNotifications(transaction, deadlineNotifications),
      insertNotifications(transaction, overdueNotifications),
    ]),
  );
  return Response.json({
    deadlineNotifications: deadlineResult.count,
    overdueNotifications: overdueResult.count,
  });
}
