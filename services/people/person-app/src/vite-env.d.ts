/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the API URL that App.tsx derives from the page's host. */
  readonly VITE_PERSON_API_URL?: string;
}
