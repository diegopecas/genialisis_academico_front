import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TareasEstudiantesService } from '../../../../services/tareas-estudiantes.service';
import { TareasEstudiantesAdjuntosService } from '../../../../services/tareas-estudiantes-adjuntos.service';
import { TareasEstudiantesResponsablesService } from '../../../../services/tareas-estudiantes-responsables.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { GruposService } from '../../../../services/grupos.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { JornadaLaboralService } from '../../../../services/jornada-laboral.service';
import { IaMejorarTextoService } from '../../../../services/ia-mejorar-texto.service';

interface EstudianteSeleccionable {
  id: string;
  nombre: string;
  id_grupo: string;
  grupo: string;
  seleccionado: boolean;
}

interface ColaboradorSeleccionable {
  id: string;
  nombre: string;
  rol: string;
  seleccionado: boolean;
}

/**
 * Crear / editar una tarea. Se basa en el formulario de notificaciones:
 * tarjetas de datos, destinatarios y responsables.
 *
 * Los estudiantes se cargan una sola vez (todos los activos) y el grupo es
 * solo un filtro de vista: lo marcado se conserva al cambiar de grupo, así
 * se pueden mezclar niños de varios grupos en la misma tarea.
 */
@Component({
  selector: 'app-crear-tarea-estudiante',
  templateUrl: './crear-tarea-estudiante.component.html',
  styleUrl: './crear-tarea-estudiante.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearTareaEstudianteComponent implements OnInit {

  titulo = 'Crear Tarea';
  accion = '';
  regresar = '/estudiantes/tareas';
  submitted = false;
  guardando = false;
  cargando = false;
  mejorando = false;
  descripcionAnterior: string | null = null;

  /** Valor del filtro de grupo que muestra a todos los estudiantes. */
  readonly GRUPO_TODOS = '';

  public areas: any[] = [];
  public grupos: any[] = [];
  public estudiantes: EstudianteSeleccionable[] = [];
  public colaboradores: ColaboradorSeleccionable[] = [];

  public filtroGrupo = '';
  public filtroEstudiante = '';
  public filtroColaborador = '';

  public adjuntos: any[] = [];
  public archivosNuevos: File[] = [];

  /** Seccion visible en el celular (en escritorio se ven todas). */
  public seccionMovil: 'datos' | 'destinatarios' | 'responsables' = 'datos';

  model = {
    id: null as any,
    titulo: '',
    descripcion: '',
    id_area_academica: '',
    fecha_asignacion: '',
    fecha_entrega: '',
    criterio_texto: '',
    permite_respuestas_acudientes: false,
    publicada: false,
  };

  constructor(
    private tareasService: TareasEstudiantesService,
    private adjuntosService: TareasEstudiantesAdjuntosService,
    private responsablesService: TareasEstudiantesResponsablesService,
    private areasService: AreasAcademicasService,
    private gruposService: GruposService,
    private estudiantesService: EstudiantesService,
    private jornadaService: JornadaLaboralService,
    private iaMejorarTextoService: IaMejorarTextoService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.titulo = this.esEdicion ? 'Editar Tarea' : 'Crear Tarea';
      this.cargarTodo(this.esEdicion ? params['id'] : null);
    });
  }

  get esEdicion(): boolean {
    return this.accion === 'editar';
  }

  /**
   * Catálogos, estudiantes y colaboradores van juntos para poder marcar lo
   * que ya tenía la tarea al editar.
   */
  cargarTodo(idTarea: any) {
    this.cargando = true;

    forkJoin({
      areas: this.areasService.obtenerTodos().pipe(catchError(() => of({ body: [] }))),
      grupos: this.gruposService.obtenerTodos().pipe(catchError(() => of({ body: [] }))),
      estudiantes: this.estudiantesService.obtenerActivos().pipe(catchError(() => of({ body: [] }))),
      colaboradores: this.responsablesService.obtenerColaboradores().pipe(catchError(() => of({ body: [] }))),
      tarea: idTarea ? this.tareasService.obtenerById(idTarea) : of(null),
      jornada: idTarea ? of(null) : this.jornadaService.obtenerVigente().pipe(catchError(() => of(null))),
    }).subscribe({
      next: (r: any) => {
        this.areas = r.areas?.body || [];
        this.grupos = r.grupos?.body || [];
        this.estudiantes = this.armarEstudiantes(r.estudiantes?.body || []);
        this.colaboradores = (r.colaboradores?.body || []).map((c: any) => ({
          id: c.id,
          nombre: c.sobrenombre ? `${c.nombre} (${c.sobrenombre})` : c.nombre,
          rol: c.rol_nombre || '',
          seleccionado: false,
        }));

        if (r.tarea) {
          this.llenarTarea(r.tarea.body);
        } else {
          // Fecha por defecto: la de la jornada vigente (hoy, o el siguiente
          // día hábil si ya terminó la jornada), igual que en solicitudes.
          const hoy = this.hoyIso();
          this.model.fecha_asignacion = r.jornada?.body?.fecha_actual || hoy;
          this.model.fecha_entrega = this.model.fecha_asignacion;
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  /**
   * Los endpoints de estudiantes devuelven filas de estudiantes_x_grupos: se
   * deja una por estudiante.
   */
  armarEstudiantes(filas: any[]): EstudianteSeleccionable[] {
    const mapa = new Map<string, EstudianteSeleccionable>();
    filas.forEach((fila: any) => {
      if (!fila.id_estudiante || mapa.has(fila.id_estudiante)) {
        return;
      }
      mapa.set(fila.id_estudiante, {
        id: fila.id_estudiante,
        nombre: [fila.primer_nombre, fila.segundo_nombre, fila.primer_apellido, fila.segundo_apellido]
          .filter(p => !!p).join(' '),
        id_grupo: fila.id_grupo || '',
        grupo: fila.nombre_grupo || '',
        seleccionado: false,
      });
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  llenarTarea(tarea: any) {
    if (!tarea) {
      return;
    }
    this.model = {
      id: tarea.id,
      titulo: tarea.titulo || '',
      descripcion: tarea.descripcion || '',
      id_area_academica: tarea.id_area_academica || '',
      fecha_asignacion: tarea.fecha_asignacion || '',
      fecha_entrega: tarea.fecha_entrega || '',
      criterio_texto: tarea.criterio_texto || '',
      permite_respuestas_acudientes: tarea.permite_respuestas_acudientes == 1,
      publicada: tarea.publicada == 1,
    };
    this.adjuntos = tarea.adjuntos || [];

    const asignados = new Set((tarea.estudiantes || []).map((id: any) => String(id)));
    this.estudiantes.forEach(e => e.seleccionado = asignados.has(String(e.id)));

    const responsables = new Set((tarea.responsables || []).map((id: any) => String(id)));
    this.colaboradores.forEach(c => c.seleccionado = responsables.has(String(c.id)));

    this.titulo = 'Editar Tarea: ' + this.model.titulo;
  }

  // ---------------------------------------------------------------------
  // Destinatarios
  // ---------------------------------------------------------------------

  get estudiantesVisibles(): EstudianteSeleccionable[] {
    const filtro = this.filtroEstudiante.trim().toLowerCase();
    return this.estudiantes.filter(e =>
      (!this.filtroGrupo || String(e.id_grupo) === String(this.filtroGrupo)) &&
      (!filtro || e.nombre.toLowerCase().includes(filtro))
    );
  }

  get totalSeleccionados(): number {
    return this.estudiantes.filter(e => e.seleccionado).length;
  }

  marcarVisibles(valor: boolean) {
    this.estudiantesVisibles.forEach(e => e.seleccionado = valor);
    this.sugerirCriterio();
  }

  alternarEstudiante(estudiante: EstudianteSeleccionable) {
    estudiante.seleccionado = !estudiante.seleccionado;
    this.sugerirCriterio();
  }

  /**
   * Arma el texto "a quién va dirigida" a partir de lo marcado: todos, un
   * grupo completo, varios grupos o una cantidad de estudiantes. Solo lo
   * llena si el usuario no lo ha escrito a mano.
   */
  sugerirCriterio() {
    const seleccionados = this.estudiantes.filter(e => e.seleccionado);
    if (seleccionados.length === 0) {
      this.model.criterio_texto = '';
      return;
    }
    if (seleccionados.length === this.estudiantes.length) {
      this.model.criterio_texto = 'Todos los estudiantes';
      return;
    }

    const gruposCompletos: string[] = [];
    let todosEnGruposCompletos = true;
    const porGrupo = new Map<string, EstudianteSeleccionable[]>();
    seleccionados.forEach(e => {
      if (!porGrupo.has(e.id_grupo)) porGrupo.set(e.id_grupo, []);
      porGrupo.get(e.id_grupo)!.push(e);
    });
    porGrupo.forEach((lista, idGrupo) => {
      const total = this.estudiantes.filter(e => e.id_grupo === idGrupo).length;
      if (lista.length === total && lista[0].grupo) {
        gruposCompletos.push(lista[0].grupo);
      } else {
        todosEnGruposCompletos = false;
      }
    });

    this.model.criterio_texto = todosEnGruposCompletos
      ? (gruposCompletos.length === 1 ? 'Grupo ' : 'Grupos ') + gruposCompletos.join(', ')
      : `${seleccionados.length} estudiante(s)`;
  }

  // ---------------------------------------------------------------------
  // Responsables
  // ---------------------------------------------------------------------

  get colaboradoresVisibles(): ColaboradorSeleccionable[] {
    const filtro = this.filtroColaborador.trim().toLowerCase();
    return this.colaboradores.filter(c => !filtro || c.nombre.toLowerCase().includes(filtro) || c.rol.toLowerCase().includes(filtro));
  }

  get totalResponsables(): number {
    return this.colaboradores.filter(c => c.seleccionado).length;
  }

  iniciales(nombre: string): string {
    return nombre.split(' ').filter(p => !!p).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  // ---------------------------------------------------------------------
  // Adjuntos
  // ---------------------------------------------------------------------

  seleccionarArchivos(event: any) {
    const archivos: FileList = event.target.files;
    for (let i = 0; i < archivos.length; i++) {
      this.archivosNuevos.push(archivos[i]);
    }
    event.target.value = '';
  }

  quitarArchivoNuevo(indice: number) {
    this.archivosNuevos.splice(indice, 1);
  }

  async eliminarAdjunto(adjunto: any) {
    const result = await Swal.fire({
      title: '¿Quitar el archivo?',
      text: adjunto.nombre_archivo,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) {
      return;
    }
    this.adjuntosService.eliminar({ id: adjunto.id }).subscribe({
      next: () => this.adjuntos = this.adjuntos.filter(a => a.id !== adjunto.id),
      error: () => { }
    });
  }

  tamanio(bytes: number): string {
    if (!bytes) return '';
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  // ---------------------------------------------------------------------
  // IA
  // ---------------------------------------------------------------------

  mejorarConIa() {
    const texto = (this.model.descripcion || '').trim();
    if (!texto) {
      Swal.fire('Escribe algo primero', 'Escribe una idea de la tarea y la IA la redacta mejor.', 'info');
      return;
    }
    this.mejorando = true;
    const contexto = 'Son las instrucciones de una tarea para la casa que un jardín infantil envía a los acudientes. '
      + 'Deben ser breves, claras y amables, dirigidas a los papás.';

    this.iaMejorarTextoService.mejorarTexto({ texto, contexto }).subscribe({
      next: (respuesta: any) => {
        const mejorado = respuesta?.texto_mejorado || '';
        if (mejorado) {
          this.descripcionAnterior = this.model.descripcion;
          this.model.descripcion = mejorado;
        }
        this.mejorando = false;
      },
      error: () => { this.mejorando = false; }
    });
  }

  deshacerMejora() {
    if (this.descripcionAnterior !== null) {
      this.model.descripcion = this.descripcionAnterior;
      this.descripcionAnterior = null;
    }
  }

  // ---------------------------------------------------------------------
  // Guardar
  // ---------------------------------------------------------------------

  validar(): string | null {
    if (!this.model.titulo.trim()) return 'Escribe el título de la tarea';
    if (!this.model.fecha_asignacion || !this.model.fecha_entrega) return 'Indica la fecha de asignación y la de entrega';
    if (this.model.fecha_entrega < this.model.fecha_asignacion) return 'La fecha de entrega no puede ser anterior a la de asignación';
    if (this.totalSeleccionados === 0) return 'Selecciona al menos un estudiante';
    return null;
  }

  /**
   * @param publicar true para publicar después de guardar (solo borradores)
   */
  async guardar(publicar: boolean) {
    this.submitted = true;
    const error = this.validar();
    if (error) {
      Swal.fire('Falta información', error, 'warning');
      return;
    }

    if (this.esEdicion && this.model.publicada) {
      const result = await Swal.fire({
        title: '¿Guardar los cambios?',
        text: 'La tarea ya está publicada: los acudientes recibirán un aviso de que se actualizó.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar'
      });
      if (!result.isConfirmed) return;
    }

    const datos = {
      id: this.model.id,
      titulo: this.model.titulo.trim(),
      descripcion: this.model.descripcion,
      id_area_academica: this.model.id_area_academica || null,
      fecha_asignacion: this.model.fecha_asignacion,
      fecha_entrega: this.model.fecha_entrega,
      criterio_texto: this.model.criterio_texto,
      permite_respuestas_acudientes: this.model.permite_respuestas_acudientes ? 1 : 0,
      estudiantes: this.estudiantes.filter(e => e.seleccionado).map(e => e.id),
      responsables: this.colaboradores.filter(c => c.seleccionado).map(c => c.id),
    };

    this.guardando = true;
    const peticion = this.esEdicion ? this.tareasService.actualizar(datos) : this.tareasService.crear(datos);

    peticion.subscribe({
      next: (respuesta: any) => {
        const id = respuesta?.id || this.model.id;
        this.subirArchivos(id, () => {
          if (publicar && !this.model.publicada) {
            this.tareasService.publicar({ id: id }).subscribe({
              next: () => this.terminar('Tarea publicada', 'Los acudientes ya pueden verla.'),
              error: () => this.terminar('Tarea guardada', 'Quedó en borrador porque no se pudo publicar.')
            });
          } else {
            this.terminar('Tarea guardada', this.model.publicada ? 'Se avisó a los acudientes del cambio.' : 'Quedó en borrador.');
          }
        });
      },
      error: () => { this.guardando = false; }
    });
  }

  /** Sube los archivos nuevos uno tras otro y luego sigue. */
  subirArchivos(idTarea: any, alTerminar: () => void) {
    if (this.archivosNuevos.length === 0) {
      alTerminar();
      return;
    }
    const subidas = this.archivosNuevos.map(archivo =>
      this.adjuntosService.subir(idTarea, archivo).pipe(catchError(() => of(null)))
    );
    forkJoin(subidas).subscribe(resultados => {
      const fallidos = resultados.filter(r => r === null).length;
      if (fallidos > 0) {
        Swal.fire('Atención', `${fallidos} archivo(s) no se pudieron subir.`, 'warning');
      }
      this.archivosNuevos = [];
      alTerminar();
    });
  }

  terminar(titulo: string, texto: string) {
    this.guardando = false;
    Swal.fire({ title: titulo, text: texto, icon: 'success', timer: 2200, showConfirmButton: false });
    this.router.navigate([this.regresar]);
  }

  cancelar() {
    this.router.navigate([this.regresar]);
  }

  private hoyIso(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }
}
