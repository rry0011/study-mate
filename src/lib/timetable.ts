import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/session";

export async function getTimetable(from: Date, to: Date) {
  const session = await requireAuth();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { school: { include: { timetables: true } } },
  });

  const [lessons, slots] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        date: { gte: from, lte: to },
        course: {
          OR: [
            { enrollments: { some: { userId } } },
            { instructorId: userId },
          ],
        },
      },
      include: {
        course: { select: { id: true, title: true } },
        room: { select: { name: true } },
        lessonAttendances: { where: { userId }, select: { status: true } },
      },
      orderBy: [{ date: "asc" }, { period: "asc" }],
    }),
    user?.school?.timetables,
  ]);

  const slotMap = new Map(slots?.map((slot) => [slot.period, slot]));

  return lessons.map((lesson) => ({
    id: lesson.id,
    date: lesson.date,
    period: lesson.period,
    startTime: slotMap.get(lesson.period)?.startTime,
    endTime: slotMap.get(lesson.period)?.endTime,
    courseTitle: lesson.course.title,
    room: lesson.room.name,
    attendance: lesson.lessonAttendances[0]?.status ?? null,
  }));
}
