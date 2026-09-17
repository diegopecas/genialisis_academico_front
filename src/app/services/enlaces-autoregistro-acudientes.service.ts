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
import Swal from 'sweetalert2';
import { InstitucionConfigService } from './institucion-config.service';

/**
 * Enlaces temporales de autoregistro de acudientes (CRUD del portal institucional).
 */
@Injectable({
  providedIn: 'root'
})
export class EnlacesAutoregistroAcudientesService {

  private servicio = environment.api + 'enlaces-autoregistro-acudientes';

  constructor(
    private http: HttpClient,
    private institucionConfigService: InstitucionConfigService,
  ) { }

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
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
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

  crear(dato: any) {
    const body = JSON.stringify(dato);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(dato: any) {
    const body = JSON.stringify(dato);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.delete<any>(this.servicio, { ...httpOptions, body: body }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Estudiantes activos de los grupos indicados, para marcar en el formulario. */
  obtenerEstudiantesPorGrupos(grupos: any[]) {
    const body = JSON.stringify({ grupos: grupos });
    return this.http.post<any>(this.servicio + '/estudiantes-por-grupos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // ---------------------------------------------------------------
  // Compartir el enlace (listado y formulario)
  // ---------------------------------------------------------------

  /**
   * Copia el enlace al portapapeles. registro necesita url_enlace, estado y
   * fecha_vencimiento; total_estudiantes es opcional.
   */
  async copiarEnlace(registro: any): Promise<void> {
    if (!(await this.validarParaCompartir(registro))) {
      return;
    }

    const copiado = await this.copiarAlPortapapeles(registro.url_enlace);
    if (copiado) {
      Swal.fire({ icon: 'success', title: 'Enlace copiado', timer: 1500, showConfirmButton: false });
    } else {
      // Sin permiso de portapapeles: se muestra para copiar a mano.
      Swal.fire({
        title: 'Copia el enlace',
        input: 'text',
        inputValue: registro.url_enlace,
        confirmButtonText: 'Cerrar'
      });
    }
  }

  /** Abre WhatsApp con un mensaje que trae el enlace y su vencimiento. */
  async compartirWhatsapp(registro: any): Promise<void> {
    if (!(await this.validarParaCompartir(registro))) {
      return;
    }

    const jardin = this.institucionConfigService.getNombreInstitucion();
    const vence = this.formatearFechaHora(registro.fecha_vencimiento);
    const mensaje = `Hola 👋 Este es el enlace para crear tu usuario en el Portal de Padres de ${jardin}:\n\n`
      + `${registro.url_enlace}\n\n`
      + `Está disponible hasta ${vence}.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  /**
   * Si el enlace no se puede usar, avisa antes de copiarlo o compartirlo.
   * Devuelve false cuando no hay URL (falta el parámetro url_portal_padres).
   */
  private async validarParaCompartir(registro: any): Promise<boolean> {
    if (!registro?.url_enlace) {
      await Swal.fire('Falta configuración',
        'No se puede armar el enlace porque el parámetro url_portal_padres está vacío en Configuración Global.', 'warning');
      return false;
    }
    if (registro.estado && registro.estado !== 'Vigente') {
      const r = await Swal.fire({
        title: `Este enlace está ${String(registro.estado).toLowerCase()}`,
        text: 'Quien lo abra no podrá registrarse. ¿Quieres continuar de todas formas?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      });
      return r.isConfirmed;
    }
    if (registro.total_estudiantes !== undefined && Number(registro.total_estudiantes) === 0) {
      await Swal.fire('Sin estudiantes', 'Este enlace no tiene estudiantes. Edítalo y marca los que quieres mostrar.', 'warning');
      return false;
    }
    return true;
  }

  private async copiarAlPortapapeles(texto: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch {
      // se intenta con el método alterno
    }

    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }

  private formatearFechaHora(valor: string): string {
    if (!valor) return '';
    const fecha = new Date(String(valor).replace(' ', 'T'));
    if (isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString('es-CO', { day: '2-digit', month: 'long', hour: 'numeric', minute: '2-digit' });
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}