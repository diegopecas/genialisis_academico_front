import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { AreasFisicasService } from '../../../../services/areas-fisicas.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { ExportarPdfReporteAseoService } from '../../../../services/exportar-pdf-reporte-aseo.service';
import { ExportarExcelReporteAseoService } from '../../../../services/exportar-excel-reporte-aseo.service';

@Component({
  selector: 'app-reporte-aseo',
  templateUrl: './reporte-aseo.component.html',
  styleUrls: ['./reporte-aseo.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ReporteAseoComponent implements OnInit {

  titulo = 'Reporte de Aseo';

  procesos: any[] = [];
  areas: any[] = [];

  // Filtros
  fechaDesde = this.primerDiaMes();
  fechaHasta = this.hoy();
  idProceso = '';
  idArea = '';

  // Vista: 'fecha' o 'area'. Cambia la agrupación en pantalla y en el reporte.
  agruparPor: 'fecha' | 'area' = 'fecha';

  // Registros planos (todos), y agrupados para la vista
  registros: any[] = [];
  grupos: any[] = [];
  productosUsados: any[] = [];
  cargando = false;
  yaConsulto = false;

  constructor(
    private router: Router,
    private registrosService: RegistrosLimpiezaService,
    private procesosService: TiposProcesosLimpiezaService,
    private areasService: AreasFisicasService,
    private institucionConfig: InstitucionConfigService,
    private pdfService: ExportarPdfReporteAseoService,
    private excelService: ExportarExcelReporteAseoService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarAreas();
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
        // El proceso arranca sin seleccionar: el usuario debe elegirlo
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los procesos', 'error')
    });
  }

  cargarAreas() {
    this.areasService.obtenerActivas().subscribe({
      next: (response: any) => {
        this.areas = (response.body || [])
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar las áreas', 'error')
    });
  }

  get puedeConsultar(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && !!this.idProceso && !this.cargando;
  }

  consultar() {
    if (!this.puedeConsultar) return;

    if (this.fechaDesde > this.fechaHasta) {
      Swal.fire('Atención', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargando = true;
    this.yaConsulto = true;

    const filtros = {
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      id_proceso: this.idProceso,
      id_area: this.idArea || null
    };

    this.registrosService.obtenerReporteAseo(filtros).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.registros = (body.registros || []).map((r: any) => ({ ...r, seleccionado: true }));
        this.productosUsados = body.productos_usados || [];
        this.reagrupar();
        this.cargando = false;
      },
      error: (error: any) => {
        this.cargando = false;
        this.registros = [];
        this.grupos = [];
        this.productosUsados = [];
        Swal.fire('Error', error.error?.error || 'No se pudo generar el reporte', 'error');
      }
    });
  }

  cambiarAgrupacion(modo: 'fecha' | 'area') {
    if (this.agruparPor === modo) return;
    this.agruparPor = modo;
    this.reagrupar();
  }

  /** Agrupa los registros según el modo activo (por área o por fecha) */
  private reagrupar() {
    const mapa = new Map<string, any>();

    // Orden base según el modo
    const ordenados = [...this.registros].sort((a, b) => {
      if (this.agruparPor === 'area') {
        return a.area.localeCompare(b.area) || a.fecha.localeCompare(b.fecha);
      }
      return a.fecha.localeCompare(b.fecha) || a.area.localeCompare(b.area);
    });

    ordenados.forEach(r => {
      const clave = this.agruparPor === 'area' ? r.id_area_fisica : r.fecha;
      const titulo = this.agruparPor === 'area' ? r.area : this.formatearFechaVista(r.fecha);
      let grupo = mapa.get(clave);
      if (!grupo) {
        grupo = { clave, titulo, registros: [] };
        mapa.set(clave, grupo);
      }
      grupo.registros.push(r);
    });

    this.grupos = Array.from(mapa.values());

    // En la vista por fecha, el título lleva la fecha + el/los rango(s) de horas
    // de la jornada, para no repetir la hora en cada área.
    if (this.agruparPor === 'fecha') {
      this.grupos.forEach(g => {
        g.titulo = `${this.formatearFechaVista(g.registros[0].fecha)}  ·  ${this.rangosHorario(g.registros)}`;
      });
    }
  }

  /** Junta los rangos de horario distintos de una jornada (normalmente uno solo) */
  private rangosHorario(registros: any[]): string {
    const vistos = new Set<string>();
    const rangos: string[] = [];
    registros.forEach(r => {
      const rango = `${this.hm(r.hora_inicio)} - ${this.hm(r.hora_fin)}`;
      if (!vistos.has(rango)) {
        vistos.add(rango);
        rangos.push(rango);
      }
    });
    return rangos.join(', ');
  }

  /** Hora hasta minutos: '14:58:00' -> '14:58' */
  hm(hora: string): string {
    if (!hora) return '--:--';
    const partes = hora.split(':');
    return partes.length >= 2 ? `${partes[0]}:${partes[1]}` : hora;
  }

  private formatearFechaVista(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha + 'T00:00:00');
    return isNaN(d.getTime()) ? fecha : d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  get nombreProceso(): string {
    const p = this.procesos.find(x => x.id === this.idProceso);
    return p ? p.nombre : '';
  }

  get totalRegistros(): number {
    return this.registros.length;
  }

  get totalSeleccionados(): number {
    return this.registros.filter((r: any) => r.seleccionado).length;
  }

  toggleRegistro(registro: any) {
    registro.seleccionado = !registro.seleccionado;
  }

  toggleGrupo(grupo: any) {
    const marcar = !grupo.registros.every((r: any) => r.seleccionado);
    grupo.registros.forEach((r: any) => r.seleccionado = marcar);
  }

  grupoCompleto(grupo: any): boolean {
    return grupo.registros.every((r: any) => r.seleccionado);
  }

  seleccionadosDe(grupo: any): number {
    return grupo.registros.filter((r: any) => r.seleccionado).length;
  }

  resumenMobiliario(registro: any): string {
    if (!registro.resumen_tipos || registro.resumen_tipos.length === 0) {
      // Sin mobiliario formal: usar la descripción libre del área si existe
      if (registro.mobiliario_general && registro.mobiliario_general.trim()) {
        return registro.mobiliario_general.trim();
      }
      return 'Mobiliario dentro del área';
    }
    return registro.resumen_tipos.map((t: any) => `${t.tipo} (${t.conteo})`).join(', ');
  }

  resumenConsumo(registro: any): string {
    if (!registro.consumos || registro.consumos.length === 0) return '—';
    return registro.consumos
      .map((c: any) => `${c.producto}: ${c.cantidad} ${c.abreviatura || ''}`.trim())
      .join('; ');
  }

  /** Aplana los registros seleccionados a filas, en el orden de la agrupación activa */
  private construirFilas(): any[] {
    const filas: any[] = [];
    this.grupos.forEach(g => {
      g.registros
        .filter((r: any) => r.seleccionado)
        .forEach((r: any) => {
          filas.push({
            fecha: r.fecha,
            area: r.area,
            horario: `${this.hm(r.hora_inicio)} - ${this.hm(r.hora_fin)}`,
            mobiliario: this.resumenMobiliario(r),
            ejecutor: r.ejecutor,
            supervisor: r.supervisor,
            estado: r.estado
          });
        });
    });
    return filas;
  }

  async exportarPDF() {
    const filas = this.construirFilas();
    if (filas.length === 0) {
      Swal.fire('Atención', 'Seleccione al menos un registro para el reporte', 'warning');
      return;
    }

    let logoBase64: string | null = null;
    try {
      logoBase64 = await this.urlAImagenBase64(this.institucionConfig.getLogoUrl());
    } catch {
      logoBase64 = null; // El PDF se genera igual sin logo
    }

    this.pdfService.generarPDF({
      proceso: this.nombreProceso,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      agruparPor: this.agruparPor,
      logoBase64: logoBase64,
      productosUsados: this.productosUsados,
      filas: filas
    });
  }

  exportarExcel() {
    const filas = this.construirFilas();
    if (filas.length === 0) {
      Swal.fire('Atención', 'Seleccione al menos un registro para el reporte', 'warning');
      return;
    }

    this.excelService.generarExcel({
      proceso: this.nombreProceso,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      agruparPor: this.agruparPor,
      productosUsados: this.productosUsados,
      filas: filas
    });
  }

  /** Descarga el logo desde su URL y lo convierte a base64 para incrustarlo en el PDF */
  private urlAImagenBase64(url: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!url) { resolve(null); return; }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar el logo'));
      img.src = url;
    });
  }

  regresar() {
    this.router.navigate(['/operaciones']);
  }

  private hoy(): string {
    return this.formatoLocal(new Date());
  }

  private primerDiaMes(): string {
    const f = new Date();
    return this.formatoLocal(new Date(f.getFullYear(), f.getMonth(), 1));
  }

  private formatoLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}