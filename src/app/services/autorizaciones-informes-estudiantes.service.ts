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
    providedIn: 'root'
})
export class AutorizacionesInformesEstudiantesService {

    private servicio = environment.api + 'autorizaciones-informes-estudiantes';

    constructor(private http: HttpClient) { }

    // Años que ya tienen sprints cargados, para el combo de la pantalla
    obtenerAnios() {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + '/anios', { observe: 'response' })
            .pipe(
                tap((response: HttpResponse<Object>) => {
                    let respuesta: any = response.body;
                    if (respuesta.error) throw respuesta.error;
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    // Maestro: cortes del año con su sprint de informe y los contadores
    obtenerCortes(anio: number) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/cortes/${anio}`, { observe: 'response' })
            .pipe(
                tap((response: HttpResponse<Object>) => {
                    let respuesta: any = response.body;
                    if (respuesta.error) throw respuesta.error;
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    // Detalle: estudiantes activos del año con su autorización y su saldo vencido
    obtenerEstudiantesCorte(idCorte: string, anio: number) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/corte/${idCorte}/${anio}`, { observe: 'response' })
            .pipe(
                tap((response: HttpResponse<Object>) => {
                    let respuesta: any = response.body;
                    if (respuesta.error) throw respuesta.error;
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    // Conceptos vencidos de un estudiante, para el detalle del chip de saldo
    obtenerConceptosVencidos(idEstudiante: string) {
        return this.http
            .get<HttpResponse<Object>>(this.servicio + `/conceptos-vencidos/${idEstudiante}`, { observe: 'response' })
            .pipe(
                tap((response: HttpResponse<Object>) => {
                    let respuesta: any = response.body;
                    if (respuesta.error) throw respuesta.error;
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    // Guardado en lote de las autorizaciones de un corte
    guardarLote(data: any) {
        return this.http
            .post<HttpResponse<Object>>(this.servicio + '/lote', data, httpOptions)
            .pipe(
                tap((response: any) => {
                    if (response.error) throw response.error;
                    return response;
                }),
                catchError(this.handleError)
            );
    }

    private handleError(error: HttpErrorResponse) {
        if (error.status === 0) {
            console.error('Ocurrió un error:', error.error);
        } else {
            console.error(
                `El servidor retornó el código ${error.status}, ` +
                `el cuerpo fue: `, error.error);
        }
        return throwError(() => new Error('Algo malo ocurrió; por favor intente de nuevo más tarde.'));
    }
}
