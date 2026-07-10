import React, { useEffect, useMemo, useState } from 'react';
import { eventosService } from '../../services/eventosService';

interface EdicaoOption {
  id: string;
  label: string;
}

interface EventoEdicaoSelectProps {
  /** Nome atual do projeto (texto livre) */
  nome: string;
  /** Emitido a cada digitação: nome sempre preenchido; edicaoId só quando o texto casa com uma edição cadastrada */
  onChange: (value: { nome: string; edicaoId: string | null }) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Seletor híbrido de evento: sugere as edições de eventos cadastradas no
 * sistema (datalist), mas aceita qualquer nome livre. Se o texto digitado
 * for exatamente uma sugestão, o projeto fica vinculado à edição (edicaoId).
 */
export const EventoEdicaoSelect: React.FC<EventoEdicaoSelectProps> = ({
  nome,
  onChange,
  placeholder = 'Ex: 91ª EXPOZEBU, Campolina 2026...',
  autoFocus = false,
}) => {
  const [opcoes, setOpcoes] = useState<EdicaoOption[]>([]);

  useEffect(() => {
    eventosService
      .getAllEdicoes()
      .then((edicoes: any[]) => {
        setOpcoes(
          edicoes.map((e) => ({
            id: e.id,
            label: e.eventos?.nome
              ? `${e.eventos.nome} — ${e.titulo} (${e.ano})`
              : `${e.titulo} (${e.ano})`,
          }))
        );
      })
      // Sem edições visíveis (RLS) ou erro → segue só com nome livre
      .catch(() => setOpcoes([]));
  }, []);

  const byLabel = useMemo(() => {
    const map = new Map<string, string>();
    opcoes.forEach((o) => map.set(o.label, o.id));
    return map;
  }, [opcoes]);

  const handleChange = (text: string) => {
    onChange({ nome: text, edicaoId: byLabel.get(text) ?? null });
  };

  return (
    <>
      <input
        type="text"
        list="cardapio-evento-edicoes"
        value={nome}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-700 bg-white"
      />
      <datalist id="cardapio-evento-edicoes">
        {opcoes.map((o) => (
          <option key={o.id} value={o.label} />
        ))}
      </datalist>
    </>
  );
};

export default EventoEdicaoSelect;
