import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';
import { tabGuard } from './core/guards/tab.guard';

export const routes: Routes = [
    {
        path: 'login',
        canActivate: [publicGuard],
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'invite',
        canActivate: [publicGuard],
        loadComponent: () => import('./features/auth/invite-code.component').then(m => m.InviteCodeComponent)
    },
    {
        path: 'setup',
        loadComponent: () => import('./features/auth/setup.component').then(m => m.SetupComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent)
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('./shared/layout/layout.component').then(m => m.LayoutComponent),
        children: [
            {
                path: 'dashboard',
                canActivate: [tabGuard],
                data: { tabs: ['dashboard'] },
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'reports',
                canActivate: [tabGuard],
                data: { tabs: ['reports'] },
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/reports/reports-list.component').then(m => m.ReportsListComponent)
                    },
                    {
                        path: 'ocorrencias',
                        loadComponent: () => import('./features/reports/ocorrencias/ocorrencias.component').then(m => m.OcorrenciasComponent)
                    }
                ]
            },
            {
                path: 'relatorios',
                redirectTo: 'reports',
                pathMatch: 'prefix'
            },
            {
                path: 'usuarios',
                canActivate: [tabGuard],
                data: { tabs: ['usuarios'] },
                loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
            },
            {
                path: 'jobs',
                canActivate: [tabGuard],
                data: { tabs: ['jobs'] },
                loadComponent: () => import('./features/jobs/jobs.component').then(m => m.JobsComponent)
            },
            {
                path: 'perfil',
                loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'configuracoes',
                canActivate: [tabGuard],
                data: { tabs: ['configuracoes'] },
                loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
            },
            {
                path: 'gosac-pontta',
                canActivate: [tabGuard],
                data: { tabs: ['gosac-pontta'] },
                loadComponent: () => import('./features/gosac-pontta/gosac-pontta.component').then(m => m.GosacPonttaComponent),
                children: [
                    {
                        path: 'grupos',
                        canActivate: [tabGuard],
                        data: { tabs: ['gosac-pontta/grupos'] },
                        loadComponent: () => import('./features/gosac-pontta/grupos/grupos.component').then(m => m.GruposComponent)
                    },
                    {
                        path: 'rodizio',
                        canActivate: [tabGuard],
                        data: { tabs: ['gosac-pontta/rodizio'] },
                        loadComponent: () => import('./features/gosac-pontta/rodizio/rodizio.component').then(m => m.RodizioComponent)
                    },
                    {
                        path: 'rodizio-pontta',
                        canActivate: [tabGuard],
                        data: { tabs: ['gosac-pontta/rodizio-pontta'] },
                        loadComponent: () => import('./features/gosac-pontta/rodizio-pontta/rodizio-pontta.component').then(m => m.RodizioPonttaComponent)
                    },
                    {
                        path: 'pagamento-montador',
                        canActivate: [tabGuard],
                        data: { tabs: ['gosac-pontta/pagamento-montador'] },
                        loadComponent: () => import('./features/gosac-pontta/pagamento-montador/pagamento-montador.component').then(m => m.PagamentoMontadorComponent)
                    },
                    {
                        path: 'webhooks',
                        canActivate: [tabGuard],
                        data: { tabs: ['gosac-pontta'] },
                        loadComponent: () => import('./features/gosac-pontta/webhooks/webhooks.component').then(m => m.WebhooksComponent)
                    },
                    {
                        path: '',
                        redirectTo: 'grupos',
                        pathMatch: 'full'
                    }
                ]
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
