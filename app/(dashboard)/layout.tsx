import { auth } from "@/auth";
import DashboardShell from "@/src/components/DashboardShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <DashboardShell role={session?.user.role}>
      {children}
    </DashboardShell>
  );
}