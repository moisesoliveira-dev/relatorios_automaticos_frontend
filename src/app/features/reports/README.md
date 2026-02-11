# 📊 Sistema de Relatórios

## Estrutura

```
reports/
├── reports-list.component.ts    # Lista de todos os relatórios disponíveis
├── ocorrencias/                 # Relatório de Ocorrências Pontta
│   └── ocorrencias.component.ts
└── [novos-relatorios]/         # Adicione novos relatórios aqui
```

## Como adicionar um novo relatório

### 1. Criar o componente do relatório

Crie uma nova pasta dentro de `reports/` com o nome do relatório:

```bash
mkdir src/app/features/reports/nome-do-relatorio
```

Crie o componente seguindo o padrão do `ocorrencias.component.ts`:

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nome-do-relatorio',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-6">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <button 
          (click)="goBack()"
          class="flex items-center gap-1 hover:text-purple-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Relatórios
        </button>
        <span>/</span>
        <span class="text-slate-800 font-medium">Nome do Relatório</span>
      </div>

      <!-- Conteúdo do relatório -->
      <div>
        <!-- Adicione aqui os filtros, formulários e tabelas -->
      </div>
    </div>
  `
})
export class NomeDoRelatorioComponent {
  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/reports']);
  }
}
```

### 2. Adicionar a rota

Em `app.routes.ts`, adicione a nova rota dentro de `reports`:

```typescript
{
  path: 'reports',
  children: [
    {
      path: '',
      loadComponent: () => import('./features/reports/reports-list.component').then(m => m.ReportsListComponent)
    },
    {
      path: 'ocorrencias',
      loadComponent: () => import('./features/reports/ocorrencias/ocorrencias.component').then(m => m.OcorrenciasComponent)
    },
    // Nova rota aqui
    {
      path: 'nome-do-relatorio',
      loadComponent: () => import('./features/reports/nome-do-relatorio/nome-do-relatorio.component').then(m => m.NomeDoRelatorioComponent)
    }
  ]
}
```

### 3. Adicionar na lista de relatórios

Em `reports-list.component.ts`, adicione o novo relatório ao array `reports`:

```typescript
reports: ReportType[] = [
  // ... relatórios existentes
  {
    id: 'nome-do-relatorio',
    title: 'Nome do Relatório',
    description: 'Descrição detalhada do que este relatório faz.',
    icon: '💰', // Emoji que representa o relatório
    color: '#059669', // Cor hexadecimal do tema
    available: true // false para marcar como "Em breve"
  }
];
```

### 4. Criar o endpoint no backend (se necessário)

Se o relatório precisar de novos endpoints, adicione-os em:

```
backend/src/report/
├── report.controller.ts  # Adicione novos endpoints aqui
└── report.service.ts     # Adicione a lógica de negócio aqui
```

## Ícones disponíveis

Use emojis como ícones. Sugestões:

- 📋 Ocorrências/Tarefas
- 💰 Financeiro
- 📈 Vendas/Performance
- 👥 Clientes/Usuários
- 📦 Estoque/Produtos
- ⚡ Performance/Velocidade
- 📊 Analytics/Estatísticas
- 💳 Pagamentos
- 🏢 Empresas
- 📅 Agendamentos

## Cores disponíveis

Paleta de cores Tailwind CSS:

- `#9333ea` - Purple (roxo)
- `#059669` - Green (verde)
- `#0284c7` - Blue (azul)
- `#dc2626` - Red (vermelho)
- `#ea580c` - Orange (laranja)
- `#7c3aed` - Violet (violeta)
- `#0891b2` - Cyan (ciano)
- `#db2777` - Pink (rosa)

## Exemplo completo

Veja `ocorrencias/ocorrencias.component.ts` como referência completa de um relatório funcional com:
- Filtros
- Preview de dados
- Download CSV/Excel
- Envio por email
- Loading states
- Mensagens de erro/sucesso
