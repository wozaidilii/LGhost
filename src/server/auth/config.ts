import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { env } from "~/env";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/** Edge 互換 — middleware 用（Prisma アダプターなし） */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: env.AUTH_GOOGLE_ID ?? "",
      clientSecret: env.AUTH_GOOGLE_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
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
