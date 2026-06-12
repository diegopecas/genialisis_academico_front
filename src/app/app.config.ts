import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  ErrorHandler,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { loadingInterceptor } from './core/loading.interceptor';
import { tenantInterceptor } from './core/tenant.interceptor';
import { authInterceptor } from './core/auth.interceptor';
import { InstitucionConfigService } from './services/institucion-config.service';
import { ChunkErrorHandler } from './core/chunk-error-handler';

export function initializeInstitucionConfig(
  institucionConfigService: InstitucionConfigService
) {
  return () => institucionConfigService.inicializar();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptors([loadingInterceptor, tenantInterceptor, authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeInstitucionConfig,
      deps: [InstitucionConfigService],
      multi: true,
    },
    {
      provide: ErrorHandler,
      useClass: ChunkErrorHandler,
    },
  ],
};