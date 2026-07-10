import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { menuA4Service } from '../services/menuA4Service';
import { cardapioProjetosService, CardapioProjeto } from '../services/cardapioProjetosService';
import { A3DuploCanvas, A3DuploMenuData } from '../components/a3Duplo/A3DuploCanvas';

export const A3PreviewA4: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIds, projetoId } =
    (location.state as { selectedIds?: string[]; projetoId?: string }) || {};

  const [menus, setMenus] = useState<A3DuploMenuData[] | null>(null);
  const [projeto, setProjeto] = useState<CardapioProjeto | null>(null);

  useEffect(() => {
    if (!selectedIds || selectedIds.length === 0) {
      navigate('/cardapios');
      return;
    }
    const loadMenus = async () => {
      try {
        const loaded = await Promise.all(selectedIds.map((id) => menuA4Service.buscar(id)));
        setMenus(loaded.filter(Boolean) as A3DuploMenuData[]);
      } catch (err) {
        console.error('Erro ao carregar menus para o A3:', err);
        alert('Erro ao carregar menus selecionados.');
      }
    };
    loadMenus();
  }, [selectedIds, navigate]);

  // Tema e fundo A3 do projeto — falha silenciosa → visual padrão
  useEffect(() => {
    if (!projetoId) return;
    cardapioProjetosService
      .buscar(projetoId)
      .then(setProjeto)
      .catch(() => setProjeto(null));
  }, [projetoId]);

  if (!menus) {
    return (
      <Layout title="Carregando...">
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <A3DuploCanvas
      menus={menus}
      tema={projeto?.tema ?? null}
      fundoUrl={projeto?.fundo_a3_url ?? null}
      fontesIniciais={projeto?.fontes_a3 ?? null}
      onSalvarAjustes={
        projetoId
          ? async ({ fontes, tema }) => {
              const atualizado = await cardapioProjetosService.atualizar(projetoId, {
                fontes_a3: fontes,
                tema,
              });
              // mantém a cópia em memória fresca (evita "voltar ao padrão"
              // fantasma se a tela remontar depois do salvamento)
              setProjeto(atualizado);
            }
          : undefined
      }
    />
  );
};

export default A3PreviewA4;
