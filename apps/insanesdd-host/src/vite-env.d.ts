/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UXDS_REMOTE_ENTRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
