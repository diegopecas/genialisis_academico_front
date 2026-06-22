import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { ActividadesColaboradoresService } from '../../../services/actividades-colaboradores.service';

interface Actividad {
  id_actividad: number;
  id_tipo_actividad: string;
  tipo_actividad: string;
  categoria: string;
  registro_x_horas: number;
  es_cruzable: number;
  valor_hora: number;
  fecha: string;
  fecha_fin: string;
  observacion: string;
  minutos_totales: number;
  minutos_aplicados: number;
  minutos_restantes: number;
  estado: string;
  color_estado: string;
  id_contabilizacion?: string;
  fecha_contabilizacion?: string;
  tipo_contabilizacion?: string;
  id_colaborador: string;
  colaborador: string;
  seleccionado: boolean;
}

interface ColaboradorAgrupado {
  nombre: string;
  id_colaborador: string;
  total_actividades: number;
  actividades: Actividad[];
  expandido: boolean;
}

interface CategoriaResumen {
  nombre: string;
  total_minutos: number;
  total_dias: number;
  total_valor: number;
  es_registro_x_horas: boolean;
  actividades: Actividad[];
}

interface OpcionFiltro {
  valor: any;
  label: string;
  seleccionado: boolean;
}

@Component({
  selector: 'app-historial-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './historial-actividades.component.html',
  styleUrls: ['./historial-actividades.component.scss']
})
export class HistorialActividadesComponent implements OnInit {
  titulo = 'Historial de Actividades por Colaborador';

  cargando = false;
  actividades: Actividad[] = [];
  colaboradoresAgrupados: ColaboradorAgrupado[] = [];
  categoriasResumen: CategoriaResumen[] = [];

  // Filtros fecha
  filtroFechaInicio: string = '';
  filtroFechaFin: string = '';

  // Multi-select filters
  filtrosConfig: { clave: string, label: string }[] = [
    { clave: 'colaborador', label: 'Colaborador' },
    { clave: 'estado', label: 'Estado' },
    { clave: 'categoria', label: 'Categoría' },
    { clave: 'tipo_actividad', label: 'Tipo Actividad' }
  ];

  opcionesFiltro: { [key: string]: OpcionFiltro[] } = {};
  opcionesFiltroFiltradas: { [key: string]: OpcionFiltro[] } = {};
  filtroAbierto: { [key: string]: boolean } = {};
  busquedaFiltro: { [key: string]: string } = {};
  todosSeleccionados: { [key: string]: boolean } = {};

  // Selección de registros
  todosLosRegistrosSeleccionados = true;

  constructor(
    private actividadesColaboradoresService: ActividadesColaboradoresService
  ) {}

  ngOnInit(): void {
    this.inicializarFiltros();
    this.cargarHistorial();
  }

  inicializarFiltros() {
    this.filtrosConfig.forEach(f => {
      this.opcionesFiltro[f.clave] = [];
      this.opcionesFiltroFiltradas[f.clave] = [];
      this.filtroAbierto[f.clave] = false;
      this.busquedaFiltro[f.clave] = '';
      this.todosSeleccionados[f.clave] = true;
    });
  }

  cargarHistorial() {
    this.cargando = true;

    const params = [];
    if (this.filtroFechaInicio) {
      params.push(`fecha_inicio=${this.filtroFechaInicio}`);
    }
    if (this.filtroFechaFin) {
      params.push(`fecha_fin=${this.filtroFechaFin}`);
    }

    const queryString = params.length > 0 ? `?${params.join('&')}` : '';

    this.actividadesColaboradoresService.obtenerHistorial(queryString).subscribe({
      next: (response: any) => {
        const raw = response.body || [];
        this.actividades = this.procesarActividades(raw);
        this.generarOpcionesFiltro();
        this.aplicarFiltrosLocales();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar historial:', error);
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el historial de actividades',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  procesarActividades(raw: any[]): Actividad[] {
    const unicas = new Map<number, Actividad>();
    raw.forEach(item => {
      if (!unicas.has(item.id_actividad)) {
        unicas.set(item.id_actividad, {
          ...item,
          valor_hora: parseFloat(item.valor_hora) || 0,
          minutos_totales: parseInt(item.minutos_totales) || 0,
          minutos_aplicados: parseInt(item.minutos_aplicados) || 0,
          minutos_restantes: parseInt(item.minutos_restantes) || 0,
          registro_x_horas: parseInt(item.registro_x_horas) || 0,
          es_cruzable: parseInt(item.es_cruzable) || 0,
          seleccionado: true
        });
      }
    });
    return Array.from(unicas.values());
  }

  generarOpcionesFiltro() {
    // Colaborador
    const colabMap = new Map<string, string>();
    this.actividades.forEach(a => {
      if (!colabMap.has(a.colaborador)) {
        colabMap.set(a.colaborador, a.colaborador);
      }
    });
    this.opcionesFiltro['colaborador'] = Array.from(colabMap.keys())
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ valor: v, label: v, seleccionado: true }));

    // Estado
    const estadoSet = new Set<string>();
    this.actividades.forEach(a => estadoSet.add(a.estado));
    this.opcionesFiltro['estado'] = Array.from(estadoSet)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ valor: v, label: v, seleccionado: true }));

    // Categoría
    const catSet = new Set<string>();
    this.actividades.forEach(a => catSet.add(a.categoria));
    this.opcionesFiltro['categoria'] = Array.from(catSet)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ valor: v, label: v, seleccionado: true }));

    // Tipo Actividad
    const tipoSet = new Set<string>();
    this.actividades.forEach(a => tipoSet.add(a.tipo_actividad));
    this.opcionesFiltro['tipo_actividad'] = Array.from(tipoSet)
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ valor: v, label: v, seleccionado: true }));

    // Sincronizar filtradas
    this.filtrosConfig.forEach(f => {
      this.opcionesFiltroFiltradas[f.clave] = [...this.opcionesFiltro[f.clave]];
      this.todosSeleccionados[f.clave] = true;
    });
  }

  // ── Multi-select logic ──

  toggleFiltro(clave: string) {
    this.filtroAbierto[clave] = !this.filtroAbierto[clave];
    if (this.filtroAbierto[clave]) {
      this.busquedaFiltro[clave] = '';
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
    }
  }

  cerrarOtrosDropdowns(claveActual: string) {
    Object.keys(this.filtroAbierto).forEach(k => {
      if (k !== claveActual) this.filtroAbierto[k] = false;
    });
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: any) {
    if (!event.target.closest('.dropdown-menu') && !event.target.closest('.dropdown-toggle')) {
      Object.keys(this.filtroAbierto).forEach(k => this.filtroAbierto[k] = false);
    }
  }

  filtrarOpcionesBusqueda(clave: string) {
    const busqueda = (this.busquedaFiltro[clave] || '').toLowerCase();
    if (!busqueda) {
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
      return;
    }
    this.opcionesFiltroFiltradas[clave] = this.opcionesFiltro[clave]
      .filter(o => o.label.toLowerCase().includes(busqueda));
  }

  toggleTodos(clave: string) {
    this.todosSeleccionados[clave] = !this.todosSeleccionados[clave];
    this.opcionesFiltro[clave].forEach(o => o.seleccionado = this.todosSeleccionados[clave]);
    this.aplicarFiltrosLocales();
  }

  toggleOpcion(clave: string, opcion: OpcionFiltro) {
    const original = this.opcionesFiltro[clave].find(o => o.valor === opcion.valor);
    if (original) {
      original.seleccionado = !original.seleccionado;
    }
    this.todosSeleccionados[clave] = this.opcionesFiltro[clave].every(o => o.seleccionado);
    this.aplicarFiltrosLocales();
  }

  contarSeleccionados(clave: string): number {
    return this.opcionesFiltro[clave].filter(o => o.seleccionado).length;
  }

  tieneFiltroParcial(clave: string): boolean {
    const seleccionados = this.contarSeleccionados(clave);
    return seleccionados > 0 && seleccionados < this.opcionesFiltro[clave].length;
  }

  get cantidadFiltrosActivos(): number {
    return this.filtrosConfig.filter(f => this.tieneFiltroParcial(f.clave)).length;
  }

  limpiarTodosLosFiltros() {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.filtrosConfig.forEach(f => {
      this.opcionesFiltro[f.clave].forEach(o => o.seleccionado = true);
      this.todosSeleccionados[f.clave] = true;
    });
    this.cargarHistorial();
  }

  // ── Filtrado local ──

  get actividadesFiltradas(): Actividad[] {
    const colabSeleccionados = new Set(this.opcionesFiltro['colaborador']?.filter(o => o.seleccionado).map(o => o.valor));
    const estadoSeleccionados = new Set(this.opcionesFiltro['estado']?.filter(o => o.seleccionado).map(o => o.valor));
    const catSeleccionados = new Set(this.opcionesFiltro['categoria']?.filter(o => o.seleccionado).map(o => o.valor));
    const tipoSeleccionados = new Set(this.opcionesFiltro['tipo_actividad']?.filter(o => o.seleccionado).map(o => o.valor));

    return this.actividades.filter(a =>
      colabSeleccionados.has(a.colaborador) &&
      estadoSeleccionados.has(a.estado) &&
      catSeleccionados.has(a.categoria) &&
      tipoSeleccionados.has(a.tipo_actividad)
    );
  }

  get actividadesSeleccionadas(): Actividad[] {
    return this.actividadesFiltradas.filter(a => a.seleccionado);
  }

  aplicarFiltrosLocales() {
    this.agruparPorCategoria();
    this.agruparPorColaborador();
  }

  aplicarFiltros() {
    this.cargarHistorial();
  }

  // ── Agrupaciones ──

  agruparPorCategoria() {
    const categorias = new Map<string, CategoriaResumen>();
    const filtradas = this.actividadesFiltradas;

    filtradas.forEach(actividad => {
      const cat = actividad.categoria;
      if (!categorias.has(cat)) {
        categorias.set(cat, {
          nombre: cat,
          total_minutos: 0,
          total_dias: 0,
          total_valor: 0,
          es_registro_x_horas: actividad.registro_x_horas === 1,
          actividades: []
        });
      }
      const c = categorias.get(cat)!;
      c.actividades.push(actividad);
      c.total_minutos += actividad.minutos_totales;
      c.total_dias += actividad.minutos_totales / (8 * 60);
      c.total_valor += (actividad.minutos_totales / 60) * actividad.valor_hora;
    });

    this.categoriasResumen = Array.from(categorias.values());
  }

  agruparPorColaborador() {
    const grupos: { [key: string]: ColaboradorAgrupado } = {};
    const filtradas = this.actividadesFiltradas;

    filtradas.forEach(actividad => {
      const id = actividad.id_colaborador;
      if (!grupos[id]) {
        grupos[id] = {
          nombre: actividad.colaborador,
          id_colaborador: id,
          total_actividades: 0,
          actividades: [],
          expandido: false
        };
      }
      // Mantener estado expandido si ya existía
      const existing = this.colaboradoresAgrupados.find(c => c.id_colaborador === id);
      if (existing) {
        grupos[id].expandido = existing.expandido;
      }
      grupos[id].actividades.push(actividad);
      grupos[id].total_actividades++;
    });

    this.colaboradoresAgrupados = Object.values(grupos)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  // ── Selección de registros ──

  toggleSeleccionActividad(actividad: Actividad) {
    actividad.seleccionado = !actividad.seleccionado;
    this.verificarTodosSeleccionados();
  }

  toggleTodosRegistros() {
    this.todosLosRegistrosSeleccionados = !this.todosLosRegistrosSeleccionados;
    this.actividadesFiltradas.forEach(a => a.seleccionado = this.todosLosRegistrosSeleccionados);
  }

  toggleTodosColaborador(colaborador: ColaboradorAgrupado) {
    const todosSeleccionados = colaborador.actividades.every(a => a.seleccionado);
    colaborador.actividades.forEach(a => a.seleccionado = !todosSeleccionados);
    this.verificarTodosSeleccionados();
  }

  verificarTodosSeleccionados() {
    this.todosLosRegistrosSeleccionados = this.actividadesFiltradas.every(a => a.seleccionado);
  }

  estanTodosSeleccionadosColaborador(colaborador: ColaboradorAgrupado): boolean {
    return colaborador.actividades.every(a => a.seleccionado);
  }

  // ── Totalizaciones ──

  // Por filtro (cards arriba)
  calcularTotalGeneralMinutosRestantes(): number {
    return this.actividadesFiltradas.reduce((sum, a) => sum + a.minutos_restantes, 0);
  }

  calcularTotalGeneralMinutosCruzados(): number {
    return this.actividadesFiltradas
      .filter(a => this.tieneCruce(a))
      .reduce((sum, a) => sum + a.minutos_aplicados, 0);
  }

  calcularTotalGeneralValor(): number {
    return this.actividadesFiltradas.reduce((sum, a) => sum + (a.minutos_totales / 60) * a.valor_hora, 0);
  }

  calcularTotalGeneralValorRestante(): number {
    return this.actividadesFiltradas.reduce((sum, a) => sum + (a.minutos_restantes / 60) * a.valor_hora, 0);
  }

  // Por selección (checkboxes)
  calcularSeleccionMinutosTotales(): number {
    return this.actividadesSeleccionadas.reduce((sum, a) => sum + a.minutos_totales, 0);
  }

  calcularSeleccionMinutosRestantes(): number {
    return this.actividadesSeleccionadas.reduce((sum, a) => sum + a.minutos_restantes, 0);
  }

  calcularSeleccionValorTotal(): number {
    return this.actividadesSeleccionadas.reduce((sum, a) => sum + (a.minutos_totales / 60) * a.valor_hora, 0);
  }

  calcularSeleccionValorRestante(): number {
    return this.actividadesSeleccionadas.reduce((sum, a) => sum + (a.minutos_restantes / 60) * a.valor_hora, 0);
  }

  calcularSeleccionMinutosCruzados(): number {
    return this.actividadesSeleccionadas
      .filter(a => this.tieneCruce(a))
      .reduce((sum, a) => sum + a.minutos_aplicados, 0);
  }

  // Por colaborador-categoría
  getActividadesPorCategoria(colaborador: ColaboradorAgrupado, categoria: string): Actividad[] {
    return colaborador.actividades.filter(a => a.categoria === categoria);
  }

  getCategoriasDeColaborador(colaborador: ColaboradorAgrupado): string[] {
    const cats = new Set<string>();
    colaborador.actividades.forEach(a => cats.add(a.categoria));
    return Array.from(cats);
  }

  calcularSubtotalMinutos(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .reduce((sum, a) => sum + a.minutos_totales, 0);
  }

  calcularSubtotalMinutosRestantes(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .reduce((sum, a) => sum + a.minutos_restantes, 0);
  }

  calcularSubtotalValor(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .reduce((sum, a) => sum + (a.minutos_totales / 60) * a.valor_hora, 0);
  }

  calcularSubtotalValorRestante(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .reduce((sum, a) => sum + (a.minutos_restantes / 60) * a.valor_hora, 0);
  }

  calcularSubtotalSeleccionMinutos(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .filter(a => a.seleccionado)
      .reduce((sum, a) => sum + a.minutos_totales, 0);
  }

  calcularSubtotalSeleccionValor(colaborador: ColaboradorAgrupado, categoria: string): number {
    return this.getActividadesPorCategoria(colaborador, categoria)
      .filter(a => a.seleccionado)
      .reduce((sum, a) => sum + (a.minutos_totales / 60) * a.valor_hora, 0);
  }

  // ── Helpers ──

  toggleColaborador(colaborador: ColaboradorAgrupado) {
    colaborador.expandido = !colaborador.expandido;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${mins}`;
  }

  formatearPeriodo(actividad: Actividad): string {
    return `${this.formatearFechaHora(actividad.fecha)} - ${this.formatearFechaHora(actividad.fecha_fin)}`;
  }

  formatearMinutos(minutos: number): string {
    if (!minutos && minutos !== 0) return '-';
    const horas = Math.floor(Math.abs(minutos) / 60);
    const mins = Math.abs(minutos) % 60;
    const signo = minutos < 0 ? '-' : '';
    return `${signo}${horas}h ${mins}m`;
  }

  formatearMoneda(valor: number): string {
    if (!valor && valor !== 0) return '-';
    return '$ ' + Math.round(valor).toLocaleString('es-CO');
  }

  calcularValorActividad(actividad: Actividad): number {
    return (actividad.minutos_totales / 60) * actividad.valor_hora;
  }

  calcularValorRestanteActividad(actividad: Actividad): number {
    return (actividad.minutos_restantes / 60) * actividad.valor_hora;
  }

  tieneCruce(actividad: Actividad): boolean {
    return actividad.minutos_aplicados > 0 && !!actividad.id_contabilizacion;
  }

  formatearValor(categoria: CategoriaResumen): string {
    if (categoria.es_registro_x_horas) {
      return this.formatearMinutos(categoria.total_minutos);
    } else {
      return `${categoria.total_dias.toFixed(1)} días`;
    }
  }

  getIconoCategoria(nombre: string): string {
    switch (nombre.toLowerCase()) {
      case 'permiso':
      case 'permisos': return 'fa-calendar-times';
      case 'hora adicional':
      case 'horas adicionales': return 'fa-clock';
      case 'vacaciones': return 'fa-umbrella-beach';
      case 'incapacidad': return 'fa-notes-medical';
      case 'permiso médico':
      case 'permiso medico': return 'fa-stethoscope';
      default: return 'fa-list';
    }
  }

  getColorCategoria(nombre: string): string {
    switch (nombre.toLowerCase()) {
      case 'permiso':
      case 'permisos': return 'bg-danger';
      case 'hora adicional':
      case 'horas adicionales': return 'bg-primary';
      case 'vacaciones': return 'bg-info';
      case 'incapacidad': return 'bg-warning';
      case 'permiso médico':
      case 'permiso medico': return 'bg-teal';
      default: return 'bg-secondary';
    }
  }
}