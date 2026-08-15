/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
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
          globIgnores: [
            'esquerda.png', 'direita.png', 'dbarros.png', 'chancela.png',
            // Fontes do PDF vetorial do A3 — carregadas sob demanda no export
            'fonts/*.ttf',
            // Chunks lazy: carregam sob demanda (backup/PDF); precachear tudo
            // forçava ~466 KB gzip extras a cada instalação do PWA
            'assets/backupService-*.js', 'assets/jspdf-*.js', 'assets/html2canvas-*.js',
            'assets/canvg-*.js', 'assets/jszip-*.js', 'assets/pako-*.js',
            'assets/svg-pathdata-*.js', 'assets/fast-png-*.js',
          ],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MiB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),
    ],
    // define: GEMINI_API_KEY e __GIT_COMMITS__ removidos — nada de segredo nem
    // metadado do git (mensagens/arquivos de commit) vai para o bundle publico
    // (auditoria F12 de 14/08/2026; o historico vive no GitHub privado).
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // ── Vitest: cobertura TRAVADA para o módulo de custos (RNF-014, ~90%) ─────
    // Escopo restrito aos arquivos do módulo: não pune o código legado, mas
    // FALHA o `npm run coverage:custos` se o módulo novo cair abaixo da meta.
    test: {
      coverage: {
        provider: 'v8' as const,
        include: [
          'utils/acessoCustos.ts',
          'utils/custosCalc.ts',
          'utils/parseBR.ts',
          'utils/descritivoSugestoes.ts',
          'utils/produtosGestao.ts',
          'services/custosService.ts',
          'services/fornecedoresService.ts',
          // hooks ficam FORA da régua: são orquestradores finos (padrão do
          // repo, como as páginas) e não há ambiente jsdom para testá-los —
          // toda lógica testável deles vive em utils/ e services/ (cobertos)
        ],
        thresholds: {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      // Não fazer modulepreload dos chunks pesados de export (jspdf etc.):
      // o preload eager faria o browser requisitá-los em TODA abertura do app,
      // anulando a exclusão deles do precache do PWA
      modulePreload: {
        resolveDependencies: (_url: string, deps: string[]) =>
          deps.filter((d) => !/backupService|jspdf|html2canvas|canvg|jszip|pako|svg-pathdata|fast-png/.test(d)),
      },
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
