import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs';
import { AccessService } from '../services/access.service';

export const tabGuard: CanActivateFn = (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  const access = inject(AccessService);
  const router = inject(Router);

  // Only the current route's tabs — merging parent tabs would OR-match and leak
  // sibling access (e.g. user with only grupos could open rodizio via parent).
  const dataTabs = route.data?.['tabs'];
  const required = Array.isArray(dataTabs)
    ? dataTabs.filter((t): t is string => typeof t === 'string')
    : [];
  if (!required.length) return true;

  return access.ensureLoaded().pipe(
    map(() => {
      if (access.canAccess(required)) return true;
      return router.createUrlTree([access.firstAllowedRoute()]);
    }),
  );
};
