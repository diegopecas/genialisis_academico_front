import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { FechaInputComponent } from '../../../common/fecha-input/fecha-input.component';
import { NovedadesEspaciosService } from '../../../services/novedades-espacios.service';
import { ReportesNovedadesEspaciosService } from '../../../services/reportes-novedades-espacios.service';
import { LugaresCursosExtraService } from '../../../services/lugares-cursos-extra.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { ExportarPdfNovedadesEspaciosService, DatosReporteNovedadesPDF } from '../../../services/exportar-pdf-novedades-espacios.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado)
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

/**
 * Novedades de las canchas (espacios de los lugares de cursos extra).
 * - Novedades por estado: sin reportar (se editan y van al reporte),
 *   reportadas (se marcan como cruzadas cuando el club ya las descontó o
 *   devolvió) y cruzadas.
 * - Generar reporte: con las sin reportar marcadas de un mismo lugar sale el
 *   PDF para el club y quedan reportadas.
 * - Reportes enviados: el historial, desde donde el PDF se vuelve a generar
 *   idéntico.
 */
@Component({
  selector: 'app-novedades-espacios',
  templateUrl: './novedades-espacios.component.html',
  styleUrl: './novedades-espacios.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent, FechaInputComponent]
})
export class NovedadesEspaciosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent?: TablasComponent;

  titulo = 'Novedades de Espacios';
  cargando = false;
  procesando = false;

  // Abre en Sin reportar: es lo que falta mandarle al club
  pestanaActiva: string = 'sin_reportar';
  pestanas = [
    { clave: 'sin_reportar', texto: 'Sin reportar' },
    { clave: 'reportada', texto: 'Reportadas' },
    { clave: 'cruzada', texto: 'Cruzadas' },
    { clave: 'todas', texto: 'Todas' },
    { clave: 'reportes', texto: 'Reportes enviados' }
  ];

  // Filtros: lugar y rango de fechas (de entrada, los últimos 30 días)
  lugares: any[] = [];
  idLugar: string = '';
  desde: string = '';
  hasta: string = '';

  // Novedades del rango; en la tabla van las de la pestaña
  private novedades: any[] = [];
  seleccionadas: any[] = [];

  titulos: any[] = [];
  datos: any[] = [];
  acciones: any[] = [];
  columnasFiltro: any[] = [];

  constructor(
    private router: Router,
    private novedadesService: NovedadesEspaciosService,
    private reportesService: ReportesNovedadesEspaciosService,
    private lugaresService: LugaresCursosExtraService,
    private institucionConfigService: InstitucionConfigService,
    private exportarPdfService: ExportarPdfNovedadesEspaciosService
  ) { }

  ngOnInit(): void {
    const hoy = new Date();
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
    this.hasta = this.iso(hoy);
    this.desde = this.iso(inicio);
    this.lugaresService.obtenerTodos().subscribe({
      next: (response: any) => this.lugares = (response.body || []) as any[],
      error: (error: any) => console.error('Error al cargar los lugares', error)
    });
    this.cargar();
  }

  get esReportes(): boolean {
    return this.pestanaActiva === 'reportes';
  }

  seleccionarPestana(clave: string) {
    this.pestanaActiva = clave;
    this.seleccionadas = [];
    this.tablasComponent?.limpiarSeleccion();
    this.cargar();
  }

  /** Recarga la pestaña: novedades del rango o el historial de reportes */
  cargar() {
    this.cargando = true;
    if (this.esReportes) {
      this.definirTablaReportes();
      this.reportesService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.cargando = false;
          this.datos = ((response.body || []) as any[])
            .filter((r: any) => !this.idLugar || r.id_lugar_curso_extra === this.idLugar)
            .map((r: any) => ({
              ...r,
              periodo: r.fecha_desde === r.fecha_hasta ? r.fecha_desde : `${r.fecha_desde} a ${r.fecha_hasta}`,
              horas: this.horas(Number(r.total_minutos || 0)),
              generado: String(r.fecha_registro || '').substring(0, 16)
            }));
        },
        error: (error: any) => {
          this.cargando = false;
          Swal.fire('Error', error?.error?.error || 'No se pudo cargar el historial.', 'error');
        }
      });
      return;
    }

    this.definirTablaNovedades();
    this.novedadesService.obtenerTodos({ desde: this.desde, hasta: this.hasta, id_lugar: this.idLugar }).subscribe({
      next: (response: any) => {
        this.cargando = false;
        this.novedades = ((response.body || []) as any[]).map((n: any) => ({
          ...n,
          horario: `${String(n.hora_inicial).substring(0, 5)} - ${String(n.hora_final).substring(0, 5)}`,
          horas: this.horas(Number(n.minutos || 0)),
          estado_mostrar: this.etiquetaEstado(n.estado),
          observaciones: n.observaciones || '',
          editable: n.estado === 'sin_reportar' ? 1 : 0,
          // Pastel por estado: amarillo sin reportar, verde cruzada
          color: n.estado === 'sin_reportar' ? '#fff6dc' : n.estado === 'cruzada' ? '#eaf6e6' : ''
        }));
        this.datos = this.pestanaActiva === 'todas' ? this.novedades
          : this.novedades.filter((n: any) => n.estado === this.pestanaActiva);
      },
      error: (error: any) => {
        this.cargando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudieron cargar las novedades.', 'error');
      }
    });
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: any = { sin_reportar: 'Sin reportar', reportada: 'Reportada', cruzada: 'Cruzada' };
    return etiquetas[estado] || estado;
  }

  onSeleccion(registros: any[]) {
    this.seleccionadas = registros || [];
  }

  // ===== Acciones de la tabla =====

  clicAccion($event: any) {
    const r = $event.registro;
    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['/operaciones/novedades-espacios/consultar/' + r.id]);
        break;
      case 'editar':
        this.router.navigate(['/operaciones/novedades-espacios/editar/' + r.id]);
        break;
      case 'eliminar':
        this.eliminar(r);
        break;
      case 'descargar':
        this.pdfDeReporte(r.id, false);
        break;
      case 'compartir':
        this.pdfDeReporte(r.id, true);
        break;
    }
  }

  async eliminar(n: any) {
    const result = await Swal.fire({
      title: '¿Eliminar la novedad?',
      text: `${n.nombre_espacio} · ${n.fecha} · ${n.horario}`,
      icon: 'warning',
      showCancelButton: true,
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.novedadesService.eliminar(n.id).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Novedad eliminada', showConfirmButton: false, timer: 1800 });
        this.cargar();
      },
      error: (error: any) => Swal.fire('Error', error?.error?.error || 'No se pudo eliminar la novedad.', 'error')
    });
  }

  // ===== Reporte para el club =====

  async generarReporte() {
    const marcadas = this.seleccionadas.filter((n: any) => n.estado === 'sin_reportar');
    if (marcadas.length === 0) {
      Swal.fire('Marca las novedades', 'Marca en la tabla las novedades sin reportar que van en el reporte.', 'info');
      return;
    }
    const lugares = Array.from(new Set(marcadas.map((n: any) => n.id_lugar_curso_extra)));
    if (lugares.length > 1) {
      Swal.fire('Un lugar por reporte', 'Marca novedades de un mismo lugar; puedes filtrar arriba por lugar.', 'warning');
      return;
    }
    const minutos = marcadas.reduce((s: number, n: any) => s + Number(n.minutos || 0), 0);
    const result = await Swal.fire({
      title: '¿Generar el reporte?',
      html: `Sale el PDF de <b>${marcadas.length}</b> ${marcadas.length === 1 ? 'novedad' : 'novedades'} de ` +
        `<b>${marcadas[0].nombre_lugar}</b> (${this.horas(minutos)}) y quedan como <b>reportadas</b>. ` +
        `Después lo puedes volver a generar desde Reportes enviados.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.procesando = true;
    this.reportesService.generar(marcadas.map((n: any) => n.id)).subscribe({
      next: async (reporte: any) => {
        this.procesando = false;
        this.seleccionadas = [];
        this.tablasComponent?.limpiarSeleccion();
        this.cargar();
        const datos = await this.armarDatosPdf(reporte);
        // Se comparte por WhatsApp o correo, o se descarga
        const opcion = await Swal.fire({
          title: 'Reporte generado',
          text: 'Las novedades quedaron reportadas. ¿Qué hacemos con el PDF para el club?',
          icon: 'success',
          showDenyButton: true,
          confirmButtonText: '<i class="fas fa-share-alt me-1"></i> Compartir (WhatsApp, correo...)',
          denyButtonText: '<i class="fas fa-download me-1"></i> Descargar PDF',
          denyButtonColor: '#6c757d'
        });
        if (opcion.isConfirmed) {
          await this.compartirPdf(datos);
        } else if (opcion.isDenied) {
          this.exportarPdfService.generarPDF(datos);
        }
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('No se generó', error?.error?.error || 'No se pudo generar el reporte.', 'error');
        this.cargar();
      }
    });
  }

  async marcarCruzadas() {
    const marcadas = this.seleccionadas.filter((n: any) => n.estado === 'reportada');
    if (marcadas.length === 0) {
      Swal.fire('Marca las novedades', 'Marca en la tabla las novedades reportadas que el club ya descontó o devolvió.', 'info');
      return;
    }
    const result = await Swal.fire({
      title: '¿Marcar como cruzadas?',
      html: `<b>${marcadas.length}</b> ${marcadas.length === 1 ? 'novedad queda' : 'novedades quedan'} como cruzadas: el club ya las descontó o las devolvió.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.procesando = true;
    this.novedadesService.cruzar(marcadas.map((n: any) => n.id)).subscribe({
      next: (r: any) => {
        this.procesando = false;
        this.seleccionadas = [];
        this.tablasComponent?.limpiarSeleccion();
        Swal.fire('Listo', `${r.cruzadas} ${r.cruzadas === 1 ? 'novedad quedó cruzada' : 'novedades quedaron cruzadas'}.`, 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudieron marcar.', 'error');
      }
    });
  }

  /** Vuelve a generar el PDF de un reporte del historial, idéntico al original */
  private pdfDeReporte(id: string, compartir: boolean) {
    this.procesando = true;
    this.reportesService.obtenerById(id).subscribe({
      next: async (response: any) => {
        const datos = await this.armarDatosPdf(response.body);
        this.procesando = false;
        if (compartir) {
          // El navegador solo deja compartir justo después de un clic: el
          // reporte ya cargó, así que se pide el clic aquí
          const opcion = await Swal.fire({
            title: 'Compartir el reporte',
            text: `${datos.nombre_lugar} · ${datos.cantidad} ${Number(datos.cantidad) === 1 ? 'novedad' : 'novedades'}`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-share-alt me-1"></i> Compartir (WhatsApp, correo...)',
            cancelButtonText: 'Cancelar'
          });
          if (opcion.isConfirmed) {
            await this.compartirPdf(datos);
          }
        } else {
          this.exportarPdfService.generarPDF(datos);
        }
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo cargar el reporte.', 'error');
      }
    });
  }

  /**
   * En el celular abre el menú de compartir con el PDF adjunto (WhatsApp,
   * correo...). En el computador el navegador no deja pasarle el archivo a
   * WhatsApp: se descarga el PDF y se abre WhatsApp Web con el mensaje listo
   * para que se adjunte.
   */
  private async compartirPdf(datos: DatosReporteNovedadesPDF) {
    const mensaje = `Hola, te envío el reporte de novedades de ${datos.nombre_lugar} ` +
      (datos.fecha_desde === datos.fecha_hasta ? `del ${datos.fecha_desde}` : `del ${datos.fecha_desde} al ${datos.fecha_hasta}`) +
      ` (${datos.cantidad} ${Number(datos.cantidad) === 1 ? 'novedad' : 'novedades'}, ${this.horas(Number(datos.total_minutos || 0))}).`;
    const archivo = new File([this.exportarPdfService.generarBlob(datos)], this.exportarPdfService.nombreArchivo(datos),
      { type: 'application/pdf' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [archivo] })) {
      try {
        await nav.share({ files: [archivo], title: 'Novedades de ' + datos.nombre_lugar, text: mensaje });
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.error('Error al compartir el PDF', error);
      }
      return;
    }
    this.exportarPdfService.generarPDF(datos);
    window.open('https://wa.me/?text=' + encodeURIComponent(mensaje), '_blank');
    Swal.fire('Adjunta el PDF', 'Se descargó el PDF y se abrió WhatsApp con el mensaje listo: adjunta ahí el archivo descargado.', 'info');
  }

  private async armarDatosPdf(reporte: any): Promise<DatosReporteNovedadesPDF> {
    return { ...reporte, logoBase64: await this.cargarLogoBase64() } as DatosReporteNovedadesPDF;
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const respuesta = await fetch(this.institucionConfigService.getLogoUrl());
      if (!respuesta.ok) return '';
      const blob = await respuesta.blob();
      return await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(lector.result as string);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  // ===== Tablas =====

  private definirTablaNovedades() {
    // Fecha, cancha y horario primero: es lo que se ve en la tarjeta del celular
    this.titulos = [
      { clave: 'fecha', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'nombre_espacio', alias: 'Cancha', alinear: 'izquierda' },
      { clave: 'horario', alias: 'Horario', alinear: 'centrado' },
      { clave: 'horas', alias: 'Horas', alinear: 'centrado' },
      { clave: 'nombre_tipo', alias: 'Tipo', alinear: 'izquierda' },
      { clave: 'estado_mostrar', alias: 'Estado', alinear: 'centrado' },
      { clave: 'nombre_lugar', alias: 'Lugar', alinear: 'izquierda' },
      { clave: 'observaciones', alias: 'Observación', alinear: 'izquierda' }
    ];
    this.columnasFiltro = ['Cancha', 'Tipo', 'Estado', 'Lugar', { columna: 'Fecha', tipoFiltro: 'rango' }];
    this.acciones = [
      { id: 'consultar', label: 'Ver', icono: '/assets/images/detalle.png' },
      { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png', condicion: 'editable', valor: 1 },
      { id: 'eliminar', label: 'Eliminar', icono: '/assets/images/eliminar.png', condicion: 'editable', valor: 1 }
    ];
  }

  private definirTablaReportes() {
    this.titulos = [
      { clave: 'generado', alias: 'Generado', alinear: 'centrado' },
      { clave: 'nombre_lugar', alias: 'Lugar', alinear: 'izquierda' },
      { clave: 'periodo', alias: 'Período', alinear: 'centrado' },
      { clave: 'cantidad', alias: 'Novedades', alinear: 'centrado' },
      { clave: 'horas', alias: 'Horas', alinear: 'centrado' },
      { clave: 'generado_por', alias: 'Generado por', alinear: 'izquierda' }
    ];
    this.columnasFiltro = ['Lugar', 'Generado por'];
    this.acciones = [
      { id: 'compartir', label: 'Compartir (WhatsApp, correo...)', icono: '/assets/images/compartir.png' },
      { id: 'descargar', label: 'Volver a generar PDF', icono: '/assets/images/detalle.png' }
    ];
  }

  // 150 minutos -> "2 h 30 min"
  horas(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : (h > 0 ? `${h} h ${m} min` : `${m} min`);
  }

  private iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
