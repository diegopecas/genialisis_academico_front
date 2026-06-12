import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable({
  providedIn: 'root' // Se asegura de que Angular lo reconozca globalmente
})
export class HttpRequestInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Agregar headers o modificar la petición
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    return next.handle(clonedReq).pipe(
      finalize(() => console.log(`Finalizando petición: ${req.url}`))
    );
  }
}
