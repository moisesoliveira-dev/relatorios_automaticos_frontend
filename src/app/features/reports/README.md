# Relatórios

```
reports/
└── ocorrencias/ocorrencias.component.ts   # Relatório de Ocorrências Pontta
```

Hoje existe um único relatório, então `/reports` redireciona direto para `/reports/ocorrencias`
(ver `app.routes.ts`). A lista intermediária com cartões "em breve" foi removida: ela só
adicionava um clique e poluía a tela.

## Como adicionar um novo relatório

1. Crie `reports/<nome>/<nome>.component.ts` seguindo `ocorrencias.component.ts`:
   - cabeçalho `.page-header` com título e uma frase;
   - filtros num `.panel`; ações diretas em botões; o que exige escolha (destinatários, prévia)
     abre em `app-dialog`; detalhe de um item abre em `app-sheet`;
   - feedback por `ToastService`; confirmações por `ModalService.confirm`.
2. Registre a rota filha em `app.routes.ts` dentro de `reports`.
3. Quando houver mais de um relatório, troque o `redirectTo` de `''` por um componente de lista
   (um cartão por relatório real — nada de "em breve").
4. Endpoints novos ficam em `backend/src/report/`.
