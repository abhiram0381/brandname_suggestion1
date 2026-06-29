// Launcher for the preview MCP: sets the env vars vite.config.ts requires,
// then hands off to vite. PORT is provided by the preview server.
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
process.chdir(here);

process.env.PORT = process.env.PORT || "5173";
process.env.BASE_PATH = "/";
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const { createServer } = await import("vite");
const server = await createServer({
  configFile: "vite.config.ts",
});
await server.listen();
server.printUrls();
