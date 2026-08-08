import { handle } from "hono/vercel";
import { app } from "@/server/app";

export const POST = handle(app);