import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../../../../common/header/header.component';
import { AutorizacionesInformesEstudiantesService } from '../../../../services/autorizaciones-informes-estudiantes.service';
import { InformeEstudianteService } from '../../../../services/informe-estudiante.service';
import { InformesEstudiantesService } from '../../../../services/informes-estudiantes.service';
import { InformesConfiguracionService } from '../../../../services/informes-configuracion.service';
import { ValoresParametrosCalificacionesService } from '../../../../services/valores-parametros-calificaciones.service';
import { ExportarPdfInformeService } from '../../../../services/exportar-pdf-informe.service';
import Swal from 'sweetalert2';

interface EstudianteAutorizacion {
  id_estudiante: string;
  id_persona: string;
  nombre_estudiante: string;
  numero_identificacion: string;
  id_grupo: string;
  nombre_grupo: string;
  color_grupo: string;
  autorizado: number;
  fecha_autorizacion: string | null;
  saldo_vencido: number;
  cuentas_vencidas: number;
  dias_vencido_max: number;
}

@Component({
  selector: 'app-autorizar-informes',
  templateUrl: './autorizar-informes.component.html',
  styleUrl: './autorizar-informes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class AutorizarInformesComponent implements OnInit, OnDestroy {

  titulo = 'Autorizar Informes';

  public idCorte: string = '';
  public anio: number = new Date().getFullYear();
  public nombreCorte: string = '';
  public sprintInforme: any = null;

  public estudiantes: EstudianteAutorizacion[] = [];
  public grupos: { id: string, nombre: string }[] = [];

  public filtroTexto: string = '';
  public filtroGrupo: string = '';
  // Vacio es todos. 'pendientes' son los que aun no tienen autorizacion.
  public filtroAutorizacion: string = '';
  // Vacio es todos. 'al_dia' son los que no tienen saldo vencido.
  public filtroCartera: string = '';
  // Topes de cartera. Null es sin tope. Pasan los que deben hasta ese valor,
  // incluidos los que estan al dia.
  public maxDiasVencidos: number | null = null;
  public maxSaldoVencido: number | null = null;

  public cargando: boolean = false;
  public guardando: boolean = false;
  public generandoInforme: string = '';

  // Informes del módulo nuevo para este corte, por estudiante. Cuando el
  // estudiante tiene uno confirmado, el botón descarga ese boletín; si no,
  // cae al informe viejo del sprint, que es lo que todavía usa Lumen.
  private informesNuevos = new Map<string, any>();
  private valores: any[] = [];
  private configuracion: any = null;
  private logoBase64 = '';

  // Estado inicial de cada autorizacion, para saber que cambio y no mandar al
  // backend filas que el usuario no toco.
  private estadoOriginal: Map<string, number> = new Map();

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private autorizacionesService: AutorizacionesInformesEstudiantesService,
    private informeEstudianteService: InformeEstudianteService,
    private informesEstudiantesService: InformesEstudiantesService,
    private informesConfiguracionService: InformesConfiguracionService,
    private valoresService: ValoresParametrosCalificacionesService,
    private exportarPdfInformeService: ExportarPdfInformeService
  ) { }

  ngOnInit(): void {
    this.idCorte = this.route.snapshot.paramMap.get('idCorte') || '';
    const anioParam = this.route.snapshot.queryParamMap.get('anio');
    if (anioParam) this.anio = Number(anioParam);

    this.cargarCorte();
    this.cargarEstudiantes();
    this.cargarInformesNuevos();
    this.cargarEscala();

    this.exportarPdfInformeService.cargarLogoBase64().then(logo => {
      this.logoBase64 = logo;
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // El corte se vuelve a pedir en vez de pasarlo por el router, para que la
  // pantalla funcione igual si se entra por URL directa.
  cargarCorte(): void {
    const sub = this.autorizacionesService.obtenerCortes(this.anio).subscribe({
      next: (response: any) => {
        const cortes = (response.body || []) as any[];
        const corte = cortes.find(c => c.id_corte_academico === this.idCorte);

        if (corte) {
          this.nombreCorte = corte.nombre_corte;
          this.sprintInforme = corte.id_sprint_informe ? {
            id: corte.id_sprint_informe,
            nombre_sprint: corte.nombre_sprint,
            fecha_final: corte.fecha_final_sprint,
            nombre_corte_academico: corte.nombre_corte,
            finalizado: Number(corte.sprint_finalizado) === 1
          } : null;
        }
      },
      error: (error) => console.error('Error al cargar el corte:', error)
    });

    this.subscriptions.push(sub);
  }

  cargarEstudiantes(): void {
    this.cargando = true;

    const sub = this.autorizacionesService.obtenerEstudiantesCorte(this.idCorte, this.anio).subscribe({
      next: (response: any) => {
        this.estudiantes = ((response.body || []) as any[]).map(e => ({
          ...e,
          autorizado: Number(e.autorizado) || 0,
          saldo_vencido: parseFloat(e.saldo_vencido) || 0,
          cuentas_vencidas: Number(e.cuentas_vencidas) || 0,
          dias_vencido_max: Number(e.dias_vencido_max) || 0
        }));

        this.estadoOriginal = new Map();
        this.estudiantes.forEach(e => this.estadoOriginal.set(e.id_estudiante, e.autorizado));

        this.armarGrupos();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar los estudiantes:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los estudiantes.', 'error');
      }
    });

    this.subscriptions.push(sub);
  }

  private armarGrupos(): void {
    const vistos = new Map<string, string>();
    this.estudiantes.forEach(e => {
      if (e.id_grupo && !vistos.has(e.id_grupo)) {
        vistos.set(e.id_grupo, e.nombre_grupo);
      }
    });

    this.grupos = Array.from(vistos.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // Los filtros se suman. El texto busca por nombre y por identificacion.
  get estudiantesFiltrados(): EstudianteAutorizacion[] {
    const texto = this.filtroTexto.trim().toLowerCase();

    return this.estudiantes.filter(e => {
      if (this.filtroGrupo && e.id_grupo !== this.filtroGrupo) return false;

      if (this.filtroAutorizacion === 'pendientes' && e.autorizado === 1) return false;
      if (this.filtroAutorizacion === 'autorizados' && e.autorizado !== 1) return false;

      if (this.filtroCartera === 'vencido' && e.saldo_vencido <= 0) return false;
      if (this.filtroCartera === 'al_dia' && e.saldo_vencido > 0) return false;

      if (this.topeDias !== null && e.dias_vencido_max > this.topeDias) return false;
      if (this.topeSaldo !== null && e.saldo_vencido > this.topeSaldo) return false;

      if (texto) {
        const nombre = (e.nombre_estudiante || '').toLowerCase();
        const identificacion = (e.numero_identificacion || '').toLowerCase();
        if (!nombre.includes(texto) && !identificacion.includes(texto)) return false;
      }

      return true;
    });
  }

  get totalAutorizados(): number {
    return this.estudiantes.filter(e => e.autorizado === 1).length;
  }

  get totalConSaldo(): number {
    return this.estudiantes.filter(e => e.saldo_vencido > 0).length;
  }

  get totalPendientes(): number {
    return this.estudiantes.filter(e => e.autorizado !== 1).length;
  }

  // El input numerico puede quedar en null o en cadena vacia al borrarlo, y en
  // los dos casos significa que no hay tope.
  private normalizarTope(valor: any): number | null {
    if (valor === null || valor === undefined || valor === '') return null;

    const numero = Number(valor);
    return isNaN(numero) ? null : numero;
  }

  get topeDias(): number | null {
    return this.normalizarTope(this.maxDiasVencidos);
  }

  get topeSaldo(): number | null {
    return this.normalizarTope(this.maxSaldoVencido);
  }

  get hayFiltrosPuestos(): boolean {
    return !!(
      this.filtroTexto ||
      this.filtroGrupo ||
      this.filtroAutorizacion ||
      this.filtroCartera ||
      this.topeDias !== null ||
      this.topeSaldo !== null
    );
  }

  get hayCambiosPendientes(): boolean {
    return this.estudiantes.some(e => this.estadoOriginal.get(e.id_estudiante) !== e.autorizado);
  }

  get totalCambios(): number {
    return this.estudiantes.filter(e => this.estadoOriginal.get(e.id_estudiante) !== e.autorizado).length;
  }

  toggleAutorizado(estudiante: EstudianteAutorizacion): void {
    estudiante.autorizado = estudiante.autorizado === 1 ? 0 : 1;
  }

  // Los masivos actuan solo sobre lo que se ve con los filtros puestos, para no
  // tocar por accidente estudiantes que no estan a la vista.
  autorizarTodos(): void {
    this.estudiantesFiltrados.forEach(e => e.autorizado = 1);
  }

  quitarTodos(): void {
    this.estudiantesFiltrados.forEach(e => e.autorizado = 0);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroGrupo = '';
    this.filtroAutorizacion = '';
    this.filtroCartera = '';
    this.maxDiasVencidos = null;
    this.maxSaldoVencido = null;
  }

  verConceptosVencidos(estudiante: EstudianteAutorizacion): void {
    if (estudiante.saldo_vencido <= 0) return;

    const sub = this.autorizacionesService.obtenerConceptosVencidos(estudiante.id_estudiante).subscribe({
      next: (response: any) => {
        const conceptos = (response.body || []) as any[];

        const filas = conceptos.map(c => `
          <tr>
            <td style="text-align:left">
              ${c.nombre_producto}
              ${Number(c.es_mora) === 1 ? '<span class="badge bg-warning text-dark ms-1">Mora</span>' : ''}
              <br><small style="color:#6c757d">${c.nombre_clasificacion || ''}</small>
            </td>
            <td style="text-align:center">${this.formatearFecha(c.fecha_cuenta)}</td>
            <td style="text-align:center">${c.dias_vencido}</td>
            <td style="text-align:right;color:#dc3545;font-weight:600">${this.formatearMoneda(c.saldo_pendiente)}</td>
          </tr>
        `).join('');

        Swal.fire({
          title: 'Cobros vencidos',
          html: `
            <p style="text-align:left;margin-bottom:0.75rem">
              <strong>${estudiante.nombre_estudiante}</strong><br>
              <span style="color:#6c757d">${estudiante.nombre_grupo}</span>
            </p>
            <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
              <thead>
                <tr style="background:#f8f9fa">
                  <th style="text-align:left;padding:0.35rem">Concepto</th>
                  <th style="padding:0.35rem">Fecha</th>
                  <th style="padding:0.35rem">Días</th>
                  <th style="text-align:right;padding:0.35rem">Saldo</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
              <tfoot>
                <tr style="background:#f8f9fa;font-weight:700">
                  <td colspan="3" style="text-align:left;padding:0.35rem">TOTAL</td>
                  <td style="text-align:right;padding:0.35rem;color:#dc3545">
                    ${this.formatearMoneda(estudiante.saldo_vencido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          `,
          width: 700,
          confirmButtonText: 'Cerrar'
        });
      },
      error: (error) => {
        console.error('Error al cargar los conceptos vencidos:', error);
        Swal.fire('Error', 'No se pudieron cargar los conceptos vencidos.', 'error');
      }
    });

    this.subscriptions.push(sub);
  }

  /**
   * Informes del módulo nuevo para este corte. Se piden por grupo porque no
   * hay un endpoint por corte completo, y se indexan por estudiante.
   */
  cargarInformesNuevos(): void {
    const sub = this.informesEstudiantesService.obtenerGruposConInforme(this.idCorte).subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        body.forEach(i => this.informesNuevos.set(i.id_estudiante, i));
      },
      error: (error) => console.error('Error al cargar los informes del corte:', error)
    });

    this.subscriptions.push(sub);
  }

  /** La escala del parámetro marcado, para pintar el PDF */
  cargarEscala(): void {
    const sub = this.informesConfiguracionService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.configuracion = body.length > 0 ? body[0] : null;

        if (!this.configuracion?.id_parametro_evaluacion) {
          return;
        }

        const sub2 = this.valoresService
          .obtenerByParametro(this.configuracion.id_parametro_evaluacion)
          .subscribe({
            next: (resp: any) => {
              const valores = (resp.body as any[]) || [];
              this.valores = valores.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
            },
            error: (error) => console.error('Error al cargar la escala:', error)
          });
        this.subscriptions.push(sub2);
      },
      error: (error) => console.error('Error al cargar la configuración del informe:', error)
    });

    this.subscriptions.push(sub);
  }

  /** True si el estudiante tiene informe del módulo nuevo en este corte */
  tieneInformeNuevo(estudiante: any): boolean {
    return this.informesNuevos.has(estudiante.id_estudiante);
  }

  /** El botón solo se bloquea cuando no hay ninguno de los dos informes */
  puedeVerInforme(estudiante: any): boolean {
    return this.tieneInformeNuevo(estudiante) || !!this.sprintInforme;
  }

  /** Descarga el boletín nuevo con el mismo formato del portal de padres */
  private descargarInformeNuevo(estudiante: any): void {
    this.generandoInforme = estudiante.id_estudiante;

    const sub = this.informesEstudiantesService
      .obtenerPorEstudianteCorte(estudiante.id_estudiante, this.idCorte)
      .subscribe({
        next: (response: any) => {
          const body: any = response.body;
          this.generandoInforme = '';

          if (!body?.informe) {
            Swal.fire('Sin informe', 'No se encontró el informe de este estudiante.', 'info');
            return;
          }

          this.exportarPdfInformeService.generarPDF({
            tituloInforme:     this.configuracion?.titulo_informe,
            encabezado:        this.configuracion?.encabezado,
            piePagina:         this.configuracion?.pie_pagina,
            firmaUno:          this.configuracion?.firma_uno,
            firmaDos:          this.configuracion?.firma_dos,
            firmaAcudiente:    this.configuracion?.firma_acudiente == 1,
            muestraAusencias:  this.configuracion?.muestra_ausencias == 1,
            logoBase64:        this.logoBase64,

            estiloMarca:       this.configuracion?.estilo_marca || 'columnas',
            simboloMarca:      this.configuracion?.simbolo_marca || 'x',
            colorPrincipal:    this.configuracion?.color_principal || null,
            mostrarConvencion: this.configuracion?.mostrar_convencion != 0,

            nombreEstudiante:  body.informe.nombre_estudiante,
            nombreGrupo:       body.informe.nombre_grupo,
            nombreCorte:       this.nombreCorte,
            ausencias:         body.informe.ausencias,
            textoCierre:       body.informe.texto_cierre,
            estado:            body.informe.estado,

            valores:   this.valores,
            secciones: body.secciones || []
          });
        },
        error: (error) => {
          console.error('Error al descargar el informe:', error);
          this.generandoInforme = '';
          Swal.fire('Error', 'No se pudo generar el informe de este estudiante.', 'error');
        }
      });

    this.subscriptions.push(sub);
  }

  // Reusa el mismo servicio que genera el PDF del portal de padres, para que el
  // documento que revisas sea exactamente el que va a ver el acudiente.
  generarInforme(estudiante: EstudianteAutorizacion): void {
    // El boletín nuevo manda: si el estudiante lo tiene, es el que el
    // acudiente va a ver. El del sprint queda para los jardines que aún
    // no migraron.
    if (this.tieneInformeNuevo(estudiante)) {
      this.descargarInformeNuevo(estudiante);
      return;
    }

    if (!this.sprintInforme) {
      Swal.fire({
        icon: 'warning',
        title: 'Este estudiante no tiene informe',
        text: 'No hay informe confirmado para este corte ni un sprint marcado como sprint de informe.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.generandoInforme = estudiante.id_estudiante;

    const sub = this.informeEstudianteService
      .generarYDescargarInforme(estudiante.id_estudiante, this.sprintInforme)
      .subscribe({
        next: () => {
          this.generandoInforme = '';
        },
        error: (error) => {
          console.error('Error al generar el informe:', error);
          this.generandoInforme = '';
          Swal.fire('Error', 'No se pudo generar el informe de este estudiante.', 'error');
        }
      });

    this.subscriptions.push(sub);
  }

  guardar(): void {
    const cambios = this.estudiantes
      .filter(e => this.estadoOriginal.get(e.id_estudiante) !== e.autorizado)
      .map(e => ({ id_estudiante: e.id_estudiante, autorizado: e.autorizado }));

    if (cambios.length === 0) {
      Swal.fire('Sin cambios', 'No hay autorizaciones por guardar.', 'info');
      return;
    }

    this.guardando = true;

    const sub = this.autorizacionesService.guardarLote({
      id_corte_academico: this.idCorte,
      anio: this.anio,
      estudiantes: cambios
    }).subscribe({
      next: () => {
        this.guardando = false;

        // Se vuelve a leer del back para que la lista y los filtros muestren
        // lo que realmente quedo grabado, no lo que quedo en memoria.
        this.cargarEstudiantes();

        Swal.fire({
          icon: 'success',
          title: 'Autorizaciones guardadas',
          text: `Se actualizaron ${cambios.length} estudiantes.`,
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al guardar las autorizaciones:', error);
        this.guardando = false;
        Swal.fire('Error', 'No se pudieron guardar las autorizaciones.', 'error');
      }
    });

    this.subscriptions.push(sub);
  }

  regresar(): void {
    this.router.navigate(['/operaciones/autorizacion-informes']);
  }

  iniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();

    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';

    const partes = String(fecha).substring(0, 10).split('-');
    if (partes.length !== 3) return String(fecha);

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}