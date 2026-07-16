import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-registro-rapido-limpieza',
  templateUrl: './registro-rapido-limpieza.component.html',
  styleUrls: ['./registro-rapido-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class RegistroRapidoLimpiezaComponent implements OnInit {

  titulo = 'Registro Rápido de Aseo';

  // Atajos de duración disponibles como override manual de la hora fin
  readonly chipsDuracion = [15, 30, 45, 60, 90];

  procesos: any[] = [];
  idProceso: string = '';

  areas: any[] = [];
  ultimaFecha: string | null = null;
  cargandoAreas = false;
  guardando = false;

  fecha = this.obtenerFechaLocal();
  fechaMaxima = this.obtenerFechaLocal();
  horaInicio = this.obtenerHoraLocal();
  horaFin = this.obtenerHoraLocal();
  observaciones = '';

  // Mientras sea false la hora fin se recalcula sola con los tiempos estimados
  duracionManual = false;
  chipActivo: number | null = null;

  constructor(
    private router: Router,
    private registrosService: RegistrosLimpiezaService,
    private procesosService: TiposProcesosLimpiezaService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los tipos de proceso', 'error');
      }
    });
  }

  onProcesoChange() {
    this.areas = [];
    this.ultimaFecha = null;
    this.duracionManual = false;
    this.chipActivo = null;

    if (!this.idProceso) {
      this.recalcularHoraFin();
      return;
    }

    this.cargarAreas();
  }

  cargarAreas() {
    this.cargandoAreas = true;

    this.registrosService.obtenerPreviewRapido(this.idProceso).subscribe({
      next: (response: any) => {
        const data = response.body;

        this.ultimaFecha = data.ultima_fecha;
        this.areas = (data.areas || []).map((area: any) => ({
          ...area,
          seleccionada: area.preseleccionada === true
        }));

        this.recalcularHoraFin();
        this.cargandoAreas = false;
      },
      error: (error: any) => {
        this.cargandoAreas = false;
        Swal.fire('Error', error.error?.error || 'No se pudieron cargar las áreas', 'error');
      }
    });
  }

  toggleArea(area: any) {
    if (this.guardando) return;

    area.seleccionada = !area.seleccionada;
    this.recalcularHoraFin();
  }

  marcarTodas() {
    this.areas.forEach(a => a.seleccionada = true);
    this.recalcularHoraFin();
  }

  marcarNinguna() {
    this.areas.forEach(a => a.seleccionada = false);
    this.recalcularHoraFin();
  }

  marcarSoloHoy() {
    this.areas.forEach(a => a.seleccionada = a.aplica_hoy === true);
    this.recalcularHoraFin();
  }

  get areasSeleccionadas(): any[] {
    return this.areas.filter(a => a.seleccionada);
  }

  get hayAreasDeHoy(): boolean {
    return this.areas.some(a => a.aplica_hoy === true);
  }

  /** Suma de los tiempos estimados configurados para las áreas marcadas */
  get minutosEstimados(): number {
    return this.areasSeleccionadas
      .reduce((total, a) => total + (a.tiempo_estimado_minutos || 0), 0);
  }

  /** Minutos reales entre la hora de inicio y la hora fin digitadas */
  get duracionMinutos(): number {
    const inicio = this.horaAMinutos(this.horaInicio);
    const fin = this.horaAMinutos(this.horaFin);

    if (inicio === null || fin === null) return 0;

    let minutos = fin - inicio;
    if (minutos < 0) minutos += 24 * 60; // Si cruza medianoche

    return minutos;
  }

  get duracionTexto(): string {
    const minutos = this.duracionMinutos;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    return horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
  }

  /**
   * Consumo total de las áreas marcadas, agrupado por producto.
   * Es el mismo cálculo que hace el servidor al guardar; aquí solo se muestra.
   */
  get consumoConsolidado(): any[] {
    const mapa = new Map<string, any>();

    this.areasSeleccionadas.forEach(area => {
      (area.productos || []).forEach((producto: any) => {
        const acumulado = mapa.get(producto.id_producto_limpieza);

        if (acumulado) {
          acumulado.cantidad += Number(producto.cantidad);
        } else {
          mapa.set(producto.id_producto_limpieza, {
            id_producto_limpieza: producto.id_producto_limpieza,
            nombre: producto.nombre,
            abreviatura: producto.abreviatura,
            stock_actual: Number(producto.stock_actual),
            cantidad: Number(producto.cantidad)
          });
        }
      });
    });

    return Array.from(mapa.values())
      .map(p => ({
        ...p,
        cantidad: Math.round(p.cantidad * 10) / 10,
        tiene_stock: p.stock_actual >= p.cantidad
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get productosSinStock(): any[] {
    return this.consumoConsolidado.filter(p => !p.tiene_stock);
  }

  get areasSinConsumo(): number {
    return this.areasSeleccionadas.filter(a => !a.productos || a.productos.length === 0).length;
  }

  get puedeRegistrar(): boolean {
    return !!this.idProceso
      && this.areasSeleccionadas.length > 0
      && !!this.horaInicio
      && !!this.horaFin
      && !this.guardando;
  }

  aplicarChip(minutos: number) {
    this.duracionManual = true;
    this.chipActivo = minutos;
    this.horaFin = this.sumarMinutos(this.horaInicio, minutos);
  }

  onHoraInicioChange() {
    if (this.duracionManual && this.chipActivo !== null) {
      this.horaFin = this.sumarMinutos(this.horaInicio, this.chipActivo);
      return;
    }

    this.recalcularHoraFin();
  }

  onHoraFinChange() {
    this.duracionManual = true;
    this.chipActivo = null;
  }

  reactivarCalculoAutomatico() {
    this.duracionManual = false;
    this.chipActivo = null;
    this.recalcularHoraFin();
  }

  /** Hora fin = hora inicio + suma de los tiempos estimados de las áreas marcadas */
  recalcularHoraFin() {
    if (this.duracionManual) return;

    this.horaFin = this.sumarMinutos(this.horaInicio, this.minutosEstimados);
  }

  async registrar() {
    if (!this.puedeRegistrar) return;

    const avisoStock = this.productosSinStock.length > 0
      ? `<div class="text-start small text-warning-emphasis mt-2">
          <i class="fas fa-triangle-exclamation"></i>
          ${this.productosSinStock.length} producto(s) sin stock suficiente: se descontará solo lo disponible.
        </div>`
      : '';

    const listaConsumo = this.consumoConsolidado.length > 0
      ? this.consumoConsolidado
        .map(p => `<li>${p.nombre}: <strong>${p.cantidad}</strong> ${p.abreviatura}</li>`)
        .join('')
      : '<li class="text-muted">Sin consumo de productos</li>';

    const result = await Swal.fire({
      title: '¿Registrar el aseo?',
      html: `
        <div class="text-start">
          <p class="mb-2">
            <strong>${this.areasSeleccionadas.length}</strong> área(s) ·
            ${this.horaInicio} a ${this.horaFin} (${this.duracionTexto})
          </p>
          <p class="mb-1">Se descontará del inventario:</p>
          <ul class="mb-0 ps-3">${listaConsumo}</ul>
          ${avisoStock}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.guardando = true;

    const datos = {
      id_tipo_proceso_limpieza: this.idProceso,
      fecha: this.fecha,
      hora_inicio: this.normalizarHora(this.horaInicio),
      hora_fin: this.normalizarHora(this.horaFin),
      observaciones: this.observaciones || null,
      id_usuario_ejecutor: this.utilService.obtenerIdUsuarioActual(),
      areas: this.areasSeleccionadas.map(a => a.id)
    };

    this.registrosService.crearRapido(datos).subscribe({
      next: (response: any) => {
        const body = response.body;
        const ajustados = body.productos_ajustados || [];

        const detalleAjustes = ajustados.length > 0
          ? `<div class="text-start small text-muted mt-2">
              ${ajustados.map((a: any) => `${a.producto}: se descontó ${a.descontado} de ${a.solicitado} ${a.abreviatura}`).join('<br>')}
            </div>`
          : '';

        this.guardando = false;

        Swal.fire({
          title: 'Aseo registrado',
          html: `
            ${body.total_registros} registro(s) creado(s)
            ${body.id_movimiento ? '<br>Inventario descontado' : ''}
            ${detalleAjustes}
          `,
          icon: 'success'
        }).then(() => {
          this.router.navigate(['/operaciones/registros-limpieza']);
        });
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudo registrar el aseo', 'error');
      }
    });
  }

  cancelar() {
    this.router.navigate(['/operaciones/registros-limpieza']);
  }

  obtenerFechaLocal(): string {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  obtenerHoraLocal(): string {
    const fecha = new Date();
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Convierte "HH:mm" o "HH:mm:ss" a minutos desde medianoche */
  private horaAMinutos(hora: string): number | null {
    if (!hora) return null;

    const partes = hora.split(':');
    if (partes.length < 2) return null;

    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);

    if (isNaN(horas) || isNaN(minutos)) return null;

    return horas * 60 + minutos;
  }

  private sumarMinutos(hora: string, minutos: number): string {
    const base = this.horaAMinutos(hora);
    if (base === null) return hora;

    const total = (base + minutos) % (24 * 60);
    const h = String(Math.floor(total / 60)).padStart(2, '0');
    const m = String(total % 60).padStart(2, '0');

    return `${h}:${m}`;
  }

  /** La columna es de tipo time; se envía siempre con segundos */
  private normalizarHora(hora: string): string {
    return hora.split(':').length === 2 ? `${hora}:00` : hora;
  }
}