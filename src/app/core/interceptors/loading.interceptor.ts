import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const shouldTrack = !(
    request.method === 'GET'
    && /(?:^|\/)notifications(?:\/?(?:\?|$))/i.test(request.urlWithParams)
  );

  if (!shouldTrack) {
    return next(request);
  }

  const loadingService = inject(LoadingService);
  loadingService.begin();

  return next(request).pipe(finalize(() => loadingService.end()));
};
