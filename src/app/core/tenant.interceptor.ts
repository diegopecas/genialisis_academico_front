import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { InstitucionConfigService } from '../services/institucion-config.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  // Excluir rutas que no requieren tenant
  if (req.headers.has('X-Skip-Tenant') || req.url.includes('/auth/pre-login')) {
    const cleanReq = req.clone({
      headers: req.headers.delete('X-Skip-Tenant')
    });
    return next(cleanReq);
  }

  const institucionConfigService = inject(InstitucionConfigService);
  
  let institucion: string;
  try {
    institucion = institucionConfigService.getTenantHeader();
  } catch (error) {
    console.error('❌ No se pudo obtener tenant - BLOQUEANDO petición');
    throw new Error('Institución no configurada - Acceso denegado');
  }

  const clonedReq = req.clone({
    setHeaders: {
      'X-Tenant': institucion
    }
  });

  return next(clonedReq);
};