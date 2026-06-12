import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { HorariosAlimentacionService } from '../../../services/horarios-alimentacion.service';
import { GruposService } from '../../../services/grupos.service';
import { AlimentacionService } from '../../../services/alimentacion.service';
import { MenuMinutasService } from '../../../services/menu-minutas.service';

interface ResumenProducto {
  id_producto: number;
  nombre_producto: string;
  detalle_producto: string;
  cantidad_presentes: number;
  cantidad_ausentes: number;
  porcentaje_asistencia: number;
  expandido: boolean;
  registros_detalle: any[];
}

// === Interfaces para la minuta ===
interface MinutaCelda {
  semana: number;
  dia: number;
  id_menu: number | null;
  nombre_menu: string;
  descripcion_menu: string;
}

interface SemanaMinuta {
  numero: number;
  celdas: MinutaCelda[];
}

@Component({
  selector: 'app-reporte-alimentacion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-alimentacion.component.html',
  styleUrl: './reporte-alimentacion.component.scss'
})
export class ReporteAlimentacionComponent implements OnInit {
  titulo = "Módulo de Reporte de Alimentación";

  // Variables para los filtros
  public grupos: any[] = [];
  public horarios: any[] = [];
  public productos: any[] = [];
  public fechaSeleccionada: string = this.obtenerFechaHoy();
  public grupoSeleccionado: string = "";
  public horarioSeleccionado: string = "";
  public productoSeleccionado: Set<string> = new Set();
  public estadoSeleccionado: string = "";

  // Variables para el dropdown personalizado
  public dropdownOpen: boolean = false;
  public searchTerm: string = '';
  public productosFiltradosBusqueda: any[] = [];

  // Variables para controlar la vista
  public vistaActual: 'resumen' | 'detalle' | 'minuta' = 'resumen';
  public datosResumen: ResumenProducto[] = [];

  // Variables para los datos y tabla
  public titulos = [] as any[];
  public datos = [] as any[];
  public datosFiltrados: any[] = [];
  public totalPresentes: number = 0;
  public totalAusentes: number = 0;

  // Columnas para usar con los filtros del componente tablas
  public columnasFiltro: string[] = [];

  // === Variables para la minuta ===
  public minutaSemanas: SemanaMinuta[] = [];
  public minutaCeldaSeleccionada: MinutaCelda | null = null;
  public minutaSemanaHoy: number = 0;
  public minutaDiaHoy: number = 0;
  public minutaMenuHoy: MinutaCelda | null = null;
  public minutaIsLoading: boolean = false;
  public minutaErrorMessage: string | null = null;
  public minutaEsMobile: boolean = false;
  private minutaCargada: boolean = false;
  public minutaGrillaExpandida: boolean = false;

  public get hayAusentes(): boolean {
    return this.totalAusentes > 0;
  }

  public diasSemana = [
    { valor: 1, nombre: 'Lunes', corto: 'Lun' },
    { valor: 2, nombre: 'Martes', corto: 'Mar' },
    { valor: 3, nombre: 'Miércoles', corto: 'Mié' },
    { valor: 4, nombre: 'Jueves', corto: 'Jue' },
    { valor: 5, nombre: 'Viernes', corto: 'Vie' },
    { valor: 6, nombre: 'Sábado', corto: 'Sáb' }
  ];

  private numSemanas = [1, 2, 3, 4, 5];

  constructor(
    private alimentacionService: AlimentacionService,
    private horariosService: HorariosAlimentacionService,
    private gruposService: GruposService,
    private menuMinutasService: MenuMinutasService
  ) {
    this.checkMinutaMobile();
  }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerGrupos();
    this.obtenerHorarios();
    this.obtenerDatosAlimentacion();
    this.calcularMinutaHoy();
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: any) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown') && this.dropdownOpen) {
      this.dropdownOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMinutaMobile();
  }

  // =============================================
  // Métodos del reporte
  // =============================================

  obtenerFechaHoy(): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'hora_ingreso', alias: 'Hora Ingreso', alinear: 'centro' },
      { clave: 'nombre_horario', alias: 'Horario', alinear: 'izquierda' },
      { clave: 'nombre_producto', alias: 'Producto', alinear: 'izquierda' },
      { clave: 'detalle_producto', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centro' },
      { clave: 'nombre_registro', alias: 'Registrado por', alinear: 'izquierda' }
    ];
  }

  obtenerGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.grupos = body;
    });
  }

  obtenerHorarios() {
    this.horariosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.horarios = body;
    });
  }

  obtenerDatosAlimentacion() {
    this.alimentacionService.obtenerAlimentacionPorFecha(this.fechaSeleccionada).subscribe(
      (response: any) => {
        this.datos = (response || []).map((item: any) => ({
          ...item,
          estado_texto: item.presente === 1 ? 'Presente' : 'Ausente',
          color: item.presente === 0 ? '#EEEEEE' : null,
          _estiloFila: item.presente === 0 ? 'font-style: italic; opacity: 0.75;' : null
        }));
        this.extraerProductos();
        this.filtrarDatos();
        this.generarResumenProductos();
      },
      (error) => {
        console.error('Error al obtener datos de alimentación:', error);
        this.datos = [];
        this.productos = [];
        this.productosFiltradosBusqueda = [];
        this.datosResumen = [];
        this.filtrarDatos();
      }
    );
  }

  extraerProductos() {
    const productosMap = new Map();

    this.datos.forEach(item => {
      if (item.id_producto && item.nombre_producto) {
        productosMap.set(item.id_producto, {
          id: item.id_producto,
          nombre: item.nombre_producto,
          detalles: item.detalle_producto || ''
        });
      }
    });

    this.productos = Array.from(productosMap.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );

    this.productosFiltradosBusqueda = [...this.productos];
  }

  filtrarDatos() {
    const grupoId = this.grupoSeleccionado ? this.grupoSeleccionado.toString() : "";
    const horarioId = this.horarioSeleccionado ? this.horarioSeleccionado.toString() : "";
    const tieneProductos = this.productoSeleccionado.size > 0;
    const estado = this.estadoSeleccionado;

    if (grupoId === "" && horarioId === "" && !tieneProductos && estado === "") {
      this.datosFiltrados = [...this.datos];
    } else {
      this.datosFiltrados = this.datos.filter(item => {
        const pasaGrupo = grupoId === "" || (item.id_grupo?.toString() ?? "") === grupoId;
        const pasaHorario = horarioId === "" || (item.id_horario?.toString() ?? "") === horarioId;
        const pasaProducto = !tieneProductos || this.productoSeleccionado.has(item.id_producto?.toString() ?? "");
        const pasaEstado = estado === "" ||
          (estado === "presente" && item.presente === 1) ||
          (estado === "ausente" && item.presente === 0);
        return pasaGrupo && pasaHorario && pasaProducto && pasaEstado;
      });
    }

    this.calcularTotales();
  }

  generarResumenProductos() {
    const resumenMap = new Map<string, ResumenProducto>();

    this.datosFiltrados.forEach(item => {
      const claveProducto = item.nombre_producto;

      if (resumenMap.has(claveProducto)) {
        const resumen = resumenMap.get(claveProducto)!;
        if (item.presente === 1) {
          resumen.cantidad_presentes += 1;
        } else {
          resumen.cantidad_ausentes += 1;
        }
        resumen.registros_detalle.push(item);
      } else {
        resumenMap.set(claveProducto, {
          id_producto: item.id_producto,
          nombre_producto: item.nombre_producto,
          detalle_producto: item.detalle_producto || '',
          cantidad_presentes: item.presente === 1 ? 1 : 0,
          cantidad_ausentes: item.presente === 1 ? 0 : 1,
          porcentaje_asistencia: 0,
          expandido: false,
          registros_detalle: [item]
        });
      }
    });

    this.datosResumen = Array.from(resumenMap.values());

    this.datosResumen.forEach(resumen => {
      const total = resumen.cantidad_presentes + resumen.cantidad_ausentes;
      resumen.porcentaje_asistencia = total > 0
        ? (resumen.cantidad_presentes / total) * 100
        : 0;
    });

    this.datosResumen.sort((a, b) => b.cantidad_presentes - a.cantidad_presentes);
  }

  calcularTotales() {
    this.totalPresentes = 0;
    this.totalAusentes = 0;

    this.datosFiltrados.forEach(item => {
      if (item.presente === 1) {
        this.totalPresentes++;
      } else {
        this.totalAusentes++;
      }
    });
  }

  cambioFecha() {
    this.grupoSeleccionado = "";
    this.horarioSeleccionado = "";
    this.productoSeleccionado.clear();
    this.estadoSeleccionado = "";
    this.obtenerDatosAlimentacion();
  }

  filtrarPorGrupo() {
    this.filtrarDatos();
    this.generarResumenProductos();
  }

  filtrarPorHorario() {
    this.filtrarDatos();
    this.generarResumenProductos();
  }

  filtrarPorProducto() {
    this.filtrarDatos();
    this.generarResumenProductos();
  }

  filtrarPorEstado() {
    this.filtrarDatos();
    this.generarResumenProductos();
  }

  resetearFiltros() {
    this.grupoSeleccionado = "";
    this.horarioSeleccionado = "";
    this.productoSeleccionado.clear();
    this.estadoSeleccionado = "";
    this.filtrarDatos();
    this.generarResumenProductos();
  }

  cambiarVista(vista: 'resumen' | 'detalle' | 'minuta') {
    this.vistaActual = vista;

    if (vista === 'resumen') {
      this.generarResumenProductos();
    }

    if (vista === 'minuta' && !this.minutaCargada) {
      this.cargarMinuta();
    }
  }

  toggleExpandirProducto(nombreProducto: string) {
    const resumen = this.datosResumen.find(r => r.nombre_producto === nombreProducto);
    if (resumen) {
      resumen.expandido = !resumen.expandido;
    }
  }

  obtenerDetalleExpandido(nombreProducto: string): any[] {
    const resumen = this.datosResumen.find(r => r.nombre_producto === nombreProducto);
    return resumen?.expandido ? resumen.registros_detalle : [];
  }

  // Métodos del dropdown personalizado (multi-select)
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.searchTerm = '';
      this.productosFiltradosBusqueda = [...this.productos];
    }
  }

  toggleProduct(productId: string): void {
    if (this.productoSeleccionado.has(productId)) {
      this.productoSeleccionado.delete(productId);
    } else {
      this.productoSeleccionado.add(productId);
    }
    this.filtrarPorProducto();
  }

  removeProduct(productId: string): void {
    this.productoSeleccionado.delete(productId);
    this.filtrarPorProducto();
  }

  clearProducts(): void {
    this.productoSeleccionado.clear();
    this.filtrarPorProducto();
  }

  isProductSelected(productId: string): boolean {
    return this.productoSeleccionado.has(productId);
  }

  getSelectedProducts(): any[] {
    return this.productos.filter(p => this.productoSeleccionado.has(p.id.toString()));
  }

  buscarProductos(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.productosFiltradosBusqueda = [...this.productos];
      return;
    }

    const searchTermNormalized = this.normalizarTexto(this.searchTerm);

    this.productosFiltradosBusqueda = this.productos.filter(producto => {
      const nombreNormalizado = this.normalizarTexto(producto.nombre);
      const detallesNormalizados = this.normalizarTexto(producto.detalles || '');
      return nombreNormalizado.includes(searchTermNormalized) || detallesNormalizados.includes(searchTermNormalized);
    });
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  // =============================================
  // Métodos del tab Minuta
  // =============================================

  toggleMinutaGrilla(): void {
    this.minutaGrillaExpandida = !this.minutaGrillaExpandida;
  }

  private checkMinutaMobile(): void {
    this.minutaEsMobile = window.innerWidth <= 768;
  }

  private cargarMinuta(): void {
    this.minutaIsLoading = true;
    this.minutaErrorMessage = null;

    this.menuMinutasService.obtenerMinutaCompleta().subscribe({
      next: (response: any) => {
        const data = response.body || [];
        this.construirGrillaMinuta(data);
        this.minutaIsLoading = false;
        this.minutaCargada = true;
      },
      error: (error) => {
        console.error('Error cargando minuta:', error);
        this.minutaErrorMessage = 'No pudimos cargar la minuta. Intenta de nuevo.';
        this.minutaIsLoading = false;
      }
    });
  }

  private construirGrillaMinuta(data: any[]): void {
    this.minutaSemanas = [];

    for (const numSemana of this.numSemanas) {
      const celdas: MinutaCelda[] = [];

      for (const dia of this.diasSemana) {
        const registro = data.find(
          (d: any) => Number(d.semana) === numSemana && Number(d.dia) === dia.valor
        );

        celdas.push({
          semana: numSemana,
          dia: dia.valor,
          id_menu: registro ? Number(registro.id_menu) : null,
          nombre_menu: registro ? registro.nombre_menu : '',
          descripcion_menu: registro ? (registro.descripcion_menu || '') : ''
        });
      }

      this.minutaSemanas.push({ numero: numSemana, celdas });
    }

    this.minutaMenuHoy = null;
    if (this.minutaDiaHoy > 0) {
      for (const semana of this.minutaSemanas) {
        for (const celda of semana.celdas) {
          if (this.esMinutaHoy(celda) && this.minutaTieneMenu(celda)) {
            this.minutaMenuHoy = celda;
            break;
          }
        }
        if (this.minutaMenuHoy) break;
      }
    }
  }

  private calcularMinutaHoy(): void {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();

    const jsDay = hoy.getDay();
    this.minutaDiaHoy = jsDay === 0 ? 0 : jsDay;

    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const jsDayPrimero = primerDiaMes.getDay();
    const diaSemPrimero = jsDayPrimero === 0 ? 7 : jsDayPrimero;

    const offset = diaSemPrimero - 1;
    const semanaCalculada = Math.ceil((diaDelMes + offset) / 7);
    this.minutaSemanaHoy = semanaCalculada > 5 ? 5 : semanaCalculada;
  }

  esMinutaHoy(celda: MinutaCelda): boolean {
    if (this.minutaDiaHoy === 0) return false;
    return celda.semana === this.minutaSemanaHoy && celda.dia === this.minutaDiaHoy;
  }

  minutaSeleccionarCelda(celda: MinutaCelda): void {
    if (!celda.id_menu) return;
    this.minutaCeldaSeleccionada = this.minutaCeldaSeleccionada === celda ? null : celda;
  }

  minutaCerrarDetalle(): void {
    this.minutaCeldaSeleccionada = null;
  }

  minutaScrollAHoy(): void {
    const el = document.getElementById('minuta-celda-hoy');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('pulso');
      setTimeout(() => el.classList.remove('pulso'), 1500);
    }
  }

  minutaGetNombreDia(valor: number): string {
    return this.diasSemana.find(d => d.valor === valor)?.nombre || '';
  }

  minutaGetNombreDiaCorto(valor: number): string {
    return this.diasSemana.find(d => d.valor === valor)?.corto || '';
  }

  minutaTieneMenu(celda: MinutaCelda): boolean {
    return celda.id_menu !== null && celda.nombre_menu !== '';
  }

  trackBySemana(index: number): number {
    return index;
  }

  trackByCelda(index: number, celda: MinutaCelda): string {
    return celda.semana + '-' + celda.dia;
  }
}