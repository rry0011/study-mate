import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file_id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { file_id: fileId } = await params;
  const file = await prisma.submissionAttachment.findUnique({
    where: { id: fileId },
    select: {
      fileName: true,
      fileType: true,
      data: true,
      submission: {
        select: {
          userId: true,
          assignment: {
            select: { course: { select: { instructorId: true } } },
          },
        },
      },
    },
  });
  if (!file) return new Response("Not found", { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = session.user.id === file.submission.userId;
  const isInstructor =
    session.user.role === "INSTRUCTOR" &&
    session.user.id === file.submission.assignment.course.instructorId;
  if (!isAdmin && !isOwner && !isInstructor) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(file.fileType)
    ? file.fileType
    : "application/octet-stream";
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Content-Length": String(file.data.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
