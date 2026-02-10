<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SubControl - Sistema de Gestão de Projetos e Galeria de Fotos

Sistema completo para gestão de clientes, projetos, galeria de fotos com tags.

## 🚀 Deploy na Vercel

### Passo 1: Preparar o Repositório
O projeto já está configurado com `vercel.json` para deploy automático.

### Passo 2: Conectar com a Vercel
1. Acesse [vercel.com](https://vercel.com)
2. Faça login e clique em "Add New Project"
3. Importe o repositório do GitHub: `delafray/GaleriaDeFotos`
4. A Vercel detectará automaticamente que é um projeto Vite

### Passo 3: Configurar Variáveis de Ambiente
Na configuração do projeto na Vercel, adicione as seguintes variáveis:

```
VITE_SUPABASE_URL=https://zamknopwowugrjapoman.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
GEMINI_API_KEY=sua_chave_gemini_aqui (opcional)
```

### Passo 4: Deploy
Clique em "Deploy" e aguarde. A Vercel fará o build e publicará automaticamente.

## 💻 Executar Localmente

**Pré-requisitos:** Node.js (versão 18 ou superior)

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/delafray/GaleriaDeFotos.git
   cd GaleriaDeFotos
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Copie `.env.example` para `.env.local`
   - Preencha com suas credenciais do Supabase

4. **Execute o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse:** http://localhost:3000

## 📦 Build de Produção

```bash
npm run build
npm run preview  # Para testar o build localmente
```

## 🛠️ Tecnologias

- **Frontend:** React 19, TypeScript, Vite
- **Roteamento:** React Router DOM
- **Estilização:** TailwindCSS
- **Backend:** Supabase (PostgreSQL)
- **Deploy:** Vercel

## 📝 Estrutura do Projeto

```
GaleriaDeFotos/
├── components/      # Componentes reutilizáveis
├── pages/          # Páginas da aplicação
├── services/       # Serviços (API, Supabase)
├── types.ts        # Definições TypeScript
└── vercel.json     # Configuração Vercel
```

## 🔒 Segurança

- Variáveis sensíveis devem estar no `.env.local` (nunca commitar!)
- O arquivo `.env.example` mostra quais variáveis são necessárias
- Autenticação via localStorage (para ambientes de produção, considere soluções mais robustas)
