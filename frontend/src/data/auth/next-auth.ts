import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { SignJWT, jwtVerify } from "jose";
import type { JWTEncodeParams, JWTDecodeParams } from "next-auth/jwt";
import { AuthService } from "@/server/services/auth.service";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

async function encode({ token, maxAge }: JWTEncodeParams): Promise<string> {
  const payload = {
    ...(token as Record<string, unknown>),
    iat: undefined,
    exp: undefined,
  };
  const expiresInSeconds = maxAge ?? 60 * 60 * 24 * 30;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + expiresInSeconds * 1000).getTime())
    .sign(secretKey());
}

async function decode({ token }: JWTDecodeParams): Promise<import("jose").JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  jwt: { encode, decode },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const user = await new AuthService().login(email, password);
          if (!user?.id) return null;
          return { id: user.id, name: user.name, email: user.email };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});