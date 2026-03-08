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
            if (error.status === 401) {
                // Limpa estado sem navegar, depois navega uma única vez com ?expired=1
                authService.clearAuthState();
                router.navigate(['/login'], { queryParams: { expired: '1' } });
                // Retorna EMPTY para não propagar o erro 401 aos componentes
                // (evita que qualquer handler local mostre a mensagem bruta do servidor)
                return EMPTY;
            }
            return throwError(() => error);
        })
    );
};
