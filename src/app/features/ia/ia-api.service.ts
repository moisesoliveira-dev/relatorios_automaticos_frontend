import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface IaOverview {
  totais: { total: number; novosHoje: number; novos7d: number; entreguesHoje: number; emHumano: number; comErro: number };
  funil: Record<string, number>;
  trilhas: Record<string, number>;
  iaHoje: number;
  foraEscopo7d: number;
  serie: Array<{ dia: string; total: number }>;
  sistema: {
    enabled: boolean;
    aiEnabled: boolean;
    aiBreakerOpen: boolean;
    ponttaEnabled: boolean;
    model: string;
    agentDecisions: Record<string, number>;
    comunicacao: { humanizada: boolean; resultados: Record<string, number>; reprovacoes: Record<string, number> };
    pendingHandoffErrors: number;
  };
}

export interface IaConversationSummary {
  id: string;
  contactId: number;
  ticketId: number;
  nome: string | null;
  numero: string | null;
  etapa: string;
  trilha: string | null;
  emAtendimento: boolean;
  finalizouTriagem: boolean;
  invalidas: number;
  foraEscopo: number;
  iaHoje: number;
  atendenteId: number | null;
  erroEntrega: string | null;
  ultimaMensagem: string;
  criadaEm: string;
}

export interface IaConversationDetail extends IaConversationSummary {
  local: string | null;
  categorias: string[];
  arquivos: number;
  pastaDrive: boolean;
  agendamento: string | null;
  historico: Array<{ role: 'cliente' | 'bot'; text: string }>;
}

export interface IaList {
  total: number;
  pagina: number;
  tamanho: number;
  itens: IaConversationSummary[];
}

export interface IaSimulation {
  etapaAntes: string;
  origem: 'regras' | 'ia' | 'nenhuma';
  entrada: { kind: string; [k: string]: unknown };
  etapaDepois: string;
  mensagens: string[];
  efeitos: string[];
  observacao: string;
}

export interface IaConfigField {
  key: string;
  label: string;
  group: 'geral' | 'ia' | 'comunicacao' | 'limites' | 'atendimento' | 'integracoes';
  type: 'boolean' | 'number' | 'text' | 'secret';
  description: string;
  min?: number;
  max?: number;
  placeholder?: string;
  sensitive?: boolean;
  value: string | number | boolean | null;
  configured?: boolean;
  source: 'tela' | 'ambiente' | 'padrão';
}

export interface IaCatalog {
  etapas: Array<{ etapa: string; descricao: string | null }>;
  mensagens: Array<{ chave: string; texto: string; objetivo: string | null; pontosEssenciais: string[] }>;
  categorias: Record<string, string>;
  baseConhecimento: Array<{ id: string; texto: string }>;
}

export interface IaKb {
  id: string;
  keywords: string[];
  text: string;
}
export interface IaNode {
  id: string;
  tipo: 'mensagem' | 'opcoes' | 'pergunta' | 'arquivos' | 'acao' | 'encaminhar' | 'fim';
  titulo: string;
  texto?: string;
  proximo?: string | null;
  opcoes?: Array<{ rotulo: string; proximo: string | null }>;
  variavel?: string;
  validacao?: 'nome' | 'texto';
  minimo?: number;
  acao?: string;
}
export interface IaFlow {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  menuOpcao: number | null;
  nos: IaNode[];
}
export interface IaFlowState {
  flowId: string;
  nodeId: string;
  historico: string[];
  vars: Record<string, string>;
  arquivos: number;
  invalidos: number;
}
export interface IaFlowPreview {
  estado: IaFlowState | null;
  mensagens: string[];
  efeitos: string[];
  saiu: 'menu' | 'encaminhado' | null;
}
export interface IaTool {
  key: string;
  label: string;
  descricao: string;
  disponivel: boolean;
}

export interface IaContentDoc {
  messages: Record<string, string>;
  kb: IaKb[] | null;
  categorias: Record<string, string>;
  guidance: { tone: string; instructions: string };
  menuDesativado: number[];
  fluxos: IaFlow[];
}
export interface IaContent {
  published: IaContentDoc;
  publishedAt: string | null;
  publishedBy: string | null;
  draft: IaContentDoc | null;
  draftAt: string | null;
  hasPrevious: boolean;
  problemas: string[];
  ferramentas: IaTool[];
  defaults: { messages: Record<string, string>; kb: IaKb[]; categorias: Record<string, string> };
  specs: Record<string, { objetivo: string | null; pontos: string[]; placeholders: string[] }>;
  tones: Array<{ key: string; label: string }>;
}

@Injectable({ providedIn: 'root' })
export class IaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/chatbot`;

  overview() {
    return this.http.get<IaOverview>(`${this.base}/overview`);
  }
  conversations(p: { step?: string; busca?: string; erros?: boolean; pagina?: number; tamanho?: number }) {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== '' && v !== false) params = params.set(k, String(v));
    return this.http.get<IaList>(`${this.base}/conversations`, { params });
  }
  conversation(id: string) {
    return this.http.get<IaConversationDetail>(`${this.base}/conversations/${id}`);
  }
  silenciar(id: string) {
    return this.http.post<IaConversationSummary>(`${this.base}/conversations/${id}/silenciar`, {});
  }
  devolver(id: string) {
    return this.http.post<IaConversationSummary>(`${this.base}/conversations/${id}/devolver-ao-bot`, {});
  }
  simulate(body: { text: string; step: string; trilha?: string | null; nome?: string | null; usarIA: boolean }) {
    return this.http.post<IaSimulation>(`${this.base}/simulate`, body);
  }
  catalog() {
    return this.http.get<IaCatalog>(`${this.base}/catalog`);
  }
  config() {
    return this.http.get<IaConfigField[]>(`${this.base}/config`);
  }
  saveConfig(values: Record<string, unknown>) {
    return this.http.put<IaConfigField[]>(`${this.base}/config`, { values });
  }
  content() {
    return this.http.get<IaContent>(`${this.base}/content`);
  }
  saveDraft(doc: IaContentDoc) {
    return this.http.put<IaContent>(`${this.base}/content/draft`, doc);
  }
  discardDraft() {
    return this.http.delete<IaContent>(`${this.base}/content/draft`);
  }
  publish() {
    return this.http.post<IaContent>(`${this.base}/content/publish`, {});
  }
  previewFlow(fluxo: IaFlow, estado: IaFlowState | null, texto: string) {
    return this.http.post<IaFlowPreview>(`${this.base}/content/flows/preview`, { fluxo, estado, texto });
  }
  rollback() {
    return this.http.post<IaContent>(`${this.base}/content/rollback`, {});
  }
}
