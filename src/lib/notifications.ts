import type { Prisma } from "@prisma/client";

type NotificationWriter = Pick<Prisma.TransactionClient, "notification">;

export async function insertNotifications(
  writer: NotificationWriter,
  notifications: Prisma.NotificationCreateManyInput[],
) {
  if (notifications.length === 0) return { count: 0 };
  return writer.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });
}

export function formatNotificationDate(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(date);
}
