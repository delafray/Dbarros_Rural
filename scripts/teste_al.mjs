
const CONFIG_ID = '6f797cf9-d611-48b6-94dc-5121f76a5768';

const categorias = [
    {"cor":"bg-[#FCE4D6]","tag":"Padrão 64m","count":7,"ordem":"3","combos":[12700,13700,15400],"prefix":"P","standBase":10200,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#FFF2CC]","tag":"diam. 25n","count":7,"ordem":"4","combos":[9300,10300,12000],"prefix":"D","standBase":6800,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#E2EFDA]","tag":"maq. 25m","count":4,"ordem":"5","combos":[10300,11300,13000],"prefix":"M","standBase":7800,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#D9E1F2]","tag":"marc.","count":10,"ordem":"10","combos":[0,0,0],"prefix":"MC","is_stand":false,"standBase":0,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#F2F2F2]","tag":"master","count":3,"ordem":"2","combos":[40000,40000,40000],"prefix":"MT","standBase":40000,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#E6E6FA]","tag":"Naming","count":1,"ordem":"1","combos":[60000,60000,60000],"prefix":"NR","is_stand":true,"standBase":60000,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#FCE4D6]","tag":"OUT1","count":1,"ordem":7,"combos":[1500,1500,1500],"prefix":"O1","is_stand":false,"standBase":1500,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#FFF2CC]","tag":"OUT2","count":1,"ordem":8,"combos":[1500,1500,1500],"prefix":"O2","is_stand":false,"standBase":1500,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]},
    {"cor":"bg-[#E2EFDA]","tag":"OUT3","count":1,"ordem":9,"combos":[3500,3500,3500],"prefix":"O3","is_stand":false,"standBase":3500,"comboNames":["COMBO 01","COMBO 02","COMBO 03"]}
];

const estandes = [
    {"stand_nr":"D 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 02","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 03","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 04","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 05","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 06","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"D 07","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"M 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"M 02","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"M 03","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"M 04","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 02","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 03","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 04","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 05","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 06","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 07","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 08","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 09","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MC 10","cliente_id":"99ee5ea3-98c7-4d07-a07c-c9b04f0b3b2d","cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{"Blimp":"x"},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MT 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MT 02","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"MT 03","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"NR 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{"Logo Back Drop":""},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"O1 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"O2 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"O3 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 01","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":100,"preco_m2_override":32500,"total_override":32500,"combo_overrides":{"STAND PADRÃO": 32500, "COMBO 01": 37000}},
    {"stand_nr":"P 02","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 03","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 04","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 05","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 06","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null},
    {"stand_nr":"P 07","cliente_id":null,"cliente_nome_livre":null,"tipo_venda":"DISPONÍVEL","opcionais_selecionados":{},"area_m2":null,"preco_m2_override":null,"total_override":null,"combo_overrides":null}
];

// --- Simulação do Script do Usuário ---

async function testeOrfaosAL() {
    console.log('=== 1. Listando estandes da config (Amostra) ===');
    estandes.slice(0, 5).forEach(e => {
        console.log(`- ${e.stand_nr}: Area=${e.area_m2}, Cliente=${e.cliente_id || '—'}`);
    });

    console.log('\n=== 2. Classificando órfãos (Simulação: Categoria P reduzida para 5) ===');
    const categoriasSimuladas = JSON.parse(JSON.stringify(categorias));
    categoriasSimuladas[0].count = 5; 
    
    const validStandNrs = new Set();
    for (const cat of categoriasSimuladas) {
        for (let i = 1; i <= cat.count; i++) {
            const id = (cat.prefix || cat.tag || '').trim();
            const num = String(i).padStart(2, '0');
            validStandNrs.add(id ? `${id} ${num}` : num);
        }
    }

    const estandesSimulados = [
        ...estandes,
        {
            "stand_nr":"P 08", 
            "cliente_id":"mock-uuid",
            "cliente_nome_livre":null,
            "tipo_venda":"VENDIDO",
            "opcionais_selecionados":{},
            "area_m2":null,
            "preco_m2_override":null,
            "total_override":null,
            "combo_overrides":null
        }
    ];

    for (const e of estandesSimulados) {
      const isValid = validStandNrs.has(e.stand_nr);                                          
      if (isValid) continue; 
                                                                                                    const temDadosPrincipal =                                                                       !!e.cliente_id ||                                                                     
        !!e.cliente_nome_livre ||                                                             
        (!!e.tipo_venda && e.tipo_venda !== 'DISPONÍVEL') ||                                  
        (e.opcionais_selecionados && Object.values(e.opcionais_selecionados).some(v => !!v));  
                                                                                                    const temDadosAL =                                                                              e.area_m2 != null ||                                                                  
        e.total_override != null;                                                             
                                                                                                    console.log(`ÓRFÃO: ${e.stand_nr}`);                                                          console.log(`  Dados principal: ${temDadosPrincipal ? '❌ SIM (BLOQUEIA)' : '✅ limpo'}`);
      console.log(`  Dados AL:        ${temDadosAL ? '⚠️ SIM (ignorado, será removido)' : '✅ limpo'}`);
      console.log(`  Resultado:       ${temDadosPrincipal ? '🚫 BLOQUEARIA remoção' : '🗑️ PODE remover'}`);                                                                                    }

    console.log('\n=== 3. Teste de syncEstandes (dry run) ===');
    const toInsert = [];
    const toDelete = [];
    const toKeepOrphan = [];

    for (const cat of categoriasSimuladas) {
        for (let i = 1; i <= cat.count; i++) {
            const id = (cat.prefix || cat.tag || '').trim();
            const num = String(i).padStart(2, '0');
            const standNr = id ? `${id} ${num}` : num;
            if (!estandesSimulados.find(e => e.stand_nr === standNr)) {
                toInsert.push(standNr);
            }
        }
    }

    for (const e of estandesSimulados) {
      if (!validStandNrs.has(e.stand_nr)) {
        const isEmpty =
          !e.cliente_id &&
          !e.cliente_nome_livre &&
          (!e.tipo_venda || e.tipo_venda === 'DISPONÍVEL') &&
          (!e.opcionais_selecionados || !Object.values(e.opcionais_selecionados).some(v => !!v));

        if (isEmpty) {
          toDelete.push(e.stand_nr);
        } else {
          toKeepOrphan.push(e.stand_nr);
        }
      }
    }

    console.log('Inserir:', toInsert.length > 0 ? toInsert.join(', ') : 'nenhum');
    console.log('Deletar:', toDelete.length > 0 ? toDelete.join(', ') : 'nenhum');
    console.log('Manter (órfão com dados):', toKeepOrphan.length > 0 ? toKeepOrphan.join(', ') : 'nenhum');

    console.log('\n✅ Teste concluído. Nenhuma alteração foi feita no banco.');
}

testeOrfaosAL();
