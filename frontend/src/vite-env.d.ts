/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override API root (no trailing slash). Example: https://intex-backend-....azurewebsites.net */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
