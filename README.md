# CMM System — Frontend

Console operacional Automi (Angular 21 + Tailwind).

## Arquitetura

O frontend usa **Facade Pattern** com features modulares. Detalhes: [ARCHITECTURE.md](./ARCHITECTURE.md)

```
features/{nome}/
├── data/        → ApiService (HTTP)
├── facade/      → Facade (estado + orquestração)
├── components/  → UI modular
└── *.component.ts → Shell da página
```

## Desenvolvimento

```bash
npm install
ng serve
# http://localhost:4200
```

## Build

```bash
ng build
```

## Features com Facade (referência)

- **PCP Operacional** — calendário, tabela de PVs, animação
- **Usuários** — CRUD, convites, aprovações

## Stack

Angular 21 · Standalone Components · Signals · RxJS · Tailwind CSS 4
