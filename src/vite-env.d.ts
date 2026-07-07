/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.wav' {
  const src: string;
  export default src;
}
