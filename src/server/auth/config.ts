import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/** Edge 互換 — middleware 用（Prisma / env.js を import しない） */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  // Vercel / カスタムドメインでは必須
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? "",
      },
    }),
    signIn: ({ user, account }) => {
      // OAuth 成功時のみ DB 書き込みが走る — 失敗時はログに残す
      if (!user?.email && account?.provider === "google") {
        console.error("[auth] Google signIn: no email returned");
        return false;
      }
      return true;
    },
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;
      const isAuthPage = pathname.startsWith("/login");
      const isApiAuth = pathname.startsWith("/api/auth");

      if (isAuthPage || isApiAuth) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
