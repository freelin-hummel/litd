/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_HOCUSPOCUS_URL?: string;
	readonly VITE_HOCUSPOCUS_TOKEN?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
