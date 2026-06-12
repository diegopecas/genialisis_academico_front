import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';
@Injectable({
  providedIn: 'root',
})
export class CasasDocentesService {
  private servicio = environment.api + 'casas-docentes';
  private servicioPuntos = environment.api + 'puntos-casas-docentes';
  private servicioPuntosMas = environment.api + 'casas-docentes-mas-puntos';
  private servicioPuntosMenos = environment.api + 'casas-docentes-menos-puntos';

  constructor(private http: HttpClient) {}

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  obtenerPuntosByCasa(idCasa:any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioPuntos+'/'+idCasa, { observe: 'response' })
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

  registrarPuntos(puntos:any, usuario: any) {
      
    const body = JSON.stringify({
      id_docente_entrega: usuario.id_docente, 
      id_docente_recibe: puntos.recibe.id ? puntos.recibe.id : null,
      id_casa_docente: puntos.casa.id,
      // id_tipo_puntos: puntos.tipo.id,
      valor: puntos.numeroPuntos,
      observacion: puntos.observacion 
    });
    
    return this.http.post<any>(this.servicioPuntos, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  registrarPuntosMas(puntos:any) {
      
    const body = JSON.stringify({
      id: puntos.casa.id,
      valor: puntos.numeroPuntos
    });
    console.log("registrarPuntosMas", body);
    
    return this.http.post<any>(this.servicioPuntosMas, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  registrarPuntosMenos(puntos:any) {
      
    const body = JSON.stringify({
      id: puntos.casa.id,
      valor: puntos.numeroPuntos
    });
    console.log("registrarPuntosMenos", body);
    return this.http.post<any>(this.servicioPuntosMenos, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
