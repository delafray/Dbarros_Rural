/** @type {import('tailwindcss').Config} */
// Migração do CDN (cdn.tailwindcss.com, v3, tema padrão) para build local.
// O CDN escaneava o DOM em runtime; aqui o scanner precisa ver TODOS os
// arquivos que contêm nomes de classe (inclusive strings em hooks/utils).
export default {
    content: [
        './index.html',
        './App.tsx',
        './index.tsx',
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './hooks/**/*.{ts,tsx}',
        './context/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './utils/**/*.{ts,tsx}',
        './services/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
