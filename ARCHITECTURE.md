# Arquitetura — CMM System Frontend

Angular 21 standalone com **Facade Pattern** + features modulares.

## Camadas por feature

```
features/{nome}/
├── models/          # Tipos e constantes de domínio UI
├── data/            # *ApiService — HTTP puro (sem estado)
├── facade/          # *Facade — estado (signals) + orquestração
├── components/      # Presentational / smart filhos
├── utils/           # Helpers puros (opcional)
└── {nome}.component.ts   # Shell — compõe filhos, fornece providers
```

## Fluxo Facade

```
Component (shell)
    ↓ inject
Facade (signals, computed, métodos de ação)
    ↓ inject
ApiService (HttpClient)
    ↓
Backend REST
```

**Regra:** componentes **nunca** chamam `HttpClient` diretamente — sempre via Facade → ApiService.

## Features refatoradas (referência)

### PCP Operacional
```
pcp-operacional/
├── data/pcp-api.service.ts
├── facade/pcp-operacional.facade.ts
├── components/
│   ├── pcp-search-panel.component.ts
│   ├── pcp-orders-table.component.ts
│   ├── pcp-calendar-panel.component.ts
│   └── pcp-day-detail.component.ts
└── pcp-operacional.component.ts
```

### Usuários
```
users/
├── data/users-api.service.ts
├── facade/users.facade.ts
├── components/
│   ├── users-list.component.ts
│   ├── users-invites-tab.component.ts
│   ├── users-registrations-tab.component.ts
│   ├── user-tab-picker.component.ts
│   └── users-modals.component.ts
└── users.component.ts
```

## Escopo da Facade

A Facade é fornecida no **shell da página** (`providers: [XxxApiService, XxxFacade]`), compartilhada pelos filhos via `inject()`.

## Core vs Features

| Pasta | Responsabilidade |
|-------|------------------|
| `core/` | Auth, guards, interceptors, models globais |
| `shared/` | Layout, modal, componentes reutilizáveis |
| `features/` | Domínios de negócio (uma pasta por rota lazy) |
| `services/` | Legado — preferir `features/*/data/` |

## Próximos candidatos a refatorar

- `gosac-pontta/grupos` → `GosacGroupsFacade`
- `gosac-pontta/pagamento-montador` → `PagamentoMontadorFacade`
- `reports/ocorrencias` → `OcorrenciasFacade` + `ReportApiService`

## Stack

- Angular 21 standalone · Signals · RxJS (HTTP)
- Tailwind CSS 4 · lazy routes · tab guards
