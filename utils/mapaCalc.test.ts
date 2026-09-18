import { describe, it, expect } from 'vitest';
import {
    normalizarCodigo, codigoDaPlanta, statusDoEstande, indexarPlanilha, linhaDoEstande,
    resumoPorFamilia, resumoGeral, estandesForaDoMapa, parseViewBox, pontosParaAtributo,
    nomeClienteDaLinha, bboxDePontos, tamanhoFonteRotulo, clampZoom, zoomComRoda, panParaZoomNoPonto,
    proximoTipoVenda, statusAposClique, transicaoCliqueMapa, STAND_PADRAO,
    ESTILO_STATUS, ORDEM_STATUS, type EstandeMapa, type LinhaPlanilhaMapa, type ClienteNome,
} from './mapaCalc';

const est = (codigo: string, familia = codigo[0]): EstandeMapa => ({
    codigo, stand_nr: codigo.replace('-', ' '), familia, pontos: [[0, 0], [1, 0], [1, 1], [0, 1]], centro: [0.5, 0.5],
});

describe('normalizarCodigo (planta "P-01" ⇄ planilha "P 01")', () => {
    it('converte hífen, sem separador e minúsculas para o formato da planilha', () => {
        expect(normalizarCodigo('P-01')).toBe('P 01');
        expect(normalizarCodigo('p01')).toBe('P 01');
        expect(normalizarCodigo('P 1')).toBe('P 01');
        expect(normalizarCodigo(' L-20 ')).toBe('L 20');
    });
    it('aceita família com 2 ou 3 letras (PR-01 da pista, AL 03)', () => {
        expect(normalizarCodigo('PR-01')).toBe('PR 01');
        expect(normalizarCodigo('pr01')).toBe('PR 01');
        expect(normalizarCodigo('AL 3')).toBe('AL 03');
        expect(normalizarCodigo('ABCD-01')).toBeNull();
    });
    it('devolve null para o que não é código', () => {
        expect(normalizarCodigo('')).toBeNull();
        expect(normalizarCodigo(null)).toBeNull();
        expect(normalizarCodigo('25m²')).toBeNull();
        expect(normalizarCodigo('AL PREMIUM 01')).toBeNull();
    });
    it('codigoDaPlanta faz o caminho inverso e preserva o que não reconhece', () => {
        expect(codigoDaPlanta('P 01')).toBe('P-01');
        expect(codigoDaPlanta('XYZ')).toBe('XYZ');
    });
});

describe('statusDoEstande (marcas da planilha)', () => {
    it('sem linha na planilha → sem_planilha', () => {
        expect(statusDoEstande(undefined)).toBe('sem_planilha');
        expect(statusDoEstande(null)).toBe('sem_planilha');
    });
    it('DISPONÍVEL sem cliente → livre', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL' })).toBe('livre');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: null })).toBe('livre');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: '' })).toBe('livre');
    });
    it('x (tipo de venda sem *) → vendido, seja STAND PADRÃO ou COMBO', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO' })).toBe('vendido');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 03' })).toBe('vendido');
    });
    it('* (cortesia/permuta) → cortesia', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO*' })).toBe('cortesia');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 01*' })).toBe('cortesia');
    });
    it('RESERVADO <rótulo>* → reservado (status de verdade, vale zero por causa do *)', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'RESERVADO COMBO 01*', cliente_id: 'c1' })).toBe('reservado');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'RESERVADO STAND PADRÃO*' })).toBe('reservado');
    });
    it('cliente anotado sem marca nenhuma → cliente_sem_status (ERRO a corrigir), id ou nome livre', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_id: 'c1' })).toBe('cliente_sem_status');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: 'Fulano' })).toBe('cliente_sem_status');
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: '   ' })).toBe('livre');
    });
    it('venda com cliente continua vendido (x manda sobre reserva)', () => {
        expect(statusDoEstande({ stand_nr: 'P 01', tipo_venda: 'COMBO 02', cliente_id: 'c1' })).toBe('vendido');
    });
});

describe('proximoTipoVenda / statusAposClique (clique de novo no estande selecionado)', () => {
    it('vazio ou DISPONÍVEL → STAND PADRÃO (x); x → reservado do mesmo rótulo', () => {
        expect(proximoTipoVenda(null)).toBe(STAND_PADRAO);
        expect(proximoTipoVenda('')).toBe(STAND_PADRAO);
        expect(proximoTipoVenda('DISPONÍVEL')).toBe(STAND_PADRAO);
        expect(proximoTipoVenda('  DISPONÍVEL ')).toBe(STAND_PADRAO);
        expect(proximoTipoVenda('STAND PADRÃO')).toBe('RESERVADO STAND PADRÃO*');
        expect(proximoTipoVenda('COMBO 02')).toBe('RESERVADO COMBO 02*');
    });
    it('reservado → cortesia (mesmo rótulo com *)', () => {
        expect(proximoTipoVenda('RESERVADO STAND PADRÃO*')).toBe('STAND PADRÃO*');
        expect(proximoTipoVenda('RESERVADO COMBO 02*')).toBe('COMBO 02*');
    });
    it('cortesia → DISPONÍVEL (fecha o ciclo, igual à célula da planilha)', () => {
        expect(proximoTipoVenda('STAND PADRÃO*')).toBe('DISPONÍVEL');
        expect(proximoTipoVenda('COMBO 02*')).toBe('DISPONÍVEL');
    });
    it('ciclo completo: livre → vendido → reservado → cortesia → livre', () => {
        const l = { stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_id: 'c1' };
        const t1 = proximoTipoVenda(l.tipo_venda);
        const t2 = proximoTipoVenda(t1);
        const t3 = proximoTipoVenda(t2);
        const t4 = proximoTipoVenda(t3);
        expect(statusDoEstande({ ...l, tipo_venda: t1 })).toBe('vendido');
        expect(statusDoEstande({ ...l, tipo_venda: t2 })).toBe('reservado');
        expect(statusDoEstande({ ...l, tipo_venda: t3 })).toBe('cortesia');
        expect(t4).toBe('DISPONÍVEL');
    });
    it('status não exige cliente: livre sem cliente → vendido direto (cliente vem depois)', () => {
        const l = { stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL' };
        expect(transicaoCliqueMapa(l).updates).toEqual({ tipo_venda: 'STAND PADRÃO' });
        expect(statusAposClique(l)).toBe('vendido');
    });
    it('cliente sem status (erro) → vendido direto, mantendo o cliente', () => {
        const l = { stand_nr: 'P 01', tipo_venda: 'DISPONÍVEL', cliente_nome_livre: 'Fulano' };
        expect(transicaoCliqueMapa(l).updates).toEqual({ tipo_venda: 'STAND PADRÃO' });
        expect(statusAposClique(l)).toBe('vendido');
    });
    it('o clique NUNCA toca no cliente: cortesia com cliente → livre vira cliente_sem_status (oscila até limpar no modal)', () => {
        const c = { stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO*', cliente_id: 'c1' };
        const t = transicaoCliqueMapa(c);
        expect(t.updates).toEqual({ tipo_venda: 'DISPONÍVEL' });
        expect('cliente_id' in t.updates).toBe(false);
        expect(statusAposClique(c)).toBe('cliente_sem_status');
    });
    it('ciclo inteiro com cliente: vendido → reservado → cortesia, cliente intacto em todos', () => {
        const l = { stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO', cliente_id: 'c1' };
        const t1 = transicaoCliqueMapa(l);
        expect(t1.updates).toEqual({ tipo_venda: 'RESERVADO STAND PADRÃO*' });
        const v = { ...l, ...t1.updates };
        expect(statusDoEstande(v)).toBe('reservado');
        const c = { ...v, ...transicaoCliqueMapa(v).updates };
        expect(statusDoEstande(c)).toBe('cortesia');
        expect(c.cliente_id).toBe('c1');
    });
    it('sem linha na planilha → não há próximo status', () => {
        expect(statusAposClique(undefined)).toBe('sem_planilha');
    });
});

describe('estilos', () => {
    it('todo status tem estilo; vendido = verde e livre = azul da planilha', () => {
        for (const s of ORDEM_STATUS) expect(ESTILO_STATUS[s].fill).toMatch(/^#[0-9A-F]{6}$/i);
        expect(ESTILO_STATUS.vendido.fill).toBe('#00B050');
        expect(ESTILO_STATUS.livre.fill).toBe('#00B0F0');
        // Identidade visual distinta por status: cor fixa OU cor que oscila (reservado pisca entre azuis).
        expect(new Set(ORDEM_STATUS.map((s) => `${ESTILO_STATUS[s].fill}|${ESTILO_STATUS[s].piscaAte ?? ''}`)).size).toBe(ORDEM_STATUS.length);
    });
    it('cliente_sem_status (erro) oscila entre o azul do livre e um azul escuro; reservado é laranja fixo', () => {
        expect(ESTILO_STATUS.cliente_sem_status.fill).toBe(ESTILO_STATUS.livre.fill);
        expect(ESTILO_STATUS.cliente_sem_status.piscaAte).toMatch(/^#[0-9A-F]{6}$/i);
        expect(ESTILO_STATUS.cliente_sem_status.piscaAte).not.toBe(ESTILO_STATUS.livre.fill);
        expect(ESTILO_STATUS.reservado.fill).toBe('#FDBA74');
        for (const s of ORDEM_STATUS) if (s !== 'cliente_sem_status') expect(ESTILO_STATUS[s].piscaAte).toBeUndefined();
    });
});

describe('índice e resumos', () => {
    const linhas: LinhaPlanilhaMapa[] = [
        { stand_nr: 'P 01', tipo_venda: 'STAND PADRÃO' },
        { stand_nr: 'P 02', tipo_venda: 'COMBO 01*' },
        { stand_nr: 'P 03', tipo_venda: 'RESERVADO STAND PADRÃO*', cliente_nome_livre: 'Reserva' },
        { stand_nr: 'L 01', tipo_venda: 'DISPONÍVEL' },
        { stand_nr: 'L 99', tipo_venda: 'DISPONÍVEL' }, // só na planilha
    ];
    const estandes = [est('P-01'), est('P-02'), est('P-03'), est('P-04'), est('L-01')];

    it('indexarPlanilha casa pelo código normalizado', () => {
        const idx = indexarPlanilha(linhas);
        expect(linhaDoEstande(est('P-01'), idx)?.tipo_venda).toBe('STAND PADRÃO');
        expect(linhaDoEstande(est('P-04'), idx)).toBeUndefined();
    });
    it('resumoPorFamilia conta cada status', () => {
        const r = resumoPorFamilia(estandes, indexarPlanilha(linhas));
        expect(r.map((f) => f.familia)).toEqual(['L', 'P']);
        const p = r.find((f) => f.familia === 'P')!;
        expect(p.total).toBe(4);
        expect(p.porStatus).toEqual({ livre: 0, reservado: 1, vendido: 1, cortesia: 1, cliente_sem_status: 0, sem_planilha: 1 });
    });
    it('resumoGeral soma as famílias', () => {
        const g = resumoGeral(estandes, indexarPlanilha(linhas));
        expect(g.total).toBe(5);
        expect(g.porStatus.livre).toBe(1);
    });
    it('estandesForaDoMapa lista o que a planilha tem e a planta não', () => {
        expect(estandesForaDoMapa(estandes, linhas)).toEqual(['L 99']);
    });
    it('listas vazias não quebram', () => {
        expect(resumoPorFamilia([], new Map())).toEqual([]);
        expect(resumoGeral([], new Map()).total).toBe(0);
        expect(estandesForaDoMapa([], [])).toEqual([]);
    });
});

describe('geometria', () => {
    it('parseViewBox aceita "0 0 W H" e rejeita lixo', () => {
        expect(parseViewBox('0 0 1190.55 841.89')).toEqual({ x: 0, y: 0, w: 1190.55, h: 841.89 });
        expect(parseViewBox('0 0 0 10')).toBeNull();
        expect(parseViewBox('abc')).toBeNull();
    });
    it('pontosParaAtributo monta a string do <polygon>', () => {
        expect(pontosParaAtributo([[1, 2], [3, 4], [5, 6]])).toBe('1,2 3,4 5,6');
        expect(pontosParaAtributo(null)).toBe('');
        expect(pontosParaAtributo([[1, 2]])).toBe('');
    });
});

describe('nomeClienteDaLinha (painel do estande)', () => {
    const mapa = new Map<string, ClienteNome>([
        ['c1', { nome_fantasia: 'Fazenda Boa Vista', tipo_pessoa: 'PJ', razao_social: 'Boa Vista LTDA' }],
        ['c2', { tipo_pessoa: 'PJ', razao_social: 'Agro Sul LTDA' }],
        ['c3', { tipo_pessoa: 'PF', nome_completo: 'João da Silva' }],
        ['c4', {}],
    ]);
    it('sem linha → null', () => {
        expect(nomeClienteDaLinha(null, mapa)).toBeNull();
        expect(nomeClienteDaLinha(undefined, mapa)).toBeNull();
    });
    it('prioriza nome_fantasia quando existe', () => {
        expect(nomeClienteDaLinha({ cliente_id: 'c1' }, mapa)).toBe('Fazenda Boa Vista');
    });
    it('sem nome_fantasia, usa razao_social (PJ) ou nome_completo (PF)', () => {
        expect(nomeClienteDaLinha({ cliente_id: 'c2' }, mapa)).toBe('Agro Sul LTDA');
        expect(nomeClienteDaLinha({ cliente_id: 'c3' }, mapa)).toBe('João da Silva');
    });
    it('cliente sem nenhum nome e sem nome livre → null', () => {
        expect(nomeClienteDaLinha({ cliente_id: 'c4' }, mapa)).toBeNull();
    });
    it('sem cliente_id, usa cliente_nome_livre (aparado); vazio vira null', () => {
        expect(nomeClienteDaLinha({ cliente_nome_livre: '  Reserva Feira  ' }, mapa)).toBe('Reserva Feira');
        expect(nomeClienteDaLinha({ cliente_nome_livre: '   ' }, mapa)).toBeNull();
    });
    it('cliente_id que não está no mapa cai para o nome livre', () => {
        expect(nomeClienteDaLinha({ cliente_id: 'inexistente', cliente_nome_livre: 'Fulano' }, mapa)).toBe('Fulano');
    });
});

describe('bboxDePontos / tamanhoFonteRotulo (rótulo do polígono)', () => {
    it('bboxDePontos calcula largura/altura do polígono', () => {
        expect(bboxDePontos([[0, 0], [10, 0], [10, 5], [0, 5]])).toEqual({ w: 10, h: 5 });
    });
    it('bboxDePontos rejeita polígono degenerado ou insuficiente', () => {
        expect(bboxDePontos(null)).toBeNull();
        expect(bboxDePontos([[0, 0], [1, 0]])).toBeNull();
        expect(bboxDePontos([[0, 0], [0, 0], [0, 0]])).toBeNull(); // área zero
    });
    it('tamanhoFonteRotulo é proporcional ao menor lado, com teto', () => {
        expect(tamanhoFonteRotulo([[0, 0], [20, 0], [20, 20], [0, 20]])).toBe(6); // 20*0.35=7 → teto 6
        expect(tamanhoFonteRotulo([[0, 0], [10, 0], [10, 10], [0, 10]])).toBeCloseTo(3.5);
    });
    it('estande minúsculo devolve 0 (esconder o rótulo)', () => {
        expect(tamanhoFonteRotulo([[0, 0], [2, 0], [2, 2], [0, 2]])).toBe(0);
        expect(tamanhoFonteRotulo(null)).toBe(0);
    });
});

describe('clampZoom / zoomComRoda (pan/zoom do mapa)', () => {
    it('clampZoom limita ao intervalo [min, max]', () => {
        expect(clampZoom(1)).toBe(1);
        expect(clampZoom(0.1)).toBe(0.5);
        expect(clampZoom(100)).toBe(8);
        expect(clampZoom(NaN)).toBe(0.5);
    });
    it('respeita min/max customizados', () => {
        expect(clampZoom(50, 1, 10)).toBe(10);
    });
    it('zoomComRoda aumenta com deltaY negativo (aproxima) e diminui com positivo', () => {
        expect(zoomComRoda(1, -100)).toBeCloseTo(1.1);
        expect(zoomComRoda(1, 100)).toBeCloseTo(1 / 1.1);
    });
    it('zoomComRoda nunca sai do intervalo', () => {
        expect(zoomComRoda(8, -100)).toBe(8);
        expect(zoomComRoda(0.5, 100)).toBe(0.5);
    });
});

describe('panParaZoomNoPonto (zoom ancorado no cursor)', () => {
    it('o ponto sob o cursor não se move ao dobrar o zoom', () => {
        const pan = { x: 10, y: 20 }, zoom = 1, p = { x: 300, y: 200 };
        const q = { x: (p.x - pan.x) / zoom, y: (p.y - pan.y) / zoom }; // coordenada de conteúdo sob o cursor
        const pan2 = panParaZoomNoPonto(pan, zoom, 2, p);
        expect(pan2.x + 2 * q.x).toBeCloseTo(p.x);
        expect(pan2.y + 2 * q.y).toBeCloseTo(p.y);
    });
    it('zoom igual não altera o pan; zoom inválido devolve o pan atual', () => {
        expect(panParaZoomNoPonto({ x: 5, y: 5 }, 1.5, 1.5, { x: 100, y: 100 })).toEqual({ x: 5, y: 5 });
        expect(panParaZoomNoPonto({ x: 5, y: 5 }, 0, 2, { x: 100, y: 100 })).toEqual({ x: 5, y: 5 });
    });
});
