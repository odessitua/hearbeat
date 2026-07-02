/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ML_API_URL: string;
  readonly VITE_USE_MOCK: string;
  readonly VITE_FAMILY_PHONE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
