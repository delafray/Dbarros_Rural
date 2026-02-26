# Prompt: Restaurar Sistema de Fotos e Tags

> **Objetivo:** Este documento orienta como reativar os menus de "Fotos" e "Tags de Busca" que foram ocultados para simplificar a interface focada em Eventos.

## 🛠️ Passo a Passo para Restauração

Para restaurar os itens no menu lateral (Sidebar), siga estas instruções:

1.  **Localize o arquivo:** `c:/Users/ronal/Documents/Antigravity/VendasEventos/components/Layout.tsx`
2.  **Identifique a Seção de Navegação:** Procure pela div com o rótulo "Arquivos" (por volta da linha 148).
3.  **Descomente as Linhas:** Remova os marcadores de comentário `{/* ... */}` das seguintes linhas:

```tsx
// Local original no arquivo Layout.tsx
<div className="pt-2 md:pt-4 pb-1 md:pb-2 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Arquivos</div>

{/* REMOVA O COMENTÁRIO DA LINHA ABAIXO */}
<NavItem to="/fotos" label="Fotos" icon={CameraIcon} />

<NavItem to="/itens-opcionais" label="Itens Opcionais" icon={PlusCircleIcon} />

{/* REMOVA O COMENTÁRIO DA LINHA ABAIXO */}
{user?.canManageTags && <NavItem to="/tags" label="Tags de Busca" icon={TagIcon} />}
```

## 📋 Verificação Pós-Restauração

Após descomentar:
1.  O menu **Fotos** deve reaparecer para todos os usuários logados.
2.  O menu **Tags de Busca** deve reaparecer apenas para usuários que tenham a permissão `canManageTags` ativada em seu perfil (gerenciado em Usuários).

---
*Criado em 26/02/2026 para fins de manutenção futura.*
