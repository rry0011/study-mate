import { signIn } from "@/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const CheckItem = ({ text }: { text: string }) => (
  <li style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569" }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
    {text}
  </li>
);

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const { error } = await searchParams;

  if (session) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 100%)",
        fontFamily: "'Inter', sans-serif",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* カード */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "48px 40px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #E2E8F0",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #6366F1 0%, #22D3EE 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "20px",
                color: "#0F172A",
                letterSpacing: "-0.3px",
              }}
            >
              StudyMate
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: "22px",
              fontWeight: 700,
              color: "#0F172A",
              margin: "0 0 8px",
            }}
          >
            アカウント登録
          </h1>
          <p style={{ fontSize: "14px", color: "#64748B", margin: "0 0 24px", lineHeight: 1.6 }}>
            無料で始めて、いつでもどこでも学習を進めましょう
          </p>

          {/* 特典リスト */}
          <ul
            style={{
              listStyle: "none",
              margin: "0 0 28px",
              padding: "16px",
              background: "#F8FAFC",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <CheckItem text="100以上のコースに無料アクセス" />
            <CheckItem text="学習進捗の自動トラッキング" />
            <CheckItem text="講師への質問・フォーラム参加" />
            <CheckItem text="修了証の発行" />
          </ul>

          {/* エラー表示 */}
          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#DC2626",
              }}
            >
              {error === "OAuthAccountNotLinked"
                ? "このメールアドレスはすでに別の方法で登録されています"
                : "登録に失敗しました。もう一度お試しください"}
            </div>
          )}

          {/* Google 登録ボタン（Server Action） */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                padding: "12px 20px",
                background: "white",
                border: "1.5px solid #E2E8F0",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: 600,
                color: "#0F172A",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <GoogleIcon />
              Google で登録
            </button>
          </form>

          {/* 区切り線 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "20px 0",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
            <span style={{ fontSize: "12px", color: "#94A3B8", whiteSpace: "nowrap" }}>
              すでにアカウントをお持ちの方
            </span>
            <div style={{ flex: 1, height: "1px", background: "#E2E8F0" }} />
          </div>

          {/* ログインリンク */}
          <Link
            href="/login"
            style={{
              display: "block",
              width: "100%",
              padding: "11px 20px",
              textAlign: "center",
              borderRadius: "10px",
              border: "1.5px solid #6366F1",
              color: "#6366F1",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            ログインはこちら
          </Link>

          {/* 利用規約 */}
          <p
            style={{
              fontSize: "12px",
              color: "#94A3B8",
              textAlign: "center",
              marginTop: "20px",
              lineHeight: 1.6,
            }}
          >
            登録することで
            <a href="/terms" style={{ color: "#6366F1", textDecoration: "none" }}>利用規約</a>
            および
            <a href="/privacy" style={{ color: "#6366F1", textDecoration: "none" }}>プライバシーポリシー</a>
            に同意したものとみなされます
          </p>
        </div>

        {/* カード外フッター */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "#94A3B8", marginTop: "16px" }}>
          © 2025 LearnFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
}