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
                path: 'usuarios',
                canActivate: [tabGuard],
                data: { tabs: ['usuarios'] },
                loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent)
            },
            {
                path: 'rodizio',
                canActivate: [tabGuard],
                data: { tabs: ['rodizio'] },
                loadComponent: () => import('./features/rodizio/rodizio.component').then(m => m.RodizioComponent)
            },
            {
                path: 'ia',
                canActivate: [tabGuard],
                data: { tabs: ['ia'] },
                loadComponent: () => import('./features/ia/ia.component').then(m => m.IaComponent)
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
                path: '',
                redirectTo: 'ia',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
