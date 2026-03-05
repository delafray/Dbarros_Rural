import React from 'react';
import { User } from '../../services/authService';
import { PromoModalState } from '../../hooks/usePromoModal';

interface PromoModalProps {
    promoModal: NonNullable<PromoModalState>;
    allVisitors: User[];
    promoExpiresAt: string;
    onExpiresAtChange: (val: string) => void;
    promoCreated: { user: User; passwordRaw: string } | null;
    promoLoading: boolean;
    onClose: () => void;
    onConfirm: () => void;
    onCreate: () => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({
    promoModal,
    allVisitors,
    promoExpiresAt,
    onExpiresAtChange,
    promoCreated,
    promoLoading,
    onClose,
    onConfirm,
    onCreate,
}) => {
    const existingVisitor = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-black text-sm uppercase tracking-widest">Acesso ao Promotor</h2>
                        <p className="text-red-200 text-[10px] font-bold mt-0.5 uppercase tracking-wide truncate max-w-[260px]">{promoModal.edicao.titulo}</p>
                    </div>
                    <button onClick={onClose} className="text-red-200 hover:text-white p-1 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* STEP 1: Confirmação */}
                    {promoModal.step === 'confirm' && (
                        <>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Liberar acesso externo à planilha</p>
                                    <p className="text-[12px] text-slate-600 mt-1.5 leading-relaxed">
                                        Você está prestes a gerar um <strong>acesso temporário de leitura</strong> para um promotor ou representante externo. Essa pessoa poderá visualizar a planilha de vendas e o histórico de atendimentos desta edição — <strong>sem permissão para alterar nenhum dado</strong>.
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-2">Certifique-se de enviar as credenciais apenas para a pessoa autorizada.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={onConfirm} className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-colors">
                                    Entendido, prosseguir
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP 2a: Já existe visitante — só cópia */}
                    {promoModal.step === 'existing' && existingVisitor && (
                        <>
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                                <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
                                <p className="text-[11px] text-amber-800 font-bold">Já existe um acesso ativo para esta edição. Copie e envie as credenciais abaixo.</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 p-3 space-y-2 text-xs font-mono rounded-lg">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Usuário:</span>
                                    <div className="flex items-center gap-2">
                                        <code className="text-slate-800 font-black">{existingVisitor.email.replace('@temp.local', '')}</code>
                                        <button onClick={() => navigator.clipboard.writeText(existingVisitor.email.replace('@temp.local', ''))} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Senha:</span>
                                    <div className="flex items-center gap-2">
                                        {existingVisitor.tempPasswordPlain ? (
                                            <>
                                                <code className="text-slate-800 font-black tracking-wider">{existingVisitor.tempPasswordPlain}</code>
                                                <button onClick={() => navigator.clipboard.writeText(existingVisitor.tempPasswordPlain!)} className="text-[10px] text-blue-600 hover:underline font-sans">Copiar</button>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 italic font-sans text-[10px]">não disponível</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-sans font-bold uppercase text-[10px]">Expira em:</span>
                                    <code className="text-amber-700 font-black">{existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—'}</code>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <button
                                    onClick={() => {
                                        const login = existingVisitor.email.replace('@temp.local', '');
                                        const senha = existingVisitor.tempPasswordPlain ?? '(não disponível)';
                                        const expira = existingVisitor.expiresAt ? new Date(existingVisitor.expiresAt).toLocaleDateString('pt-BR') : '—';
                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${senha}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                        navigator.clipboard.writeText(msg);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Copiar texto para WhatsApp
                                </button>
                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                            </div>
                            <button onClick={onClose} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                        </>
                    )}

                    {/* STEP 2b: Nenhum visitante — criar novo */}
                    {promoModal.step === 'create' && (
                        <>
                            <p className="text-sm text-slate-600">Nenhum acesso ativo encontrado para esta edição. Defina a data de validade e gere o acesso.</p>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Data Limite de Acesso</label>
                                <input
                                    type="date"
                                    value={promoExpiresAt}
                                    onChange={e => onExpiresAtChange(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-red-500 text-sm font-bold text-slate-800 p-3 rounded-lg outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 hover:border-slate-500 transition-colors rounded-lg">
                                    Cancelar
                                </button>
                                <button
                                    onClick={onCreate}
                                    disabled={promoLoading || !promoExpiresAt}
                                    className="flex-1 py-2.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors rounded-lg"
                                >
                                    {promoLoading ? 'Gerando...' : 'Gerar Acesso'}
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP 3: Criado com sucesso */}
                    {promoModal.step === 'created' && promoCreated && (
                        <>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <p className="text-sm font-black text-slate-800">Acesso criado com sucesso!</p>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Login de Acesso</label>
                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 break-all">{promoCreated.user.email.replace('@temp.local', '')}</code>
                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.user.email.replace('@temp.local', ''))} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Senha</label>
                                    <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-lg">
                                        <code className="flex-1 px-3 py-2 text-sm font-black text-slate-800 tracking-wider">{promoCreated.passwordRaw}</code>
                                        <button onClick={() => navigator.clipboard.writeText(promoCreated.passwordRaw)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Copiar">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
                                        <span className="text-[9px] font-black text-amber-600 uppercase block mb-0.5">Expira em</span>
                                        <span className="text-xs font-black text-amber-900">{new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg">
                                        <span className="text-[9px] font-black text-blue-600 uppercase block mb-0.5">Acesso em</span>
                                        <span className="text-[10px] font-black text-blue-800">dbarros.vercel.app</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <button
                                    onClick={() => {
                                        const login = promoCreated.user.email.replace('@temp.local', '');
                                        const expira = new Date(promoCreated.user.expiresAt!).toLocaleDateString('pt-BR');
                                        const msg = `*Acesso Temporário - Dbarros Rural*\n\nOlá! Segue seu acesso de visitante para *${promoModal.edicao.titulo}*:\n\n🔗 *Link:* https://dbarros.vercel.app/#/login\n👤 *Usuário:* ${login}\n🔑 *Senha:* ${promoCreated.passwordRaw}\n\n📅 *Válido até:* ${expira}\n\nAcesse para visualizar a planilha e atendimentos.`;
                                        navigator.clipboard.writeText(msg);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-slate-800 hover:bg-slate-950 transition-colors rounded-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Copiar texto para WhatsApp
                                </button>
                                <p className="text-[10px] text-slate-400 text-center">Clique para copiar. Depois abra o WhatsApp e cole a mensagem pronta.</p>
                            </div>
                            <button onClick={onClose} className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-colors">Fechar</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
