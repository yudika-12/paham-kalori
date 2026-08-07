import { config } from "dotenv";
import fs from "fs";
import path from "path";

const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) config({ path: envLocal, quiet: true });
else config({ quiet: true });

import { app } from "./src/app";

export default app;