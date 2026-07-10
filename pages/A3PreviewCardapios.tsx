import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { cardapioService } from '../services/cardapioService';
import { cardapioProjetosService } from '../services/cardapioProjetosService';
import { CardapioTema } from '../utils/cardapioTema';
import { A3DuploCanvas, A3DuploMenuData } from '../components/a3Duplo/A3DuploCanvas';

export const A3PreviewCardapios: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedIds, projetoId } =
    (location.state as { selectedIds?: string[]; projetoId?: string }) || {};

  const [menus, setMenus] = useState<A3DuploMenuData[] | null>(null);
  const [tema, setTema] = useState<Partial<CardapioTema> | null>(null);

  useEffect(() => {
    if (!selectedIds || selectedIds.length === 0) {
      navigate('/cardapios');
      return;
    }
    const loadMenus = async () => {
      try {
        const loaded = await Promise.all(selectedIds.map((id) => cardapioService.buscar(id)));
        setMenus(loaded.filter(Boolean) as A3DuploMenuData[]);
      } catch (err) {
        console.error('Erro ao carregar cardápios para o A3:', err);
        alert('Erro ao carregar cardápios selecionados.');
      }
    };
    loadMenus();
  }, [selectedIds, navigate]);

  // Tema do projeto (só cores no A3) — falha silenciosa → visual padrão
  useEffect(() => {
    if (!projetoId) return;
    cardapioProjetosService
      .buscar(projetoId)
      .then((p) => setTema(p?.tema ?? null))
      .catch(() => setTema(null));
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

  return <A3DuploCanvas menus={menus} tema={tema} />;
};

export default A3PreviewCardapios;
