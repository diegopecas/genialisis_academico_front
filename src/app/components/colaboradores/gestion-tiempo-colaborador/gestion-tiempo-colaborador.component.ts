import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { CategoriasActividadesService } from '../../../services/categorias-actividades.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';
import { ActividadesColaboradoresService } from '../../../services/actividades-colaboradores.service';
import { TiposActividadesColaboradoresService } from '../../../services/tipos-actividades-colaboradores.service';
import { TareasColaboradoresService } from '../../../services/tareas-colaboradores.service';
import { EstadosTareasColaboradoresService } from '../../../services/estados-tareas-colaboradores.service';
import { TiposTareasColaboradoresService } from '../../../services/tipos-tareas-colaboradores.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { GoogleCalendarService } from '../../../services/google-calendar.service';
import { ClasesTareasService } from '../../../services/clases-tareas.service';

@Component({
  selector: 'app-gestion-tiempo-colaborador',
  templateUrl: './gestion-tiempo-colaborador.component.html',
  styleUrl: './gestion-tiempo-colaborador.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent, RouterModule]
})
export class GestionTiempoColaboradorComponent implements OnInit {

  @Input() idColaboradorInput: string | null = null;
  public modoEmbebido = false;

  public titulo = "Gestión de Tiempo";
  public id = "0";
  public seccionActiva = 'registrar';
  public Math = Math;
  
  public colaborador: any = {};
  public balance: any = {
    total_permisos: 0,
    total_horas_adicionales: 0,
    valor_horas_adicionales: 0,
    balance_minutos: 0
  };
  
  public actividades: any[] = [];
  public categorias: any[] = [];
  public tiposActividades: any[] = [];
  public tiposActividadesFiltrados: any[] = [];

  // Tareas
  public tareas: any[] = [];
  public estadosTareas: any[] = [];
  public tiposTareas: any[] = [];
  public clasesTareas: any[] = [];
  public correoInput: string = '';
  public tareaEditando: any = null;
  public mostrarFormularioTarea: boolean = false;

  // Modal detalle tarea
  public tareaDetalle: any = null;

  public modelTarea = {
    id_estudiante: null as number | null,
    nombre_estudiante: '',
    id_tipo_tarea: null as number | null,
    id_clase_tarea: 3 as number,
    descripcion: '',
    fecha_limite: '',
    hora_inicio: '',
    hora_fin: '',
    observaciones: '',
    correos_asistentes: [] as string[],
    esRecurrente: false,
    tipoRecurrencia: 'diario' as 'diario' | 'semanal' | 'mensual',
    fecha_desde: '',
    fecha_hasta: '',
    diasSemana: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 0: false } as { [key: string]: boolean },
    diaMes: 1
  };

  // Selector de estudiantes
  public estudiantesActivos: any[] = [];
  public estudiantesFiltradosTarea: any[] = [];
  public mostrarModalEstudiantes: boolean = false;
  public busquedaEstudiante: string = '';
  public grupoFiltroEstudiante: string = '';
  public gruposEstudiantes: any[] = [];
  public selectorParaEdicion: boolean = false;
  
  public categoriaSeleccionada: any = null;
  public registroPorHoras = false;
  public tipoActividadSeleccionado: any = null;
  public valorCalculado = 0;
  
  public model = {
    id_colaborador: '',
    id_tipo_actividad: '',
    fecha_inicio: '',
    fecha_fin: '',
    fecha_hora_inicio: '',
    fecha_hora_fin: '',
    observaciones: '',
    ruta_documento: null
  };

  // ==================== CONFIGURACIÓN APP-TABLAS: ACTIVIDADES ====================

  public titulosActividades = [
    { clave: 'fecha_registro', alias: 'Fecha Registro', tipo: 'datetime' },
    { clave: 'nombre_categoria', alias: 'Categoría' },
    { clave: 'nombre_tipo_actividad', alias: 'Tipo' },
    { clave: 'fecha_hora_inicio', alias: 'Inicio', tipo: 'datetime' },
    { clave: 'fecha_hora_fin', alias: 'Fin', tipo: 'datetime' },
    { clave: 'duracion_formateada', alias: 'Duración' },
    { clave: 'nombre_estado', alias: 'Estado', tipo: 'badge', claseCSS: 'clase_estado' }
  ];

  public accionesActividades = [
    { id: 'sincronizar_actividad', label: 'Sincronizar Calendar', icono: '/assets/images/google-calendar.png', condicion: 'puede_sincronizar', valor: true },
    { id: 'eliminar_actividad', label: 'Eliminar', icono: '/assets/images/eliminar.png', condicion: 'nombre_estado', valor: 'Registrado' }
  ];

  public actividadesProcesadas: any[] = [];

  public columnasFiltroActividades = ['Categoría', 'Tipo', 'Estado'];

  // ==================== CONFIGURACIÓN APP-TABLAS: TAREAS ====================

  public titulosTareas = [
    { clave: 'fecha_limite_formateada', alias: 'Fecha Límite' },
    { clave: 'nombre_tipo_tarea', alias: 'Tipo' },
    { clave: 'nombre_estudiante', alias: 'Estudiante' },
    { clave: 'descripcion', alias: 'Descripción' },
    { clave: 'nombre_estado', alias: 'Estado', tipo: 'badge', claseCSS: 'clase_estado_tarea' },
    { clave: 'etiqueta_vencido', alias: 'Vencido' },
    { clave: 'observaciones', alias: 'Observaciones' }
  ];

  public accionesTareas = [
    { id: 'sincronizar_tarea', label: 'Sincronizar Calendar', icono: '/assets/images/configuracion-google.png', condicion: 'puede_sincronizar', valor: true },
    { id: 'ver_tarea', label: 'Ver detalle', icono: '/assets/images/detalle.png' },
    { id: 'editar_tarea', label: 'Editar', icono: '/assets/images/editar.png', condicion: 'puede_editar', valor: true },
    { id: 'eliminar_tarea', label: 'Eliminar', icono: '/assets/images/eliminar.png', condicion: 'puede_eliminar', valor: true }
  ];

  public tareasProcesadas: any[] = [];

  public columnasFiltroTareas = [
    'Tipo', 'Estado', 'Estudiante', 'Vencido',
    { columna: 'Fecha Límite', tipoFiltro: 'fecha' as const }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradoresService: ColaboradoresService,
    private actividadesColaboradoresService: ActividadesColaboradoresService,
    private tiposActividadesColaboradoresService: TiposActividadesColaboradoresService,
    private categoriasActividadesService: CategoriasActividadesService,
    private tareasColaboradoresService: TareasColaboradoresService,
    private estadosTareasColaboradoresService: EstadosTareasColaboradoresService,
    private tiposTareasColaboradoresService: TiposTareasColaboradoresService,
    private estudiantesService: EstudiantesService,
    private googleCalendarService: GoogleCalendarService,
    private clasesTareasService: ClasesTareasService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    if (this.idColaboradorInput) {
      this.modoEmbebido = true;
      this.id = this.idColaboradorInput;
      this.model.id_colaborador = this.id;
      this.cargarColaborador();
      this.cargarCategorias();
      this.cargarTiposActividades();
      this.cargarActividades();
      this.cargarBalance();
      this.cargarEstadosTareas();
      this.cargarTiposTareas();
      this.cargarClasesTareas();
      this.cargarTareas();
      return;
    }

    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.model.id_colaborador = this.id;
      
      this.cargarColaborador();
      this.cargarCategorias();
      this.cargarTiposActividades();
      this.cargarActividades();
      this.cargarBalance();
      this.cargarEstadosTareas();
      this.cargarTiposTareas();
      this.cargarClasesTareas();
      this.cargarTareas();
    });
  }

  cargarColaborador() {
    this.colaboradoresService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        this.colaborador = response.body[0];
        this.titulo = `Gestión de Tiempo - ${this.colaborador.nombre_completo}`;
      }
    });
  }

  cargarCategorias() {
    this.categoriasActividadesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.categorias = response.body;
      }
    });
  }

  cargarTiposActividades() {
    this.tiposActividadesColaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tiposActividades = response.body;
        this.tiposActividadesFiltrados = [...this.tiposActividades];
      }
    });
  }

  cargarActividades() {
    this.actividadesColaboradoresService.obtenerByColaborador(this.id).subscribe({
      next: (response: any) => {
        this.actividades = response.body;
        this.procesarActividades();
      }
    });
  }

  cargarBalance() {
    this.actividadesColaboradoresService.obtenerBalanceColaborador(this.id).subscribe({
      next: (response: any) => {
        this.balance = response.body;
      }
    });
  }

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;
  }

  onCategoriaChange(event: any) {
    const idCategoria = event.target.value;
    if (idCategoria) {
      this.categoriaSeleccionada = this.categorias.find(c => c.id == idCategoria);
      this.registroPorHoras = this.categoriaSeleccionada?.registro_x_horas == 1;
      
      this.tiposActividadesFiltrados = this.tiposActividades.filter(
        t => t.id_categoria == idCategoria
      );
    } else {
      this.categoriaSeleccionada = null;
      this.registroPorHoras = false;
      this.tiposActividadesFiltrados = [...this.tiposActividades];
    }
    
    this.model.id_tipo_actividad = '';
    this.tipoActividadSeleccionado = null;
    this.valorCalculado = 0;
    this.limpiarFechas();
  }

  onTipoActividadChange() {
    if (this.model.id_tipo_actividad) {
      this.tipoActividadSeleccionado = this.tiposActividadesFiltrados.find(
        t => t.id == this.model.id_tipo_actividad
      );
      this.calcularValor();
    } else {
      this.tipoActividadSeleccionado = null;
      this.valorCalculado = 0;
    }
  }

  limpiarFechas() {
    this.model.fecha_inicio = '';
    this.model.fecha_fin = '';
    this.model.fecha_hora_inicio = '';
    this.model.fecha_hora_fin = '';
  }

  calcularDuracion() {
    let inicio: Date | null = null;
    let fin: Date | null = null;

    if (this.registroPorHoras) {
      if (this.model.fecha_hora_inicio && this.model.fecha_hora_fin) {
        inicio = new Date(this.model.fecha_hora_inicio);
        fin = new Date(this.model.fecha_hora_fin);
      }
    } else {
      if (this.model.fecha_inicio && this.model.fecha_fin) {
        inicio = new Date(this.model.fecha_inicio + 'T08:00:00');
        fin = new Date(this.model.fecha_fin + 'T18:00:00');
      }
    }
    
    if (inicio && fin && fin > inicio) {
      const diff = fin.getTime() - inicio.getTime();
      const minutos = Math.floor(diff / 60000);
      const horas = Math.floor(minutos / 60);
      const mins = minutos % 60;
      
      this.calcularValor();
      
      return `${horas}h ${mins}m (${minutos} minutos)`;
    }
    
    return '';
  }

  calcularValor() {
    if (!this.tipoActividadSeleccionado || !this.tipoActividadSeleccionado.valor_hora) {
      this.valorCalculado = 0;
      return;
    }

    let inicio: Date | null = null;
    let fin: Date | null = null;

    if (this.registroPorHoras) {
      if (this.model.fecha_hora_inicio && this.model.fecha_hora_fin) {
        inicio = new Date(this.model.fecha_hora_inicio);
        fin = new Date(this.model.fecha_hora_fin);
      }
    } else {
      if (this.model.fecha_inicio && this.model.fecha_fin) {
        inicio = new Date(this.model.fecha_inicio + 'T08:00:00');
        fin = new Date(this.model.fecha_fin + 'T18:00:00');
      }
    }

    if (inicio && fin && fin > inicio) {
      const diff = fin.getTime() - inicio.getTime();
      const minutos = Math.floor(diff / 60000);
      const horas = minutos / 60;
      this.valorCalculado = horas * this.tipoActividadSeleccionado.valor_hora;
    } else {
      this.valorCalculado = 0;
    }
  }

  validarFormulario(): boolean {
    if (!this.model.id_tipo_actividad) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe seleccionar el tipo de actividad'
      });
      return false;
    }

    if (this.registroPorHoras) {
      if (!this.model.fecha_hora_inicio || !this.model.fecha_hora_fin) {
        Swal.fire({
          icon: 'error',
          title: 'Datos incompletos',
          text: 'Debe ingresar fecha y hora de inicio y fin'
        });
        return false;
      }

      const inicio = new Date(this.model.fecha_hora_inicio);
      const fin = new Date(this.model.fecha_hora_fin);

      if (fin <= inicio) {
        Swal.fire({
          icon: 'error',
          title: 'Error en fechas',
          text: 'La fecha/hora de fin debe ser posterior a la de inicio'
        });
        return false;
      }
    } else {
      if (!this.model.fecha_inicio || !this.model.fecha_fin) {
        Swal.fire({
          icon: 'error',
          title: 'Datos incompletos',
          text: 'Debe ingresar fecha de inicio y fin'
        });
        return false;
      }

      const inicio = new Date(this.model.fecha_inicio);
      const fin = new Date(this.model.fecha_fin);

      if (fin < inicio) {
        Swal.fire({
          icon: 'error',
          title: 'Error en fechas',
          text: 'La fecha de fin debe ser igual o posterior a la de inicio'
        });
        return false;
      }
    }

    return true;
  }

  guardar() {
    if (!this.validarFormulario()) return;

    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    
    let fechaHoraInicio: string;
    let fechaHoraFin: string;

    if (this.registroPorHoras) {
      fechaHoraInicio = this.model.fecha_hora_inicio;
      fechaHoraFin = this.model.fecha_hora_fin;
    } else {
      fechaHoraInicio = this.model.fecha_inicio + 'T08:00:00';
      fechaHoraFin = this.model.fecha_fin + 'T18:00:00';
    }
    
    const actividad = {
      id_colaborador: this.model.id_colaborador,
      id_tipo_actividad: this.model.id_tipo_actividad,
      fecha_hora_inicio: fechaHoraInicio,
      fecha_hora_fin: fechaHoraFin,
      observaciones: this.model.observaciones || null,
      ruta_documento: this.model.ruta_documento,
      id_usuario_registro: idUsuario
    };

    this.actividadesColaboradoresService.crear(actividad).subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Actividad registrada',
          text: 'La actividad se ha registrado correctamente',
          timer: 2000,
          showConfirmButton: false
        });
        
        this.limpiarFormulario();
        this.cargarActividades();
        this.cargarBalance();
      },
      error: (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.error || 'Error al registrar la actividad'
        });
      }
    });
  }

  limpiarFormulario() {
    this.model = {
      id_colaborador: this.id,
      id_tipo_actividad: '',
      fecha_inicio: '',
      fecha_fin: '',
      fecha_hora_inicio: '',
      fecha_hora_fin: '',
      observaciones: '',
      ruta_documento: null
    };
    this.categoriaSeleccionada = null;
    this.registroPorHoras = false;
    this.tipoActividadSeleccionado = null;
    this.valorCalculado = 0;
    this.tiposActividadesFiltrados = [...this.tiposActividades];
  }

  formatearMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  // ==================== PRE-PROCESAMIENTO ACTIVIDADES ====================

  procesarActividades(): void {
    this.actividadesProcesadas = this.actividades.map((act: any) => ({
      ...act,
      duracion_formateada: this.formatearMinutos(act.minutos_totales),
      clase_estado: act.color_estado ? this.getClaseDesdeColor(act.color_estado) : this.getEstadoClass(act.nombre_estado),
      puede_sincronizar: !act.google_event_id
    }));
  }

  onAccionActividad(event: any): void {
    if (event.accion === 'eliminar_actividad') {
      this.eliminarActividad(event.registro.id);
    } else if (event.accion === 'sincronizar_actividad') {
      this.sincronizarActividadCalendar(event.registro);
    }
  }

  eliminarActividad(id: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea eliminar esta actividad?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.actividadesColaboradoresService.eliminar(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'Actividad eliminada correctamente',
              timer: 2000,
              showConfirmButton: false
            });
            this.cargarActividades();
            this.cargarBalance();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.error || 'No se pudo eliminar la actividad'
            });
          }
        });
      }
    });
  }

  // ==================== TAREAS ====================

  cargarEstadosTareas() {
    this.estadosTareasColaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => { this.estadosTareas = response.body || []; }
    });
  }

  cargarTiposTareas() {
    this.tiposTareasColaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => { this.tiposTareas = response.body || []; }
    });
  }

  cargarClasesTareas() {
    this.clasesTareasService.obtenerTodos().subscribe({
      next: (response: any) => { this.clasesTareas = response.body || []; }
    });
  }

  cargarTareas() {
    this.tareasColaboradoresService.obtenerPorColaborador(this.id).subscribe({
      next: (response: any) => {
        const hoy = new Date().toISOString().split('T')[0];
        this.tareas = (response.body || []).map((t: any) => ({
          ...t,
          vencido: t.nombre_estado === 'Registrado' && t.fecha_limite && t.fecha_limite < hoy
        }));
        this.procesarTareas();
      }
    });
  }

  // ==================== PRE-PROCESAMIENTO TAREAS ====================

  procesarTareas(): void {
    this.tareasProcesadas = this.tareas.map((t: any) => ({
      ...t,
      fecha_limite_formateada: this.formatearFechaHora(t.fecha_limite, t.hora_inicio, t.hora_fin),
      nombre_tipo_tarea: t.nombre_tipo_tarea || '-',
      nombre_estudiante: t.nombre_estudiante || '-',
      observaciones: t.observaciones || '-',
      etiqueta_vencido: t.vencido ? 'Vencido' : '-',
      clase_estado_tarea: this.getClaseDesdeColor(t.color_estado),
      puede_editar: t.nombre_estado === 'Registrado',
      puede_eliminar: t.origen === 'manual' && t.nombre_estado === 'Registrado',
      puede_sincronizar: !t.google_event_id,
      _estiloFila: t.vencido ? 'background-color: #fff3f3;' : ''
    }));
  }

  onAccionTarea(event: any): void {
    const tarea = event.registro;
    switch (event.accion) {
      case 'sincronizar_tarea':
        this.sincronizarTareaCalendar(tarea);
        break;
      case 'ver_tarea':
        this.verDetalleTarea(tarea);
        break;
      case 'editar_tarea':
        this.editarTarea(tarea);
        break;
      case 'eliminar_tarea':
        this.eliminarTarea(tarea);
        break;
    }
  }

  verDetalleTarea(tarea: any): void {
    this.tareaDetalle = tarea;
    this.tareaEditando = null;
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDetalleTarea'));
    modal.show();
  }

  editarTarea(tarea: any): void {
    this.tareaDetalle = tarea;
    this.tareaEditando = null;
    this.cargarEstudiantesActivos();
    this.tareaEditando = {
      id: tarea.id,
      id_estudiante: tarea.id_estudiante,
      nombre_estudiante: tarea.nombre_estudiante || '',
      id_tipo_tarea: tarea.id_tipo_tarea,
      descripcion: tarea.descripcion,
      fecha_limite: tarea.fecha_limite || '',
      hora_inicio: tarea.hora_inicio || '',
      hora_fin: tarea.hora_fin || '',
      id_estado: tarea.id_estado,
      observaciones: tarea.observaciones || ''
    };
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDetalleTarea'));
    modal.show();
  }

  cancelarEdicionTarea(): void {
    this.tareaEditando = null;
  }

  guardarTarea(): void {
    this.guardarTareaDesdeModal();
  }

  eliminarTarea(tarea: any): void {
    if (tarea.origen !== 'manual') {
      Swal.fire({ icon: 'warning', title: 'No permitido', text: 'Solo se pueden eliminar tareas manuales.' });
      return;
    }
    Swal.fire({
      title: '¿Está seguro?', text: '¿Desea eliminar esta tarea?', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tareasColaboradoresService.eliminar(tarea.id).subscribe({
          next: () => { Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1500, showConfirmButton: false }); this.cargarTareas(); },
          error: (error: any) => { Swal.fire({ icon: 'error', title: 'Error', text: error.error?.error || 'No se pudo eliminar' }); }
        });
      }
    });
  }

  editarTareaEnModal(): void {
    if (!this.tareaDetalle) return;
    this.cargarEstudiantesActivos();
    this.tareaEditando = {
      id: this.tareaDetalle.id,
      id_estudiante: this.tareaDetalle.id_estudiante,
      nombre_estudiante: this.tareaDetalle.nombre_estudiante || '',
      id_tipo_tarea: this.tareaDetalle.id_tipo_tarea,
      descripcion: this.tareaDetalle.descripcion,
      fecha_limite: this.tareaDetalle.fecha_limite || '',
      hora_inicio: this.tareaDetalle.hora_inicio || '',
      hora_fin: this.tareaDetalle.hora_fin || '',
      id_estado: this.tareaDetalle.id_estado,
      observaciones: this.tareaDetalle.observaciones || ''
    };
  }

  cancelarEdicionModal(): void {
    this.tareaEditando = null;
  }

  guardarTareaDesdeModal(): void {
    if (!this.tareaEditando) return;
    if (!this.tareaEditando.descripcion?.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingrese una descripción.' });
      return;
    }
    if (!this.tareaEditando.fecha_limite) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingrese una fecha límite.' });
      return;
    }

    this.tareasColaboradoresService.actualizar(this.tareaEditando).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Tarea actualizada', timer: 1500, showConfirmButton: false });
        this.tareaEditando = null;
        const modalEl = document.getElementById('modalDetalleTarea');
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        this.cargarTareas();
      },
      error: () => { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la tarea' }); }
    });
  }

  formatearFechaHora(fecha: string, horaInicio: string, horaFin: string): string {
    if (!fecha) return '-';
    const parts = fecha.split('-');
    if (parts.length < 3) return fecha;
    let result = `${parts[2]}/${parts[1]}/${parts[0].slice(-2)}`;
    if (horaInicio) {
      result += ` ${horaInicio.substring(0, 5)}`;
      if (horaFin) result += ` - ${horaFin.substring(0, 5)}`;
    }
    return result;
  }

  // ==================== MODAL SELECTOR DE ESTUDIANTES ====================

  cargarEstudiantesActivos() {
    if (this.estudiantesActivos.length > 0) return;
    this.estudiantesService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.estudiantesActivos = (response.body || []).map((e: any) => ({
          ...e,
          nombre_completo: [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
        }));
        const gruposMap = new Map();
        this.estudiantesActivos.forEach(e => {
          if (e.id_grupo && !gruposMap.has(e.id_grupo)) {
            gruposMap.set(e.id_grupo, e.nombre_grupo);
          }
        });
        this.gruposEstudiantes = Array.from(gruposMap, ([id, nombre]) => ({ id, nombre }));
        this.estudiantesFiltradosTarea = [...this.estudiantesActivos];
      }
    });
  }

  abrirSelectorEstudiantes(paraEdicion: boolean): void {
    this.selectorParaEdicion = paraEdicion;
    this.cargarEstudiantesActivos();
    this.busquedaEstudiante = '';
    this.grupoFiltroEstudiante = '';
    this.estudiantesFiltradosTarea = [...this.estudiantesActivos];
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalSelectorEstudiantes'));
    modal.show();
  }

  filtrarEstudiantesTarea(): void {
    let filtrados = [...this.estudiantesActivos];
    if (this.grupoFiltroEstudiante) {
      filtrados = filtrados.filter(e => e.id_grupo?.toString() === this.grupoFiltroEstudiante);
    }
    if (this.busquedaEstudiante) {
      const busq = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(e => e.nombre_completo.toLowerCase().includes(busq));
    }
    this.estudiantesFiltradosTarea = filtrados;
  }

  seleccionarEstudianteTarea(estudiante: any): void {
    if (this.selectorParaEdicion && this.tareaEditando) {
      this.tareaEditando.id_estudiante = estudiante.id_estudiante;
      this.tareaEditando.nombre_estudiante = estudiante.nombre_completo;
    } else {
      this.modelTarea.id_estudiante = estudiante.id_estudiante;
      this.modelTarea.nombre_estudiante = estudiante.nombre_completo;
    }
    const modalEl = document.getElementById('modalSelectorEstudiantes');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  }

  limpiarEstudianteTarea(): void {
    this.modelTarea.id_estudiante = null;
    this.modelTarea.nombre_estudiante = '';
  }

  limpiarEstudianteTareaEdicion(): void {
    if (this.tareaEditando) {
      this.tareaEditando.id_estudiante = null;
      this.tareaEditando.nombre_estudiante = '';
    }
  }

  getOrigenLabel(origen: string): string {
    switch (origen) {
      case 'recordatorio_general': return 'Rec. General';
      case 'recordatorio_pago': return 'Rec. Pago';
      case 'manual': return 'Manual';
      default: return origen;
    }
  }

  getTareasPendientes(): number {
    return this.tareas.filter(t => t.nombre_estado === 'Registrado').length;
  }

  getEstadoClass(nombreEstado: string): string {
    switch(nombreEstado) {
      case 'Registrado': return 'badge bg-warning';
      case 'Aprobado': return 'badge bg-success';
      case 'Rechazado': return 'badge bg-danger';
      case 'Contabilizado': return 'badge bg-secondary';
      default: return 'badge bg-light';
    }
  }

  getClaseDesdeColor(colorHex: string): string {
    const mapa: { [key: string]: string } = {
      '#ffc107': 'badge bg-warning text-dark',
      '#28a745': 'badge bg-success',
      '#dc3545': 'badge bg-danger',
      '#6c757d': 'badge bg-secondary',
      '#17a2b8': 'badge bg-info text-dark',
      '#007bff': 'badge bg-primary'
    };
    return mapa[(colorHex || '').toLowerCase()] || 'badge bg-secondary';
  }

  // ==================== FORMULARIO TAREA ====================

  toggleFormularioTarea(): void {
    this.mostrarFormularioTarea = !this.mostrarFormularioTarea;
    if (this.mostrarFormularioTarea) {
      this.cargarEstudiantesActivos();
    }
    if (!this.mostrarFormularioTarea) {
      this.limpiarFormularioTarea();
    }
  }

  limpiarFormularioTarea(): void {
    this.modelTarea = {
      id_estudiante: null, nombre_estudiante: '', id_tipo_tarea: null, id_clase_tarea: 3, descripcion: '', fecha_limite: '',
      hora_inicio: '', hora_fin: '', observaciones: '', correos_asistentes: [],
      esRecurrente: false, tipoRecurrencia: 'diario', fecha_desde: '', fecha_hasta: '',
      diasSemana: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 0: false },
      diaMes: 1
    };
    this.correoInput = '';
  }

  crearTareaManual(): void {
    if (!this.modelTarea.descripcion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingrese una descripción.' });
      return;
    }

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    if (this.modelTarea.esRecurrente) {
      this.crearTareasRecurrentes(idUsuario);
    } else {
      if (!this.modelTarea.fecha_limite) {
        Swal.fire({ icon: 'warning', title: 'Campo requerido', text: 'Ingrese una fecha límite.' });
        return;
      }
      const tarea: any = {
        id_colaborador: this.id,
        id_estudiante: this.modelTarea.id_estudiante || null,
        id_tipo_tarea: this.modelTarea.id_tipo_tarea || null,
        id_clase_tarea: this.modelTarea.id_clase_tarea,
        descripcion: this.modelTarea.descripcion.trim(),
        fecha_limite: this.modelTarea.fecha_limite,
        hora_inicio: this.modelTarea.hora_inicio || null,
        hora_fin: this.modelTarea.hora_fin || null,
        origen: 'manual',
        observaciones: this.modelTarea.observaciones?.trim() || null,
        correos_asistentes: this.modelTarea.correos_asistentes.length > 0 ? this.modelTarea.correos_asistentes.join(',') : null,
        id_usuario_registro: idUsuario
      };
      this.tareasColaboradoresService.crear(tarea).subscribe({
        next: () => {
          Swal.fire({ icon: 'success', title: 'Tarea creada', timer: 1500, showConfirmButton: false });
          this.limpiarFormularioTarea();
          this.mostrarFormularioTarea = false;
          this.cargarTareas();
        },
        error: () => { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo crear la tarea' }); }
      });
    }
  }

  private crearTareasRecurrentes(idUsuario: string | null): void {
    if (!this.modelTarea.fecha_desde || !this.modelTarea.fecha_hasta) {
      Swal.fire({ icon: 'warning', title: 'Campos requeridos', text: 'Ingrese las fechas de inicio y fin del rango.' });
      return;
    }

    const fechas = this.generarFechasRecurrencia();

    if (fechas.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin fechas', text: 'No se generaron fechas con la configuración seleccionada.' });
      return;
    }

    if (fechas.length > 365) {
      Swal.fire({ icon: 'warning', title: 'Demasiadas tareas', text: `Se generarían ${fechas.length} tareas. Reduzca el rango.` });
      return;
    }

    Swal.fire({
      title: `Se crearán ${fechas.length} tareas`,
      text: `Desde ${this.modelTarea.fecha_desde} hasta ${this.modelTarea.fecha_hasta}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const tareas = fechas.map(fecha => ({
          id_colaborador: this.id,
          id_estudiante: this.modelTarea.id_estudiante || null,
          id_tipo_tarea: this.modelTarea.id_tipo_tarea || null,
          descripcion: this.modelTarea.descripcion.trim(),
          fecha_limite: fecha,
          hora_inicio: this.modelTarea.hora_inicio || null,
          hora_fin: this.modelTarea.hora_fin || null,
          observaciones: this.modelTarea.observaciones?.trim() || null,
          id_usuario_registro: idUsuario
        }));

        this.tareasColaboradoresService.crearMasivo(tareas).subscribe({
          next: (response: any) => {
            Swal.fire({ icon: 'success', title: 'Tareas creadas', text: `Se crearon ${response.creadas} tareas.`, timer: 2000, showConfirmButton: false });
            this.limpiarFormularioTarea();
            this.mostrarFormularioTarea = false;
            this.cargarTareas();
          },
          error: () => { Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron crear las tareas.' }); }
        });
      }
    });
  }

  private generarFechasRecurrencia(): string[] {
    const fechas: string[] = [];
    const desde = new Date(this.modelTarea.fecha_desde + 'T00:00:00');
    const hasta = new Date(this.modelTarea.fecha_hasta + 'T00:00:00');

    if (hasta < desde) return [];

    const actual = new Date(desde);

    while (actual <= hasta) {
      const fechaStr = actual.toISOString().split('T')[0];

      if (this.modelTarea.tipoRecurrencia === 'diario') {
        fechas.push(fechaStr);
      } else if (this.modelTarea.tipoRecurrencia === 'semanal') {
        const diaSemana = actual.getDay();
        if (this.modelTarea.diasSemana[diaSemana]) {
          fechas.push(fechaStr);
        }
      } else if (this.modelTarea.tipoRecurrencia === 'mensual') {
        if (actual.getDate() === this.modelTarea.diaMes) {
          fechas.push(fechaStr);
        }
      }

      actual.setDate(actual.getDate() + 1);
    }

    return fechas;
  }

  getCantidadTareasPreview(): number {
    if (!this.modelTarea.fecha_desde || !this.modelTarea.fecha_hasta) return 0;
    return this.generarFechasRecurrencia().length;
  }

  // ==================== PÍLDORAS DE CORREOS (REUNIONES) ====================

  agregarCorreo(): void {
    const correo = this.correoInput.trim().toLowerCase();
    if (!correo) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      Swal.fire({ icon: 'warning', title: 'Correo inválido', text: 'Ingrese un correo electrónico válido', timer: 2000, showConfirmButton: false });
      return;
    }

    if (this.modelTarea.correos_asistentes.includes(correo)) {
      Swal.fire({ icon: 'info', title: 'Ya agregado', text: 'Este correo ya está en la lista', timer: 1500, showConfirmButton: false });
      return;
    }

    this.modelTarea.correos_asistentes.push(correo);
    this.correoInput = '';
  }

  eliminarCorreo(index: number): void {
    this.modelTarea.correos_asistentes.splice(index, 1);
  }

  onCorreoKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.agregarCorreo();
    }
  }

  // ==================== GOOGLE CALENDAR ====================

  sincronizarTareaCalendar(tarea: any): void {
    Swal.fire({
      title: 'Sincronizar con Google Calendar',
      text: '¿Desea crear un evento en el calendario del colaborador?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, sincronizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Sincronizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.googleCalendarService.crearEventoDesdeTarea(tarea.id).subscribe({
          next: (response: any) => {
            Swal.fire({ icon: 'success', title: 'Sincronizado', text: response.message || 'Sincronizado exitosamente', timer: 2000, showConfirmButton: false });
            this.cargarTareas();
          },
          error: (error: any) => {
            const mensaje = error.error?.message || 'No se pudo sincronizar con Google Calendar';
            Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
          }
        });
      }
    });
  }

  sincronizarActividadCalendar(actividad: any): void {
    Swal.fire({
      title: 'Sincronizar con Google Calendar',
      text: '¿Desea crear un evento en el calendario del colaborador?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, sincronizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'Sincronizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        this.googleCalendarService.crearEventoDesdeActividad(actividad.id).subscribe({
          next: (response: any) => {
            Swal.fire({ icon: 'success', title: 'Sincronizado', text: response.message || 'Sincronizado exitosamente', timer: 2000, showConfirmButton: false });
            this.cargarActividades();
          },
          error: (error: any) => {
            const mensaje = error.error?.message || 'No se pudo sincronizar con Google Calendar';
            Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
          }
        });
      }
    });
  }
}