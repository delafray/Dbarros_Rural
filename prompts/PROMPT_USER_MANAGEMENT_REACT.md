# Prompt Master: Gestão Avançada de Usuários e Gerador de Acessos Temporários (React + Supabase)

> **Objetivo Final:** Ensinar a IA a arquitetar uma tela de Administração de Usuários incrivelmente sofisticada. O problema comum é IAs criarem telas "CRUD Básicas" (um formulário longo e chato de checkboxes). Este prompt dita como construir uma **Grade de Funções Assimétrica** visual e um **Gerador de Usuários Temporários** (com expiração automática e botão de compartilhar no WhatsApp) para encantar o cliente.

---

## 🛑 1. O Desafio do "Cadastro de Usuário" no Supabase Auth

Quando o Administrador logado tenta criar um novo usuário usando a função clássica do frontend `supabase.auth.signUp()`, o Supabase (por padrão de segurança) **desloga** o Administrador na hora e faz login na conta nova.
- Para contornar isso *sem precisar programar uma Edge Function complexa de Admin API*, a solução é garantir que a opção "Confirm Email" esteja **Ativada** ou tratar a inserção dupla (Auth + Tabela Public).

## 🧩 2. O Padrão Ouro: Grade Assimétrica de Níveis de Acesso

IAs tendem a fazer uma lista de `<input type="checkbox">` para permissões (Ex: [ ] Admin, [ ] Visitante, [ ] Projetista).
**Isso é um horror de UX (Experiência do Usuário).** 

A IA **DEVE** construir uma Grade de Cartões Interativos onde apenas UMA Função mestre pode ser escolhida, liberando as sub-permissões embaixo. Veja a arquitetura de estado obrigatória:

```tsx
// Regra Obrigatória para a IA: 
// Se o Admin clica em "Visitante", TODAS as outras permissões Master desligam!

<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {/* Cartão 1: Admin */}
    <label className={`cursor-pointer p-4 border-2 transition-all relative overflow-hidden ${isAdmin ? 'border-blue-600 bg-blue-50 shadow-[4px_4px_0px_#2563eb] -translate-y-1' : 'border-slate-200 bg-white'}`}>
        <input type="checkbox" className="sr-only" checked={isAdmin} onChange={e => {
            setIsAdmin(e.target.checked);
            // DESLIGA CONCORRENTES IMEDIATAMENTE
            if (e.target.checked) { setIsVisitor(false); setIsProjetista(false); }
        }} />
        <span className="font-black uppercase text-blue-700">Super Admin</span>
    </label>
    
    {/* Cartão 2: Projetista (Exemplo Laranja Diferenciado) */}
    {/* Cartão 3: Visitante (Exemplo Verde Diferenciado) */}
</div>

{/* Sub-permissões Condicionais Abaixo */}
<div className={`transition-all duration-300 ${isAdmin ? 'opacity-100 max-h-24' : 'opacity-0 max-h-0'}`}>
    <label>
        <input type="checkbox" checked={canManageTags} onChange={e => setCanManageTags(e.target.checked)}/>
        Master Diretor (Pode Gerir Tags)
    </label>
</div>
```

## ⏳ 3. A "Cereja do Bolo": Gerador de Acessos Temporários 

Esta é a funcionalidade que mais impressiona clientes corporativos. A IA deve ensinar o sistema a ter um botão que, em 1 clique, cria um usuário descartável com validade de dias configurada.

### A. A Lógica do Backend (Service)

No TypeScript de serviços auth, a IA deve criar um método gerador criptográfico rápido:

```typescript
export const authService = {
  createTempUser: async (days: number): Promise<{ user: User, passwordRaw: string }> => {
      // 1. Gera nomes e emails falsos na memória
      const tempEmail = `temp_${Math.random().toString(36).substring(7)}@temp.local`;
      const tempPassword = Math.random().toString(36).substring(2, 10);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      // 2. Assina o usuário no Supabase Auth
      const { data: authData } = await supabase.auth.signUp({ email: tempEmail, password: tempPassword });

      // 3. Força o perfil na tabela pública sinalizando "is_temp: true"
      const { data } = await supabase.from('users').insert({
          id: authData.user.id,
          email: tempEmail,
          is_visitor: true, // Força a ser visitante restrito
          is_temp: true,
          expires_at: expiresAt.toISOString()
      }).select().single();

      return { user: data, passwordRaw: tempPassword };
  }
}
```

### B. O Modal de Partilha Automática (Frontend)

Quando o serviço acima retornar o sucesso, a IA **DEVE** criar um `<Modal>` estético verde-sucesso que não apenas avisa que deu certo, mas monta um botão mágico "Copiar para WhatsApp".

```tsx
const handleCopyTempUser = () => {
    const message = `*Acesso Temporário*\n\n` +
        `🔗 *Link:* https://meuapp.com/login\n` +
        `👤 *Email:* ${createdTempUser.user.email}\n` +
        `🔑 *Senha:* ${createdTempUser.passwordRaw}\n\n` +
        `📅 *Válido até:* ${new Date(createdTempUser.user.expiresAt).toLocaleDateString()}`;

    navigator.clipboard.writeText(message);
    showAlert('Sucesso', 'Copiado para WhatsApp!', 'success');
};

return (
    <Button onClick={handleCopyTempUser} className="bg-green-600 hover:bg-green-700">
        📋 Copiar Convite para WhatsApp
    </Button>
)
```

---

Qualquer IA que aplicar esta metodologia de "Temporary User" ganhará horas de trabalho de implementação manual, e resolverá o maior problema de Onboarding e de segurança em projetos B2B evitando com que o cliente final passe sua própria senha do sistema adiante.
