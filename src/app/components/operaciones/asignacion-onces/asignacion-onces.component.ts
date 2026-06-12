import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { AsignacionOncesService } from '../../../services/asignacion-onces.service';
import { HorariosAlimentacionService } from '../../../services/horarios-alimentacion.service';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';
import { CocinaDisponibilidadService } from '../../../services/cocina-disponibilidad.service';
import { UtilService } from '../../../common/constantes/util.service';

interface Estudiante {
  id_estudiante: string;
  id_persona: string;
  nombre_estudiante: string;
  id_grupo: string;
  nombre_grupo: string;
  hora_ingreso: string | null;
  presente: number;
  seleccionado: boolean;
  ya_asignado: boolean;
}

interface Asignacion {
  id_persona: string;
  id_producto_servicio: string;
  id_horario_alimentacion: string;
}

interface ProductoItem {
  id: string;
  nombre: string;
  detalles: string;
  valor_sugerido: number;
  id_horario_alimentacion_sugerido: string | null;
  disponible_hoy: number;
}

interface ResumenEstudiante {
  id_persona: string;
  nombre_estudiante: string;
  nombre_grupo: string;
  productos: string[];
}

@Component({
  selector: 'app-asignacion-onces',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './asignacion-onces.component.html',
  styleUrl: './asignacion-onces.component.scss'
})
export class AsignacionOncesComponent implements OnInit {

  titulo = 'Asignación de Onces';

  public fechaSeleccionada: string = this.obtenerFechaHoy();
  public horarioSeleccionado: string = '';
  public productoSeleccionado: string = '';
  public horarios: any[] = [];

  public todosPresentes: Estudiante[] = [];
  public todosAusentes: Estudiante[] = [];

  public asignaciones: Asignacion[] = [];
  public productosDisponibles: ProductoItem[] = [];
  public productosNoDisponibles: ProductoItem[] = [];
  public acordeonProductosAbierto: boolean = false;

  public presentesFiltrados: Estudiante[] = [];
  public ausentesFiltrados: Estudiante[] = [];
  public acordeonAusentesAbierto: boolean = false;

  public textoBusqueda: string = '';
  public filtroAsignacion: 'todos' | 'asignados' | 'sin_asignar' = 'todos';
  public textoBusquedaProducto: string = '';
  public gruposAbiertos: Set<string> = new Set();

  public resumenAbierto: boolean = true;
  public cargandoInicial: boolean = false;
  public cargandoProductos: boolean = false;
  public grabando: boolean = false;

  private todosPs: any[] = [];

  // ─── Getters ──────────────────────────────────────────────────────────────

  public get productoActual(): ProductoItem | null {
    return [...this.productosDisponibles, ...this.productosNoDisponibles]
      .find(p => p.id === this.productoSeleccionado) || null;
  }

  public get totalSeleccionados(): number {
    return [...this.presentesFiltrados, ...this.ausentesFiltrados]
      .filter(e => e.seleccionado && !e.ya_asignado).length;
  }

  public get todosPresentesSeleccionados(): boolean {
    const pendientes = this.presentesFiltrados.filter(e => !e.ya_asignado);
    return pendientes.length > 0 && pendientes.every(e => e.seleccionado);
  }

  public get productosDisponiblesFiltrados(): ProductoItem[] {
    return this.filtrarProductosPorTexto(this.productosDisponibles);
  }

  public get productosNoDisponiblesFiltrados(): ProductoItem[] {
    return this.filtrarProductosPorTexto(this.productosNoDisponibles);
  }

  public get resumenHorario(): ResumenEstudiante[] {
    if (!this.asignaciones.length) return [];
    const todos = [...this.todosPresentes, ...this.todosAusentes];
    const mapa = new Map<string, ResumenEstudiante>();

    for (const a of this.asignaciones) {
      const persona = String(a.id_persona);
      const est = todos.find(e => String(e.id_persona) === persona);
      if (!est) continue;
      const nombreProducto = this.nombreProductoPorId(String(a.id_producto_servicio));
      if (!mapa.has(persona)) {
        mapa.set(persona, {
          id_persona: persona,
          nombre_estudiante: est.nombre_estudiante,
          nombre_grupo: est.nombre_grupo,
          productos: []
        });
      }
      mapa.get(persona)!.productos.push(nombreProducto);
    }

    return Array.from(mapa.values())
      .sort((a, b) => a.nombre_grupo.localeCompare(b.nombre_grupo) || a.nombre_estudiante.localeCompare(b.nombre_estudiante));
  }

  public get gruposResumen(): string[] {
    const grupos: string[] = [];
    this.resumenHorario.forEach(e => { if (!grupos.includes(e.nombre_grupo)) grupos.push(e.nombre_grupo); });
    return grupos;
  }

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(
    private asignacionOncesService: AsignacionOncesService,
    private horariosService: HorariosAlimentacionService,
    private productosServiciosService: ProductosServiciosService,
    private cocinaDisponibilidadService: CocinaDisponibilidadService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarHorarios();
    this.cargarEstudiantesDelDia();
    this.cargarProductosServicios();
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────

  obtenerFechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
  }

  cargarHorarios(): void {
    this.horariosService.obtenerTodos().subscribe({
      next: (response: any) => { this.horarios = response.body || []; }
    });
  }

  cargarProductosServicios(): void {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => { this.todosPs = response.body || []; }
    });
  }

  cargarEstudiantesDelDia(): void {
    this.cargandoInicial = true;
    this.asignacionOncesService.obtenerEstudiantesDelDia(this.fechaSeleccionada).subscribe({
      next: (response: any) => {
        const data = response;
        this.todosPresentes = (data?.presentes || []).map((e: any) => ({ ...e, seleccionado: false, ya_asignado: false }));
        this.todosAusentes  = (data?.ausentes  || []).map((e: any) => ({ ...e, seleccionado: false, ya_asignado: false }));
        this.cargandoInicial = false;
      },
      error: () => { this.cargandoInicial = false; }
    });
  }

  // ─── Eventos ──────────────────────────────────────────────────────────────

  cambioFecha(): void {
    this.resetProductos();
    this.cargarEstudiantesDelDia();
  }

  cambioHorario(): void {
    this.resetProductos();
    if (!this.horarioSeleccionado) return;
    this.cargarDisponibilidadYAsignaciones();
  }

  cargarDisponibilidadYAsignaciones(): void {
    this.cargandoProductos = true;

    this.cocinaDisponibilidadService.obtenerProductosPorFecha(this.fechaSeleccionada).subscribe({
      next: (response: any) => {
        const todosDisp = (response.productos || []) as any[];

        const mapear = (p: any): ProductoItem => {
          const ps = this.todosPs.find((x: any) => String(x.id) === String(p.id));
          return {
            id: String(p.id),
            nombre: p.nombre,
            detalles: p.detalles || '',
            valor_sugerido: ps?.valor_sugerido || 0,
            id_horario_alimentacion_sugerido: p.id_horario_alimentacion_sugerido != null
              ? String(p.id_horario_alimentacion_sugerido) : null,
            disponible_hoy: Number(p.disponible_hoy)
          };
        };

        const delHorario = (p: any) =>
          p.id_horario_alimentacion_sugerido == null ||
          String(p.id_horario_alimentacion_sugerido) === String(this.horarioSeleccionado);

        this.productosDisponibles   = todosDisp.filter((p: any) => Number(p.disponible_hoy) === 1 && delHorario(p)).map(mapear);
        this.productosNoDisponibles = todosDisp.filter((p: any) => Number(p.disponible_hoy) === 0 && delHorario(p)).map(mapear);

        this.asignacionOncesService.obtenerAsignacionesDelDia(this.fechaSeleccionada, this.horarioSeleccionado).subscribe({
          next: (r: any) => {
            this.asignaciones = r || [];
            this.cargandoProductos = false;
          },
          error: () => { this.cargandoProductos = false; }
        });
      },
      error: () => { this.cargandoProductos = false; }
    });
  }

  // ─── Productos ────────────────────────────────────────────────────────────

  seleccionarProducto(id: string): void {
    this.productoSeleccionado = id;
    this.textoBusqueda = '';
    this.filtroAsignacion = 'todos';
    this.acordeonAusentesAbierto = false;
    this.gruposAbiertos = new Set();
    this.aplicarFiltroProducto();
  }

  contarAsignadosPorProducto(idProducto: string): number {
    return this.asignaciones.filter(a => String(a.id_producto_servicio) === String(idProducto)).length;
  }

  private filtrarProductosPorTexto(lista: ProductoItem[]): ProductoItem[] {
    if (!this.textoBusquedaProducto.trim()) return lista;
    const termino = this.normalizarTexto(this.textoBusquedaProducto);
    return lista.filter(p =>
      this.normalizarTexto(p.nombre).includes(termino) ||
      this.normalizarTexto(p.detalles).includes(termino)
    );
  }

  // ─── Estudiantes ──────────────────────────────────────────────────────────

  aplicarFiltroProducto(): void {
    const yaAsignados = new Set(
      this.asignaciones
        .filter(a => String(a.id_producto_servicio) === String(this.productoSeleccionado))
        .map(a => String(a.id_persona))
    );

    const mapear = (lista: Estudiante[]) =>
      lista.map(e => ({
        ...e,
        ya_asignado: yaAsignados.has(String(e.id_persona)),
        seleccionado: yaAsignados.has(String(e.id_persona)) ? false : e.seleccionado
      }));

    let presentes = mapear(this.todosPresentes);
    let ausentes  = mapear(this.todosAusentes);

    if (this.filtroAsignacion === 'asignados') {
      presentes = presentes.filter(e => e.ya_asignado);
      ausentes  = ausentes.filter(e => e.ya_asignado);
    } else if (this.filtroAsignacion === 'sin_asignar') {
      presentes = presentes.filter(e => !e.ya_asignado);
      ausentes  = ausentes.filter(e => !e.ya_asignado);
    }

    if (this.textoBusqueda.trim()) {
      const termino = this.normalizarTexto(this.textoBusqueda);
      const filtrar = (l: Estudiante[]) => l.filter(e =>
        this.normalizarTexto(e.nombre_estudiante).includes(termino) ||
        this.normalizarTexto(e.nombre_grupo).includes(termino)
      );
      presentes = filtrar(presentes);
      ausentes  = filtrar(ausentes);
    }

    this.presentesFiltrados = presentes;
    this.ausentesFiltrados  = ausentes;
  }

  cambioBusqueda(): void { this.aplicarFiltroProducto(); }

  cambioFiltroAsignacion(filtro: 'todos' | 'asignados' | 'sin_asignar'): void {
    this.filtroAsignacion = filtro;
    this.aplicarFiltroProducto();
  }

  getGrupos(lista: Estudiante[]): string[] {
    const grupos: string[] = [];
    lista.forEach(e => { if (!grupos.includes(e.nombre_grupo)) grupos.push(e.nombre_grupo); });
    return grupos;
  }

  getEstudiantesPorGrupo(lista: Estudiante[], grupo: string): Estudiante[] {
    return lista.filter(e => e.nombre_grupo === grupo);
  }

  getResumenPorGrupo(grupo: string): ResumenEstudiante[] {
    return this.resumenHorario.filter(e => e.nombre_grupo === grupo);
  }

  toggleGrupo(grupo: string): void {
    if (this.gruposAbiertos.has(grupo)) {
      this.gruposAbiertos.delete(grupo);
    } else {
      this.gruposAbiertos.add(grupo);
    }
  }

  isGrupoAbierto(grupo: string): boolean {
    return this.gruposAbiertos.has(grupo);
  }

  async toggleEstudiante(est: Estudiante): Promise<void> {
    if (est.ya_asignado) return;

    const otrosProductos = this.obtenerOtrosProductosAsignados(est.id_persona);
    if (!est.seleccionado && otrosProductos.length > 0) {
      const confirmar = await Swal.fire({
        title: 'Este estudiante ya tiene onces',
        html: `<b>${est.nombre_estudiante}</b> ya tiene asignado:<br><br>
               <span style="color:#e0a000;font-weight:600">${otrosProductos.join(', ')}</span><br><br>
               ¿Deseas asignarle también <b>${this.productoActual?.nombre}</b>?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, asignar igual',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmar.isConfirmed) return;
    }

    est.seleccionado = !est.seleccionado;
  }

  toggleTodosPresentes(): void {
    const nuevoEstado = !this.todosPresentesSeleccionados;
    this.presentesFiltrados.filter(e => !e.ya_asignado).forEach(e => e.seleccionado = nuevoEstado);
  }

  obtenerOtrosProductosAsignados(idPersona: string): string[] {
    return this.asignaciones
      .filter(a =>
        String(a.id_persona) === String(idPersona) &&
        String(a.id_producto_servicio) !== String(this.productoSeleccionado)
      )
      .map(a => this.nombreProductoPorId(String(a.id_producto_servicio)))
      .filter(n => !!n);
  }

  private nombreProductoPorId(idProducto: string): string {
    const todos = [...this.productosDisponibles, ...this.productosNoDisponibles];
    return todos.find(p => String(p.id) === idProducto)?.nombre
      || this.todosPs.find((p: any) => String(p.id) === idProducto)?.nombre
      || '';
  }

  // ─── Grabar ───────────────────────────────────────────────────────────────

  async grabar(): Promise<void> {
    const seleccionados = [...this.presentesFiltrados, ...this.ausentesFiltrados]
      .filter(e => e.seleccionado && !e.ya_asignado);

    if (!seleccionados.length) {
      Swal.fire('Atención', 'Debes seleccionar al menos un estudiante.', 'warning');
      return;
    }

    const producto = this.productoActual;
    if (!producto) return;

    const horarioNombre = this.horarios.find((h: any) => String(h.id) === String(this.horarioSeleccionado))?.nombre || '';

    const confirmar = await Swal.fire({
      title: '¿Confirmar asignación?',
      html: `<b>Producto:</b> ${producto.nombre}<br><b>Horario:</b> ${horarioNombre}<br><b>Fecha:</b> ${this.fechaSeleccionada}<br><b>Estudiantes:</b> ${seleccionados.length}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, asignar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar.isConfirmed) return;

    this.grabando = true;

    this.asignacionOncesService.crearBatch({
      fecha: this.fechaSeleccionada,
      id_horario: this.horarioSeleccionado,
      id_producto_servicio: this.productoSeleccionado,
      valor: producto.valor_sugerido,
      id_usuario: this.utilService.obtenerIdUsuarioActual(),
      detalle: '',
      estudiantes: seleccionados.map(e => e.id_persona)
    }).subscribe({
      next: (response: any) => {
        this.asignaciones = response.asignaciones || this.asignaciones;
        this.grabando = false;
        Swal.fire('¡Listo!', `Se asignaron onces a ${response.creados} estudiantes.`, 'success');
        this.aplicarFiltroProducto();
      },
      error: () => {
        this.grabando = false;
        Swal.fire('Error', 'Hubo un problema al guardar las asignaciones.', 'error');
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resetProductos(): void {
    this.productoSeleccionado = '';
    this.productosDisponibles = [];
    this.productosNoDisponibles = [];
    this.presentesFiltrados = [];
    this.ausentesFiltrados = [];
    this.asignaciones = [];
    this.acordeonProductosAbierto = false;
    this.acordeonAusentesAbierto = false;
    this.textoBusqueda = '';
    this.textoBusquedaProducto = '';
    this.filtroAsignacion = 'todos';
    this.gruposAbiertos = new Set();
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  trackByPersona(index: number, item: Estudiante): string { return item.id_persona; }
  trackByProducto(index: number, item: ProductoItem): string { return item.id; }
  trackByGrupo(index: number, item: string): string { return item; }
}