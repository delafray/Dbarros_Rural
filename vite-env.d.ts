/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly GEMINI_API_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

// Build-time git commits injected by vite.config.ts
interface GitFileChange { status: string; path: string }
interface GitCommit { hash: string; date: string; author: string; subject: string; files: GitFileChange[] }
declare const __GIT_COMMITS__: GitCommit[]
