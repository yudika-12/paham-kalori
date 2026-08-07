import { config } from "dotenv";
import fs from "fs";
import path from "path";

const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) config({ path: envLocal, quiet: true });
else config({ quiet: true });

import { serve } from "@hono/node-server";
import { app } from "./app";

const PORT = Number(process.env.PORT || 4000);

if (!process.env.AUTH_SECRET) {
  console.warn("Peringatan: AUTH_SECRET belum diatur. Sesi tidak valid untuk dipakai bersama frontend.");
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Paham Kalori API berjalan di http://localhost:${info.port}`);
});