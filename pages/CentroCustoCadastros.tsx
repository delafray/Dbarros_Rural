/**
 * Cadastros do Centro de Custo (RF-059) — tela própria com botão voltar.
 * Hub dos cadastros-base do módulo: Produtos do catálogo, Espaços padrão…
 * (mais itens entram aqui conforme o usuário pedir — lista aberta).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/UI';
import { ProdutosManager } from '../components/custos/ProdutosManager';
import { EspacosPadraoManager } from '../components/custos/EspacosPadraoManager';

type Secao = 'produtos' | 'espacos';

const CentroCustoCadastros: React.FC = () => {
    const navigate = useNavigate();
    const [secao, setSecao] = useState<Secao>('produtos');

    return (
        <Layout title="Cadastros — Centro de Custo">
            <div className="mx-auto max-w-4xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={() => navigate('/custos')}>← Voltar</Button>
                    {([
                        ['produtos', '📦 Produtos'],
                        ['espacos', '🏗️ Espaços padrão'],
                    ] as [Secao, string][]).map(([id, rotulo]) => (
                        <button key={id}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${secao === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            onClick={() => setSecao(id)}>
                            {rotulo}
                        </button>
                    ))}
                </div>

                <ProdutosManager aberto={secao === 'produtos'} />
                <EspacosPadraoManager aberto={secao === 'espacos'} />
            </div>
        </Layout>
    );
};

export default CentroCustoCadastros;
