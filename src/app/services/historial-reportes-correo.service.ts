import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Historial de envíos de los reportes por correo (tabla
 * historial_reportes_correo). Solo consulta: los envíos los registra el back.
 */
@Injectable({
  providedIn: 'root'
})
export class HistorialReportesCorreoService {

  private servicio = environment.api + 'historial-reportes-correo';

  constructor(private http: HttpClient) { }

  /**
   * Envíos con fecha de envío entre desde y hasta (AAAA-MM-DD). Con
   * idColaborador se limita a ese colaborador.
   */
  obtener(desde: string, hasta: string, idColaborador: any = null) {
    let params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta);
    if (idColaborador) {
      params = params.set('id_colaborador', idColaborador);
    }

    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response', params })
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

  /**
   * Columnas de texto para el componente de tablas. Lo usan el reporte y la
   * sección de historial del colaborador, para que se vean igual.
   */
  paraTabla(item: any): any {
    return {
      ...item,
      fecha_envio_texto: this.fechaHora(item.fecha_envio),
      fecha_reporte_texto: this.fecha(item.fecha_reporte),
      origen_texto: item.origen === 'CRON' ? 'Automático' : 'Manual',
      resultado_texto: item.exito == 1 ? 'Enviado' : 'Falló',
      correo_texto: item.correo_destino || 'Sin correo',
      error_texto: item.error || '',
      // Pastel: verde los enviados, rosa los que fallaron
      color: item.exito == 1 ? '#e3f1ea' : '#f8e4e1'
    };
  }

  /** Columnas del historial en el componente de tablas. Sin colaborador para la sección de un solo colaborador. */
  titulosTabla(conColaborador: boolean): any[] {
    const titulos = [
      { clave: 'fecha_envio_texto', alias: 'Enviado', alinear: 'centrado' },
      { clave: 'fecha_reporte_texto', alias: 'Reporte del día', alinear: 'centrado' },
      { clave: 'nombre_tipo', alias: 'Tipo de reporte', alinear: 'izquierda' },
      { clave: 'correo_texto', alias: 'Correo', alinear: 'izquierda' },
      { clave: 'origen_texto', alias: 'Origen', alinear: 'centrado' },
      { clave: 'resultado_texto', alias: 'Resultado', alinear: 'centrado' },
      { clave: 'error_texto', alias: 'Error', alinear: 'izquierda' },
    ] as any[];
    if (conColaborador) {
      titulos.splice(2, 0, { clave: 'nombre_colaborador', alias: 'Colaborador', alinear: 'izquierda' });
    }
    return titulos;
  }

  private fecha(valor: string): string {
    if (!valor) return '';
    const [anio, mes, dia] = String(valor).substring(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private fechaHora(valor: string): string {
    if (!valor) return '';
    const hora = String(valor).substring(11, 16);
    return `${this.fecha(valor)} ${hora}`;
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
