// Ambient typing for the Vite-injected env this client reads. The package is
// always bundled by the frontend (where Vite replaces `import.meta.env`), but
// declaring the shape here lets it type-check standalone without depending on
// `vite/client`.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
