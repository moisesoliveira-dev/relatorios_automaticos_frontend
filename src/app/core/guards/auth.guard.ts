import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated()) {
        return true;
    }

    // Se havia um token mas estava expirado (detectado no bootstrap), mostra aviso componentizado
    if (authService.sessionExpired()) {
        router.navigate(['/login'], { queryParams: { expired: '1' } });
    } else {
        router.navigate(['/login']);
    }
    return false;
};

export const publicGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return true;
    }

    router.navigate(['/dashboard']);
    return false;
};
