import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

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
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
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
                    }
                ]
            },
            // Mantém compatibilidade com rota antiga
            {
                path: 'relatorios',
                redirectTo: 'reports',
                pathMatch: 'prefix'
            },
            {
                path: 'usuarios',
                loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
            },
            {
                path: 'perfil',
                loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
            },
            {
                path: 'configuracoes',
                loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
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
