import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, EMPTY } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = authService.getToken();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && token) {
                // Só trata como sessão expirada se havia um token ativo.
                // 401 sem token = credenciais erradas no login → propaga normalmente
                // para que o componente de login exiba a mensagem de erro.
                authService.clearAuthState();
                router.navigate(['/login'], { queryParams: { expired: '1' } });
                return EMPTY;
            }
            return throwError(() => error);
        })
    );
};
