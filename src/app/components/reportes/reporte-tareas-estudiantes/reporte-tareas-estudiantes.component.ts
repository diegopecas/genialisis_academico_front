import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TareasEstudiantesService } from '../../../services/tareas-estudiantes.service';

/**
 * Reporte de tareas por estudiante.
 *
 * Solo el rango de fechas de entrega va al backend. Grupo, área, estudiante
 * y estado se filtran en memoria sobre lo ya consultado, igual que la matriz
 * de útiles diarios: volver al servidor por cada filtro no trae nada nuevo.
 */
@Component({
  selector: 'app-reporte-tareas-estudiantes',
  templateUrl: './reporte-tareas-estudiantes.component.html',
  styleUrl: './reporte-tareas-estudiantes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class ReporteTareasEstudiantesComponent implements OnInit {

  titulo = 'Reporte de Tareas por Estudiante';

  public vista: 'resumen' | 'lista' = 'resumen';

  public fechas = { desde: '', hasta: '' };

  public filtros = {
    id_grupo: '',
    id_area: '',
    estudiante: '',
    estado: ''
  };

  // Valor del filtro de área para las tareas que no tienen área
  readonly SIN_AREA = '__sin_area__';

  readonly ESTADOS: { valor: string, nombre: string }[] = [
    { valor: 'pendiente', nombre: 'Pendiente' },
    { valor: 'enviada', nombre: 'Enviada' },
    { valor: 'no_entregada', nombre: 'No entregada' },
    { valor: 'calificada', nombre: 'Calificada' }
  ];

  // Todo lo que trajo el backend para el rango
  private filasCompletas: any[] = [];

  // Opciones de los selectores, sacadas de lo consultado
  public grupos: { id: string, nombre: string }[] = [];
  public areas: { id: string, nombre: string }[] = [];

  // Resultado de aplicar los filtros
  public filas: any[] = [];
  public resumen: any[] = [];
  public totales = { tareas: 0, pendiente: 0, enviada: 0, no_entregada: 0, calificada: 0 };

  public cargando = false;
  public consultado = false;

  // Estudiante abierto en el detalle
  public detalle: any = null;

  // Listado detallado (componente de tablas)
  public titulos: any[] = [];
  public columnasFiltro = ['Estudiante', 'Grupo', 'Área', 'Estado'];

  constructor(private tareasService: TareasEstudiantesService) { }

  ngOnInit(): void {
    this.crearTitulos();

    const hoy = new Date();
    this.fechas.desde = this.formatearFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.fechas.hasta = this.formatearFecha(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));

    this.consultar();
  }

  cambiarVista(vista: 'resumen' | 'lista'): void {
    this.vista = vista;
  }

  /** Solo se llama al cambiar el rango de fechas. */
  consultar(): void {
    if (!this.fechas.desde || !this.fechas.hasta) {
      return;
    }

    this.cargando = true;
    this.detalle = null;

    this.tareasService.obtenerReporte(this.fechas.desde, this.fechas.hasta).subscribe({
      next: (response: any) => {
        this.filasCompletas = ((response.body as any[]) || []).map((fila: any) => this.prepararFila(fila));
        this.armarOpciones();
        this.aplicarFiltros();
        this.consultado = true;
        this.cargando = false;
      },
      error: () => {
        // El interceptor ya muestra el mensaje del backend
        this.filasCompletas = [];
        this.aplicarFiltros();
        this.cargando = false;
      }
    });
  }

  /** Agrega los textos que muestra el listado. */
  private prepararFila(fila: any): any {
    return {
      ...fila,
      grupo_texto: fila.nombre_grupo || 'Sin grupo',
      area_texto: fila.area_nombre || 'Sin área',
      estado_texto: this.nombreEstado(fila.estado),
      fecha_asignacion_texto: this.fechaTexto(fila.fecha_asignacion),
      fecha_entrega_texto: this.fechaTexto(fila.fecha_entrega),
      fecha_calificacion_texto: this.fechaTexto(fila.fecha_calificacion),
      valoracion: fila.valoracion_texto || '',
      observacion_texto: fila.observacion || ''
    };
  }

  /** Grupos y áreas que aparecen en el rango consultado. */
  private armarOpciones(): void {
    const grupos = new Map<string, string>();
    const areas = new Map<string, string>();

    this.filasCompletas.forEach((fila: any) => {
      if (fila.id_grupo) {
        grupos.set(fila.id_grupo, fila.nombre_grupo);
      }
      areas.set(fila.id_area_academica || this.SIN_AREA, fila.area_nombre || 'Sin área');
    });

    const ordenar = (a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es');
    this.grupos = Array.from(grupos, ([id, nombre]) => ({ id, nombre })).sort(ordenar);
    this.areas = Array.from(areas, ([id, nombre]) => ({ id, nombre })).sort(ordenar);

    // Si el grupo o el área elegidos ya no están en el nuevo rango, se sueltan
    if (this.filtros.id_grupo && !grupos.has(this.filtros.id_grupo)) {
      this.filtros.id_grupo = '';
    }
    if (this.filtros.id_area && !areas.has(this.filtros.id_area)) {
      this.filtros.id_area = '';
    }
  }

  aplicarFiltros(): void {
    const texto = this.normalizar(this.filtros.estudiante);

    this.filas = this.filasCompletas.filter((fila: any) => {
      if (this.filtros.id_grupo && fila.id_grupo !== this.filtros.id_grupo) {
        return false;
      }
      if (this.filtros.id_area && (fila.id_area_academica || this.SIN_AREA) !== this.filtros.id_area) {
        return false;
      }
      if (this.filtros.estado && fila.estado !== this.filtros.estado) {
        return false;
      }
      if (texto !== '' && !this.normalizar(fila.nombre_estudiante).includes(texto)) {
        return false;
      }
      return true;
    });

    this.armarResumen();

    // El detalle abierto se refresca con los filtros nuevos
    if (this.detalle) {
      const actualizado = this.resumen.find((r: any) => r.id_estudiante === this.detalle.id_estudiante);
      this.detalle = actualizado || null;
    }
  }

  /**
   * Una tarjeta por estudiante con el conteo por estado.
   * Cumplimiento = (enviadas + calificadas) / total: una tarea calificada ya
   * fue entregada, y las pendientes y no entregadas cuentan como no cumplidas.
   */
  private armarResumen(): void {
    const porEstudiante = new Map<string, any>();
    this.totales = { tareas: 0, pendiente: 0, enviada: 0, no_entregada: 0, calificada: 0 };

    this.filas.forEach((fila: any) => {
      let item = porEstudiante.get(fila.id_estudiante);
      if (!item) {
        item = {
          id_estudiante: fila.id_estudiante,
          nombre: fila.nombre_estudiante,
          grupo: fila.nombre_grupo || 'Sin grupo',
          total: 0,
          pendiente: 0,
          enviada: 0,
          no_entregada: 0,
          calificada: 0,
          cumplimiento: 0,
          tareas: [] as any[]
        };
        porEstudiante.set(fila.id_estudiante, item);
      }

      item.total++;
      if (item[fila.estado] !== undefined) {
        item[fila.estado]++;
      }
      item.tareas.push(fila);

      this.totales.tareas++;
      if ((this.totales as any)[fila.estado] !== undefined) {
        (this.totales as any)[fila.estado]++;
      }
    });

    this.resumen = Array.from(porEstudiante.values()).map((item: any) => ({
      ...item,
      cumplimiento: item.total > 0 ? Math.round(((item.enviada + item.calificada) * 100) / item.total) : 0
    }));
  }

  get cumplimientoGeneral(): number {
    return this.totales.tareas > 0
      ? Math.round(((this.totales.enviada + this.totales.calificada) * 100) / this.totales.tareas)
      : 0;
  }

  get hayFiltros(): boolean {
    return !!this.filtros.id_grupo || !!this.filtros.id_area || !!this.filtros.estado || this.filtros.estudiante !== '';
  }

  limpiarFiltros(): void {
    this.filtros = { id_grupo: '', id_area: '', estudiante: '', estado: '' };
    this.aplicarFiltros();
  }

  abrirDetalle(item: any): void {
    this.detalle = item;
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  nombreEstado(estado: string): string {
    const encontrado = this.ESTADOS.find(e => e.valor === estado);
    return encontrado ? encontrado.nombre : estado;
  }

  /** Clase de color de la barra de cumplimiento. */
  claseCumplimiento(valor: number): string {
    if (valor >= 80) {
      return 'alto';
    }
    if (valor >= 50) {
      return 'medio';
    }
    return 'bajo';
  }

  fechaTexto(fecha: string): string {
    if (!fecha) {
      return '';
    }
    // Se corta la cadena en vez de usar Date para no correr el día por zona horaria.
    const partes = fecha.substring(0, 10).split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  trackByEstudiante(_indice: number, item: any): string {
    return item.id_estudiante;
  }

  trackByFila(_indice: number, fila: any): string {
    return fila.id;
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();
  }

  /** Fecha local en formato AAAA-MM-DD. No usar toISOString() porque desfasa el día. */
  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private crearTitulos(): void {
    this.titulos = [
      { clave: 'nombre_estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'grupo_texto', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'titulo', alias: 'Tarea', alinear: 'izquierda' },
      { clave: 'area_texto', alias: 'Área', alinear: 'izquierda' },
      { clave: 'fecha_asignacion_texto', alias: 'Asignación', alinear: 'centrado' },
      { clave: 'fecha_entrega_texto', alias: 'Entrega', alinear: 'centrado' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'valoracion', alias: 'Valoración', alinear: 'centrado' },
      { clave: 'fecha_calificacion_texto', alias: 'Calificada el', alinear: 'centrado' },
      { clave: 'observacion_texto', alias: 'Observación', alinear: 'izquierda' }
    ];
  }
}
