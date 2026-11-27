import { auth } from "@/auth";
import DashboardShell from "@/src/components/DashboardShell";
import { prisma } from "@/src/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const notifications = session?.user?.id
    ? await prisma.notification.findMany({
        where: { userId: session.user.id, read: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          href: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <DashboardShell
      role={session?.user.role}
      notifications={notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      }))}
    >
      {children}
    </DashboardShell>
  );
}