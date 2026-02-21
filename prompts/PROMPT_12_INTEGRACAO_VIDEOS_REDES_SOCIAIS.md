# Prompt Master: Integração Oculta de Redes Sociais no Banco (Bypassing CORS)

> **Objetivo Final:** Ensinar a Inteligência Artificial a NUNCA extrair miniaturas (Thumbnails/Capa) de redes sociais ou servidores de bloqueio de terceiros usando o Navegador do Cliente puro (Front-end). Redes como Instagram ou APIs Fechadas irão jogar na cara do sistema um erro de `CORS Block` ou expirar chaves públicas. A IA deve arquitetar um Servidor Oculto Neutro (Proxy Back-end / Edge Function do Supabase) que faz o roubo silencioso do conteúdo de forma confiável e com alta tolerância a falhas.

---

## 🛑 1. O Canto da Sereia do JavaScript Front-end

Se você pedir pra uma IA "Puxar a Foto de Capa do link do Instagram que o usuário colou", a primeira tentativa dela vai ser rodar um `fetch('https://instagram.com/...')` diretamente de dentro do Google Chrome do seu usuário (React). 
O Servidor do Facebook/Meta vai ver a requisição vindo do celular "Joãozinho", olhar para o seu site (meuapp.com) e dizer: **Acesso Negado. Bloqueio CORS de Origem Cruzada**.
O usuário recebe um erro vermelho fantasma ou ícones quebrados (`<img>` com Xizinho). E seu banco de dados fica com cadastros sujos.

## 🛠️ 2. A Solução: Arquitetura Proxy com Funções de Borda (Edge Functions)

Instrua a Inteligência Artificial a contornar o navegador cruzado dividindo o trabalho em 2 partes: O Frontend passa a "fofoca", e um Agente Oculto do seu Banco de Dados faz o roubo pesado através da rede neutra da AWS/Vercel.

### Parte A: O Robô Servidor (Supabase Edge Function)

Crie num arquivo `.ts` (Ex: `supabase/functions/instagram-thumbnail/index.ts`):

```typescript
// FUNÇÃO ISOLADA DO SERVIDOR (Esta linha verde NUNCA roda no celular do usuário)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Configurações Liberais de CORS (Nós autorizamos o Nossso App de Falar com Essa Funçãozinha)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error('Cade o link?');

    // MÁGICA 1: Extrai a alma da requisição com Regex
    const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!shortcodeMatch) throw new Error('Formato Invalido');
    
    // MÁGICA 2: Acessa uma API Neutra ou Pública fingindo ser o Safari usando o IP Deste Servidor!
    // Exemplo Simples via OEmbed ou Raspagem HTML Puro do Meta Tags <meta property="og:image">
    const fetchRes = await fetch(`https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcodeMatch[1]}/`);
    const data = await fetchRes.json();

    // Entrega Ouro de Volta pro Cliente Mastigado!
    return new Response(
      JSON.stringify({ thumbnailUrl: data.thumbnail_url }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
```

### Parte B: O Serviço Front-end Conectando a Ponta

Apenas após a IA fabricar o canhão de trás, você libera que o React chame ele com um Fallback poderoso:

```typescript
// Dentro do seu Utils.ts do Frontend
export const fetchInstagramThumbnailSeguro = async (instagramUrl: string): Promise<string | null> => {
    try {
        // Envia o link puro pra O NOSSO SERVIDOR no Supabase, contornando a Internet Externa!
        const resp = await fetch(
            'https://sua-url-do-supabase.supabase.co/functions/v1/instagram-thumbnail',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: instagramUrl }),
            }
        );
        
        if (!resp.ok) return null; // Tolerância à Falha (Não quebra o App se der ruim)
        const data = await resp.json();
        
        // Retorna a Imagem Limpa que o Servidor Extraiu via Proxy
        return data.thumbnailUrl || null;
        
    } catch {
        // Silêncio Elegante de Falhas
        return null; // O dev usa uma capa padrão Cinza no App se cair aqui.
    }
};
```

### Dica Extras de YouTube (MaxResFallback)

Para YouTube, a mesma lógica se aplica caso queiramos usar, mas o YouTube tem URLs abertas previsíveis `img.youtube.com/vi/ID/maxresdefault.jpg`. Instrua a IA que o YouTube retorna `120px` se a imagem não existir em 1080p, logo a IA deve arquitetar um fallback tentando carregar a `maxresdefault`, lendo a propriedade `.width`, e se for menor que `120`, recuar imediatamente para a versão menor `hqdefault.jpg`.

---

Aplicando este modelo de Bypassing API (Usando Proxies de Servidor Próprio), nenhuma API Fechada como Meta, Twitter, LinkedIn ou Facebook conseguirá impedir que o seu App extraia OpenTags Dinâmicas (OG:Image / Miniaturas) porque as chaves rodam em Servidor Protegido e mascarado!
