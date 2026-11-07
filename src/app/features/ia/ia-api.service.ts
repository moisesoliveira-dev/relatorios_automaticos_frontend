import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface IaOverview {
  totais: { total: number; novosHoje: number; novos7d: number; entreguesHoje: number; emHumano: number; comErro: number };
  /** "Fluxo › Etapa" → quantidade de conversas ativas */
  funil: Record<string, number>;
  /** Caminho escolhido no menu → quantidade */
  trilhas: Record<string, number>;
  iaHoje: number;
  foraEscopo7d: number;
  serie: Array<{ dia: string; total: number }>;
  sistema: {
    enabled: boolean;
    aiEnabled: boolean;
    aiBreakerOpen: boolean;
    crmEnabled: boolean;
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
  /** BOT ou HUMANO */
  etapa: 'BOT' | 'HUMANO';
  onde: { fluxo: string | null; etapa: string | null };
  trilha: string;
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
  respostas: Array<{ variavel: string; valor: string }>;
  arquivos: number;
  pastaDrive: boolean;
  historico: Array<{ role: 'cliente' | 'bot'; text: string }>;
}

export interface IaList {
  total: number;
  pagina: number;
  tamanho: number;
  itens: IaConversationSummary[];
}

export interface IaSimResposta {
  /** Estado da conversa simulada: devolva-o no próximo passo. */
  estado: Record<string, unknown>;
  mensagens: string[];
  reescrita: boolean;
  origem: 'regras' | 'ia' | 'nenhuma';
  efeitos: string[];
  terminou: boolean;
  onde: { etapa: string; fluxo: { id: string; nome: string } | null; bloco: { numero: number; titulo: string } | null };
  aviso: string | null;
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

// ───────────────────────── fluxos (motor v2) ─────────────────────────

export type IaNodeType = 'mensagem' | 'pergunta' | 'opcoes' | 'confirmacao' | 'multipla' | 'arquivos' | 'ferramenta' | 'condicao' | 'ir_para' | 'encaminhar' | 'fim';
export type IaValidacao = 'texto' | 'nome' | 'numero' | 'telefone' | 'email';
export type IaCondOp = 'igual' | 'diferente' | 'contem' | 'vazio' | 'nao_vazio';

export interface IaNodeSpec {
  objetivo?: string;
  pontos?: string[][];
  saudacao?: boolean;
  usaNome?: boolean;
  maxChars?: number;
}

export interface IaOpcao {
  rotulo: string;
  proximo: string | null;
  valor?: string;
  palavras?: string[];
}

/** Uma etapa de fluxo. Os campos valem conforme o `tipo` (ver NODE_TYPES_INFO do servidor). */
export interface IaNode {
  id: string;
  tipo: IaNodeType;
  titulo: string;
  spec?: IaNodeSpec;
  texto?: string;
  textoApos?: string;
  proximo?: string | null;
  // pergunta
  variavel?: string;
  validacao?: IaValidacao;
  // opcoes / confirmacao
  opcoes?: IaOpcao[];
  // multipla
  itens?: Array<{ rotulo: string }>;
  nenhum?: string;
  // arquivos
  minimo?: number;
  // ferramenta
  ferramenta?: string;
  params?: Record<string, string | number | boolean | null>;
  falha?: string | null;
  semOpcoes?: string | null;
  // condicao
  regras?: Array<{ variavel: string; op: IaCondOp; valor?: string; proximo: string | null }>;
  senao?: string | null;
  // ir_para
  fluxo?: string;
  // encaminhar
  reutilizarAtendente?: boolean;
}

export interface IaKb {
  id: string;
  keywords: string[];
  text: string;
}

export interface IaFlow {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  papel?: 'entrada' | 'reconhecimento' | null;
  nos: IaNode[];
  guidance?: { tone: string; instructions: string };
  reescrever?: boolean;
  kb?: IaKb[];
}

export interface IaFlowState {
  flowId: string;
  nodeId: string;
  historico: string[];
  vars: Record<string, string>;
  arquivos: number;
  invalidos: number;
  dinamicas?: Array<{ rotulo: string; valor: string }> | null;
  escolhidos?: number[] | null;
}

export interface IaFlowPreview {
  estado: IaFlowState | null;
  mensagens: string[];
  efeitos: string[];
  saiu: 'menu' | 'encaminhado' | null;
}

export interface IaParamSpec {
  key: string;
  label: string;
  type: 'texto' | 'numero' | 'booleano' | 'variavel' | 'escolha';
  ajuda?: string;
  obrigatorio?: boolean;
  opcoes?: Array<{ value: string; label: string }>;
  padrao?: string | number | boolean;
  template?: boolean;
  define?: boolean;
}

export interface IaTool {
  key: string;
  label: string;
  descricao: string;
  grupo: string;
  modo: 'acao' | 'escolha';
  params: IaParamSpec[];
  requer: { vars?: string[]; pasta?: boolean };
  produz: { pasta?: boolean; vars?: string[] };
  disponivel: boolean;
  motivo?: string;
}

export interface IaNodeTypeInfo {
  tipo: IaNodeType;
  grupo: string;
  label: string;
  ajuda: string;
  regra: string;
}

export type IaSystemKey =
  | 'invalida_generica' | 'invalida_nome' | 'invalida_arquivos' | 'invalida_lista' | 'fora_escopo' | 'fora_escopo_limite'
  | 'audio_nao_suportado' | 'reinicio_por_pausa' | 'redirecionando' | 'redirecionando_com_nome' | 'rodape_navegacao' | 'rodape_escolha' | 'rodape_ok';

export interface IaContentDoc {
  versao: 2;
  fluxos: IaFlow[];
  guidance: { tone: string; instructions: string };
  kb: IaKb[] | null;
  sistema: Partial<Record<IaSystemKey, string>>;
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
  tipos: IaNodeTypeInfo[];
  tones: Array<{ key: string; label: string }>;
  sistema: { padrao: Record<IaSystemKey, string>; rotulos: Record<IaSystemKey, string> };
  defaults: { kb: IaKb[] };
  limites: { fluxos: number; nos: number; opcoes: number; itens: number; texto: number };
}

export interface IaCatalog {
  fluxos: Array<{ id: string; nome: string; ativo: boolean; papel: string | null; etapas: number }>;
  tipos: IaNodeTypeInfo[];
  ferramentas: IaTool[];
  sistema: Record<IaSystemKey, string>;
  baseConhecimento: Array<{ id: string; texto: string }>;
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
  simulate(body: { texto?: string; estado?: Record<string, unknown> | null; inicio?: { fluxoId?: string; nome?: string | null }; usarIA: boolean }) {
    return this.http.post<IaSimResposta>(`${this.base}/simulate`, body);
  }
  catalog() {
    return this.http.get<IaCatalog>(`${this.base}/catalog`);
  }
  tools() {
    return this.http.get<IaTool[]>(`${this.base}/tools`);
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
  /** Prévia de um fluxo em rascunho (manda todos os fluxos do rascunho, por causa de "ir para"). */
  previewFlow(fluxos: IaFlow[], fluxoId: string, estado: IaFlowState | null, texto: string) {
    return this.http.post<IaFlowPreview>(`${this.base}/content/flows/preview`, { fluxos, fluxoId, estado, texto });
  }
  rollback() {
    return this.http.post<IaContent>(`${this.base}/content/rollback`, {});
  }
}
