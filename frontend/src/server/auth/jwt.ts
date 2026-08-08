import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

export async function signTokenImpl(
  payload: Record<string, unknown>,
  expiresIn: string | number = "30d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn as never)
    .sign(secretKey());
}

export async function verifyTokenImpl(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
  return payload;
}