import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Prisma を使わず authConfig だけで初期化 → Edge セーフ
const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};