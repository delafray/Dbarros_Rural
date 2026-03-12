import path from 'path';
import { execSync } from 'child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ── Git: captura os ultimos 10 commits no build time ──────────────────────────
function getGitCommits(): { hash: string; date: string; author: string; subject: string; files: { status: string; path: string }[] }[] {
  try {
    const SEP = '@@COMMIT@@';
    const raw = execSync(
      `git log -10 --pretty=format:"${SEP}%h|%ai|%an|%s" --name-status`,
      { encoding: 'utf-8', timeout: 5000 },
    );
    return raw
      .split(SEP)
      .filter(Boolean)
      .map((block) => {
        const lines = block.trim().split('\n');
        const [hash, date, author, ...subjectParts] = lines[0].split('|');
        const subject = subjectParts.join('|'); // caso o subject tenha '|'
        const files = lines
          .slice(1)
          .filter((l) => /^[AMDRC]\t/.test(l))
          .map((l) => {
            const [status, ...pathParts] = l.split('\t');
            return { status: status.charAt(0), path: pathParts.join('\t') };
          });
        return { hash: hash.trim(), date: date.trim(), author: author.trim(), subject: subject.trim(), files };
      });
  } catch {
    console.warn('[vite] git log nao disponivel — git_history sera vazio no backup');
    return [];
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const gitCommits = getGitCommits();
  return {
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'assets/logo.png'],
        manifest: {
          name: 'Dbarros Rural',
          short_name: 'Dbarros',
          description: 'Gestão de eventos e atendimentos rurais',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',        // ← removes browser bar
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/assets/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: '/favicon.png', sizes: '32x32', type: 'image/png' }
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'tailwind-cache' },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__GIT_COMMITS__': JSON.stringify(gitCommits),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return id.toString().split('node_modules/')[1].split('/')[0].toString();
            }
          }
        }
      }
    }
  };
});
