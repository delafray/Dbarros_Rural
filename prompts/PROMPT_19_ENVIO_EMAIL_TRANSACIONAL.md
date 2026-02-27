# 📧 PROMPT: PROMPT_19_ENVIO_EMAIL_TRANSACIONAL (Edge Functions + Resend)

Este prompt descreve a arquitetura e os passos para implementar um sistema de envio de e-mails profissionais (com anexos e suporte a domínios personalizados) dentro do ecossistema Supabase.

## Arquitetura Sugerida

1.  **Provedor de E-mail:** [Resend](https://resend.com) (Recomendado pela facilidade e suporte a React Email).
2.  **Backend:** Supabase Edge Functions (Deno).
3.  **Segurança:** Chaves de API armazenadas no Supabase Vault/Secrets.
4.  **Armazenamento de Anexos:** Supabase Storage.

## Passo a Passo para Implementação

### 1. Configuração do Domínio (DNS)
Para enviar e-mails como `contato@feirax.com.br`, é obrigatório configurar os registros DNS (SPF, DKIM e DMARC) no provedor onde o domínio foi comprado. Isso garante que o e-mail não caia na caixa de SPAM.

### 2. Criação da Edge Function
Crie uma função no Supabase para processar o envio:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, subject, html, attachments, from_email } = await req.json()

  const { data, error } = await resend.emails.send({
    from: from_email || 'Seu App <onboarding@resend.dev>',
    to: to, // Pode ser um array para grupos
    subject: subject,
    html: html,
    attachments: attachments // Array de objetos { filename, content } ou links
  })

  if (error) return new Response(JSON.stringify(error), { status: 400 })
  return new Response(JSON.stringify(data), { status: 200 })
})
```

### 3. Chamada no Frontend
No seu aplicativo React, você chama a função assim:

```typescript
const enviarEmail = async (dados: any) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { 
      to: ['cliente@email.com'],
      subject: 'Assunto do E-mail',
      from_email: 'oficial@feira.com.br',
      html: '<h1>Olá!</h1><p>Segue informativo...</p>',
      attachments: [{ filename: 'contrato.pdf', content: base64Content }]
    }
  })
}
```

## Considerações Importantes
- **Envio em Lote:** O Resend permite enviar para vários destinatários de uma vez (Batch).
- **Anexos Grandes:** Para arquivos grandes, recomenda-se enviar um link do Supabase Storage em vez de anexar o arquivo inteiro no e-mail.
- **Limites:** Verifique a cota de envios diários do plano gratuito do Resend (atualmente 3.000 e-mails/mês).
