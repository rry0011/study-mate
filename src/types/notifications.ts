export type NotificationItem = {
  id: string;
  type: "ASSIGNMENT" | "MESSAGE" | "ACHIEVEMENT" | "LESSON" | "DEADLINE" | "OVERDUE";
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
};
