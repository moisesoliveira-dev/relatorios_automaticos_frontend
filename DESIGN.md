# CMM System — Design

## Mode
Operate, com personalidade. A hierarquia serve à tarefa, e o movimento é parte da identidade — intenso por padrão, sempre controlável pelo usuário.

## Identidade
"Papel quente + grafite + sinal laranja". Nada de roxo/índigo, nada de glassmorphism decorativo.

## Color
Neutros quentes (nunca preto/cinza puros). O acento é um vermelho-laranja vivo (`#ff4d17`) que degrada para âmbar (`#ffb020`) apenas em botões principais, marcas e destaques.

| Token | Claro | Escuro |
|-------|-------|--------|
| `--cmm-ink` | `#16130e` | `#f6f1e7` |
| `--cmm-muted` | `#6a6358` | `#a39a8b` |
| `--cmm-surface` | `#f2eee6` | `#0c0b09` |
| `--cmm-panel` | `#fffcf6` | `#161411` |
| `--cmm-border` | `#e0d8ca` | `#2c2822` |
| `--cmm-accent` | `#ff4d17` | `#ff6a33` |
| `--cmm-accent-2` | `#ffb020` | `#ffc247` |
| `--cmm-accent-ink` | `#1c0900` | `#1c0900` |
| `--cmm-danger` / `success` / `warning` | `#c4261d` / `#11794b` / `#b45309` | `#ff8a80` / `#5fd9a0` / `#fbbf24` |

O menu lateral é grafite nos dois temas. A borda padrão de TUDO usa `--cmm-border` (Tailwind 4 usaria `currentColor`).

## Typography
- **Títulos e números:** Bricolage Grotesque (600–800), tracking negativo.
- **Texto e interface:** Instrument Sans (400–700).
- Escala: título de página `clamp(1.6rem, 1.2rem + 1.4vw, 2.4rem)` · seção 1rem/600 · corpo 0.875–0.9375rem · meta 0.75rem.
- Evitar Inter, Roboto, Arial e pilhas só de sistema.

## Layout
- Menu lateral fixo (16.5rem / 4.75rem recolhido, lembra a escolha) + barra superior com blur leve.
- Um cabeçalho de página por tela; preferir divisórias e `panel` a cartões aninhados.
- Raios: `0.75rem` controles, `1rem` painéis, `1.25rem` diálogos.
- Alvos de toque ≥ 42px.

## Componentes (nomes de classe estáveis)
`.btn-static` (botão sem movimento, ripple ou brilho — usado nos botões de envio das telas de autenticação) · `.btn` + `.btn-primary | .btn-accent | .btn-secondary | .btn-danger | .btn-ghost` · `.icon-btn` (+ `.icon-btn-sm | .icon-btn-outline | .icon-danger`) · `.form-label` + `.form-input` · `.panel` · `.badge` · `.state` (ponto + texto: `.state-on | -off | -busy | -bad | -warn`) · `.note` (+ `-error | -warn | -ok | -accent`) · `.table-shell` + `.list-head` · `.tabs` + `.tab` + `.tab-count` · `.seg` + `.seg-btn` · `.toolbar` + `.search-field` · `.switch` + `.switch-row` · `.kv` · `.cfg-h` + `.cfg-row` · `.savebar` · `.pager` · `.stat` · `.chip` + `.check-chip` · `.empty-state` · `.loading-block` + `.spinner` · `.skeleton` · `.auth-*` · `.toast`.

## Sobreposições (um jeito só)
- **`<app-dialog>`** (`shared/components/dialog.component.ts`): janela central para formulários, escolhas e prévias. Entradas `open`, `title`, `subtitle`, `size` (sm/md/lg/xl), `closable`, `flush`; rodapé via `<ng-container dialog-footer>`.
- **`<app-sheet>`** (`shared/components/sheet.component.ts`): painel lateral para detalhes e edição longa. Entradas `open`, `title`, `subtitle`, `width`; cabeçalho próprio via `[sheet-head]`, rodapé via `[sheet-footer]`.
- Ambos: `role=dialog`, foco preso, Escape fecha só o de cima (`OverlayStackService`), foco volta a quem abriu, rolagem da página travada, animação de entrada/saída.
- **Conteúdo projetado dentro de `@if`**: o `@if` deve ficar *dentro* do `<ng-container sheet-footer>` (um nó-raiz por slot), senão o Angular não projeta no slot certo.
- Confirmações simples: `ModalService.confirm`. Sucesso e erro de ações: `ToastService`. Nunca `window.confirm`, nunca mensagem inline que some sozinha, nunca overlay `fixed inset-0` artesanal.

## Paginação e listas
`<app-pagination [page] [totalPages] [label] (pageChange)>` (páginas começam em 1; `pageRange`/`pageCount` ajudam a montar o rótulo). Cabeçalho de lista: `.list-head` com `.list-head-title` e, quando houver, um `.search-field`.

## Motion — "exagerado, mas controlável"
Motor central em `core/motion/motion.service.ts` (biblioteca `motion`) + CSS em `styles.css`. Nenhuma tela precisa declarar animação: o que aparece anima sozinho.

- **Entrada em cascata** de painéis, cabeçalhos, tabelas e linhas (translateY/scale + desfoque, easing expo-out).
- **Transição de página** por *cortina*: só o conteúdo (`main#conteudo`) muda — a página antiga sai com um fade curto e a nova é revelada por um `clip-path` da esquerda para a direita; menu e barra superior ficam parados.
- **Aurora** em movimento atrás do app, com parallax na rolagem, grão fino e barra de progresso de rolagem.
- **Botões**: magnéticos, ripple ao clicar, brilho que varre no hover, "afundam" ao pressionar.
- **Painéis**: spotlight que segue o mouse, borda que acende, sombra que cresce.
- **Menu lateral**: itens entram em cascata, indicador (pílula) desliza até o item ativo, marca com anel girando.
- **Números**: contadores animados (`appCounter`).
- **Tema**: troca com círculo que se expande a partir do botão.
- **Diálogos e toasts**: entrada e saída animadas; diálogos antigos recebem o mesmo acabamento automaticamente.
- Sem bounce/elastic: o exagero vem de quantidade, escala e desfoque, com curvas expo/quart.

### Controle e acessibilidade
- Respeita `prefers-reduced-motion` e tem interruptor **"Reduzir animações"** no menu do usuário (`html[data-motion="off"]`, salvo em `motion_mode`).
- O estado inicial "invisível" das animações é sempre desfeito (mesmo se a animação falhar) e nunca é aplicado com o movimento desligado.
- Nunca usar `* { transition }` global.

## Acessibilidade
- Foco visível global; atalho "Pular para o conteúdo"; `main` recebe foco ao navegar; título da aba por página.
- Diálogos: `role=dialog`, `aria-modal`, nome acessível, foco inicial e preso, Escape fecha, foco volta a quem abriu (`ModalComponent` e `DialogEnhancerService` para os diálogos antigos).
- Sucesso é um toast (não bloqueia); erros e confirmações continuam em diálogo.
- Formulários: rótulos ligados (`for`/`id`), `autocomplete`, `aria-invalid`, erros com `role=alert`.

## Dark mode
`html.dark` troca as variáveis. O tema é aplicado antes do primeiro desenho (sem "piscar").

## Telas com identidade própria
- **Dashboard**: central de comando — selo de saúde geral, blocos por serviço com latência, linha do tempo de relatórios e atalhos.
- **Usuários**: faixa de panorama (pessoas, ativas, administradores, aguardando decisão).
- **IA** (`/ia`): cinco abas por objetivo, cada uma com uma frase de propósito sob o título. **Painel** (+ "Precisa de atenção"), **Conversas** (cliente a cliente, detalhe em `app-sheet`), **Atendimento**, **Testar** (simulador) e **Ajustes**. Botão Ligar/Desligar o bot sempre no cabeçalho. **Atendimento** é uma *galeria de cartões*, um por fluxo (o atendimento da Vera é um fluxo como os outros; o marcado "Início" recebe todo cliente novo); abrir um fluxo mostra *Etapas* (linha do tempo; clicar abre o `app-sheet` da etapa), *Jeito de falar* e *O que ela sabe*. "Avisos e padrões" (mensagens do sistema, tom e base padrão) abre num `app-sheet` a partir da galeria. Rascunho → publicar na barra inferior. Regra: sem listas longas empilhadas; no máximo dois níveis (galeria → fluxo).

## Responsividade
- **Pontos de corte:** menu lateral fixo só a partir de 1024px (abaixo vira gaveta); tabelas viram cartões até 860px; ajustes de espaçamento/formulário até 640px; alvos de toque de 44px em telas sensíveis ao toque (`pointer: coarse`).
- **Tabelas:** o `ResponsiveTablesService` copia o texto de cada `<th>` para `data-label` das células e o CSS (`styles.css`, bloco "Responsividade") mostra cada linha como cartão (1ª coluna = cabeçalho do cartão). Tabelas largas de propósito (classe `min-w-*`) continuam com rolagem horizontal.
- **Campos com 16px** no celular (o iOS não dá zoom ao focar). Nada estoura a largura (`overflow-x: clip` em `html, body`).
- **Modais/gavetas:** `main#conteudo:has(.drawer, .fixed.inset-0, [role=dialog])` sobe acima da barra superior (a transição de página cria um contexto de empilhamento).
- **IA > Atendimento:** a navegação lateral vira um seletor abaixo de 1024px; a barra de rascunho ocupa a largura toda no celular.
- Verificação: `resp.js` abre todas as rotas em 320/360/768/1024 e acusa elementos que passam da largura.

## Menos é mais (regras de limpeza)
- **Uma camada de cabeçalho:** título + um estado + uma frase. Sem botões de "Atualizar" nem carimbos de hora (a tela se atualiza sozinha). Ações raras (logotipo, prazos das áreas, horários) ficam atrás de um `.icon-btn` no cabeçalho que abre um `app-dialog`.
- **Caixa de frase** em títulos, botões e rótulos ("Cadastrar pessoa", não "Cadastrar Pessoa"). Textos para a pessoa, não para o programador: nunca nomes de tabela, variáveis de ambiente ou "(ões)".
- **Ícones só pelo `<app-icon>`**: nenhum SVG inline nem emoji nas telas.
- **Uma barra de abas** (sublinhada) por tela. Abas internas, quando existirem, usam o estilo neutro (`.seg`), nunca duas barras coloridas empilhadas.
- **O conteúdo começa logo abaixo das abas.** Explicações longas viram uma linha discreta ou um `<details>`; passo a passo só aparece quando há algo a fazer (ex.: barra de rascunho).
- **Selos só quando mudam uma decisão.** Estados repetidos viram texto/ponto (`● Ativo · opção 6`), não chips.
- **Listas de configuração planas:** um painel, títulos de seção em caixa-alta, uma linha por ajuste; avisos como ⚠ e "↺ padrão" só quando aplicável.
- Estado de ligado/desligado é o próprio selo do cabeçalho (clicável), não um botão extra.

## Padrões de editor (aba IA)
- **Ícones, não emojis.** Use `<app-icon name="…">` (`shared/components/icon.component.ts`, traço fino 24px). Ações repetidas (mover, excluir, fechar, voltar, desfazer) são botões só de ícone com `aria-label` e `title`; ações principais (Testar, Publicar) levam texto.
- **Lista de etapas = linha do tempo vertical**, na ordem real, com "+" entre as etapas para inserir. Detalhes abrem em painel lateral; escolhas curtas (tipo da etapa, nome/descrição do fluxo) abrem em janela central. Nada de grade de cartões para algo que tem ordem.
- **Modelos por tipo:** cada tipo de etapa nasce no formato certo (ex.: Confirmação já vem com Sim/Não) e se liga sozinho à etapa anterior.
- **Divulgação progressiva:** o essencial fica à vista; o que é técnico vai em "Avançado" (`<details class="adv">`) ou em seções recolhidas (Ajustes).
- Texto de interface sem jargão de programador: "3 alterações sem publicar", nunca "alteração(ões)".
