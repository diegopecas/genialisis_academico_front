import {
    HttpClient,
    HttpErrorResponse,
    HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
    providedIn: 'root',
})
export class ObservacionesEstudiantesService {
    private servicio = environment.api + 'observaciones-estudiantes';

    constructor(private http: HttpClient) { }

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

    obtenerById(id: any) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
                observe: 'response',
            })
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

    obtenerPorEstudiante(id_estudiante: any) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/estudiante/${id_estudiante}`, {
                observe: 'response',
            })
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

    obtenerPorEstudianteAfectado(id_estudiante_afectado: any) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/afectado/${id_estudiante_afectado}`, {
                observe: 'response',
            })
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

    // Devuelve estudiantes activos, tipos de observación que aplican para informe,
    // observaciones existentes del sprint y acudientes (en una sola llamada).
    obtenerDatosRegistroInforme(id_sprint: any) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/datos-registro-informe/${id_sprint}`, {
                observe: 'response',
            })
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

    crear(elemento: any) {
        var body = JSON.stringify(elemento);
        return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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

    actualizar(elemento: any) {
        var body = JSON.stringify(elemento);
        return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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

    eliminar(elemento: any) {
        var body = JSON.stringify(elemento);
        return this.http.request<any>('DELETE', this.servicio, {
            body: body,
            headers: httpOptions.headers
        }).pipe(
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