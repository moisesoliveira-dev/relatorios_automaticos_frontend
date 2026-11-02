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
`.btn-static` (botão sem movimento, ripple ou brilho — usado nos botões de envio das telas de autenticação) · `.btn` + `.btn-primary | .btn-accent | .btn-secondary | .btn-danger | .btn-ghost` · `.form-label` + `.form-input` · `.panel` · `.badge` · `.table-shell` · `.empty-state` · `.skeleton` · `.spinner` · `.auth-*` · `.toast`.

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
- **IA** (`/ia`): visão geral (KPIs, série de 14 dias, funil por etapa), conversas com gaveta de detalhe, simulador, configuração em tempo de execução (barra de salvar flutuante) e catálogo de mensagens. Painéis modais usam z-index 1000+; `main#conteudo:has(.drawer)` sobe acima da barra superior.
