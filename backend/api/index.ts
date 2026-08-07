import { config } from "dotenv";
import fs from "fs";
import path from "path";

const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) config({ path: envLocal, quiet: true });
else config({ quiet: true });

import { handle } from "hono/vercel";
import { app } from "../src/app";

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);