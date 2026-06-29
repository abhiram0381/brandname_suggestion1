// Launcher for the preview MCP: the front-end calls http://localhost:3000/api
// by default, so pin PORT=3000, then hand off to the built server.
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
process.chdir(here);

process.env.PORT = process.env.PORT || "3000";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

await import(pathToFileURL(join(here, "dist", "index.mjs")).href);
