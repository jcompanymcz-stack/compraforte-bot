import fs from 'fs-extra';
import { createObjectCsvWriter } from 'csv-writer';

const ensureFile = async (path, header) => {
  await fs.ensureFile(path);
  const stat = await fs.stat(path);
  if (stat.size === 0) {
    const headerLine = header.map(h => h.id).join(',') + '\n';
    await fs.writeFile(path, headerLine);
  }
};

export class CsvTable {
  constructor(path, header) {
    this.path = path;
    this.header = header;
    this.csvWriter = createObjectCsvWriter({ path, header });
  }
  async init() { await ensureFile(this.path, this.header); }
  async append(row) { await this.csvWriter.writeRecords([row]); }
}

export const paths = {
  clientes: './data/clientes_piloto.csv',
  fornecedores: './data/fornecedores.csv',
  pedidos: './data/pedidos.csv',
  cotacoes: './data/cotacoes.csv',
  comparativos: './data/comparativos.csv',
};

export const schemas = {
  clientes: [
    {id:'cliente_id'},{id:'nome_fantasia'},{id:'contato_whatsapp'},{id:'bairro'},{id:'cidade'},
    {id:'perfil_gasto_mensal_estimado'},{id:'frequencia_pedidos_semana'},{id:'status_piloto'},
    {id:'data_inicio'},{id:'observacoes'}
  ],
  fornecedores: [
    {id:'fornecedor_id'},{id:'razao_social'},{id:'contato'},{id:'whatsapp'},{id:'categoria_principal'},
    {id:'cidades_atendidas'},{id:'pedido_minimo'},{id:'condicao_pagamento'},{id:'prazo_entrega_horas'},
    {id:'aceita_comissao_percent'},{id:'observacoes'}
  ],
  pedidos: [
    {id:'pedido_id'},{id:'cliente_id'},{id:'data_hora_recebido'},{id:'canal'},{id:'itens_texto_livre'},
    {id:'status'},{id:'sla_limite_horas'},{id:'data_hora_resposta_enviada'}
  ],
  cotacoes: [
    {id:'cotacao_id'},{id:'pedido_id'},{id:'fornecedor_id'},{id:'data_hora_cotado'},
    {id:'preco_total'},{id:'frete_total'},{id:'prazo_entrega_horas'},{id:'validade_preco_horas'},
    {id:'itens_resumo'},{id:'condicao_pagamento'},{id:'foi_vencedor'},{id:'motivo_perda'}
  ],
  comparativos: [
    {id:'comparativo_id'},{id:'pedido_id'},{id:'cliente_id'},{id:'data_hora_enviado'},
    {id:'opcoes_resumo'},{id:'opcao_escolhida_fornecedor_id'},{id:'economia_vs_habital_reais'},
    {id:'tempo_ciclo_horas'},{id:'feedback_cliente'}
  ]
};

export const initAll = async () => {
  const tables = {};
  for (const [name, header] of Object.entries(schemas)) {
    tables[name] = new CsvTable(paths[name], header);
    await tables[name].init();
  }
  return tables;
};
