"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { requireAuth } from "@/src/lib/session";

function safeHref(href: string | null) {
  return href && href.startsWith("/") && !href.startsWith("//")
    ? href
    : "/notifications";
}

export async function markNotificationRead(notificationId: string) {
  const session = await requireAuth();
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: session.user.id },
    select: { href: true },
  });
  if (!notification) return null;

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  return notification.href;
}

export async function markAllNotificationsRead() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
}

export async function openNotification(formData: FormData) {
  const session = await requireAuth();
  const notificationId = formData.get("notificationId");
  if (typeof notificationId !== "string" || !notificationId) {
    throw new Error("お知らせを特定できませんでした。");
  }
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: session.user.id },
    select: { href: true },
  });
  if (!notification) redirect("/notifications");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  redirect(safeHref(notification.href));
}
