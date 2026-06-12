import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AyudaService {

  private servicio = environment.api + 'ayuda';

  constructor(private http: HttpClient) {}

  private getPortal(): string {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        return usuario.portal || 'institucional';
      }
    } catch (e) {}
    return 'institucional';
  }

  obtenerModulos() {
    const portal = this.getPortal();
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/modulos?portal=${portal}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}