import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ModalPlantillasComponent } from './modal-plantillas/modal-plantillas.component';
import { NotificacionesService } from '../../../../services/notificaciones.service';
import { NotificacionesCategoriasService } from '../../../../services/notificaciones-categorias.service';
import { NotificacionesRespuestasTiposService } from '../../../../services/notificaciones-respuestas-tipos.service';
import { NotificacionesAdjuntosService } from '../../../../services/notificaciones-adjuntos.service';
import { NotificacionesDestinatariosService } from '../../../../services/notificaciones-destinatarios.service';
import { NotificacionesPlantillasService } from '../../../../services/notificaciones-plantillas.service';
import { IaMejorarTextoService } from '../../../../services/ia-mejorar-texto.service';
import { GruposService } from '../../../../services/grupos.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { ConfiguracionGlobalService } from '../../../../services/configuracion-global.service';
import Swal from 'sweetalert2';

interface AcudienteSeleccionable {
  id_estudiante: string;
  id_persona: string;
  nombre: string;
  id_tipo_acudiente: number | null;
  tipo_nombre: string;
  tipo_icono: string;
  tieneUsuario: boolean;
  seleccionado: boolean;
}

interface EstudianteConAcudientes {
  id: string;
  nombre: string;
  grupo: string;
  acudientes: AcudienteSeleccionable[];
}

interface RolFiltro {
  id: number | null;
  nombre: string;
  icono: string;
  marcado: boolean;
}

@Component({
  selector: 'app-crear-notificacion',
  templateUrl: './crear-notificacion.component.html',
  styleUrl: './crear-notificacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, ModalPlantillasComponent]
})
export class CrearNotificacionComponent implements OnInit {

  titulo = "Crear Notificación";
  accion: string = "";
  regresar = '/operaciones/notificaciones-envio';
  editable: boolean = true;
  submitted: boolean = false;

  /** Valor del selector de alcance que representa a toda la institución. */
  readonly ALCANCE_TODOS = 'TODOS';

  public cargando = false;
  public cargandoAcudientes = false;
  public enviando = false;
  public mejorando = false;
  public cuerpoAnterior: string | null = null;

  public categorias: any[] = [];
  public tiposRespuesta: any[] = [];
  public grupos: any[] = [];

  public alcance = '';
  public filtroTexto = '';
  public arbol: EstudianteConAcudientes[] = [];
  public roles: RolFiltro[] = [];

  public archivoSeleccionado: File | null = null;
  public mostrarModalPlantillas = false;

  // Acuses de la notificación, solo cuando se está editando una ya enviada.
  public resumenAcuses: any = null;
  public destinatariosEnviados: any[] = [];
  public filtroAcuses: string = 'todos';
  public cargandoAcuses = false;

  // Pestañas del formulario. Solo se muestran al editar, que es cuando
  // ademas del contenido hay acuses que revisar.
  public pestanaActiva: string = 'datos';
  public menuMovilAbierto: boolean = false;

  model = {
    id: null,
    titulo: '',
    cuerpo: '',
    id_categoria: '',
    id_respuesta_tipo: '',
    id_plantilla: null,
    criterio_texto: '',
    incluir_whatsapp: true,
    whatsapp_numero: '',
    enviar_correo: false
  } as any;

  constructor(
    private notificacionesService: NotificacionesService,
    private categoriasService: NotificacionesCategoriasService,
    private tiposRespuestaService: NotificacionesRespuestasTiposService,
    private adjuntosService: NotificacionesAdjuntosService,
    private destinatariosService: NotificacionesDestinatariosService,
    private plantillasService: NotificacionesPlantillasService,
    private iaMejorarTextoService: IaMejorarTextoService,
    private gruposService: GruposService,
    private estudiantesService: EstudiantesService,
    private configuracionGlobalService: ConfiguracionGlobalService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarNumeroWhatsappPorDefecto();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Notificación";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Notificación";
        this.editable = true;
        this.cargarNotificacion(id);
      } else if (this.accion === 'reenviar') {
        this.titulo = "Reenviar Notificación";
        this.editable = true;
        this.cargarNotificacion(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Notificación";
        this.editable = false;
        this.cargarNotificacion(id);
      }
    });
  }

  /**
   * En 'editar' se corrige una notificación ya enviada: los destinatarios y
   * sus respuestas no se tocan, porque los acuses registrados se refieren a
   * ese mensaje. En 'reenviar' se toma el texto como base pero se vuelven a
   * escoger destinatarios, así que el id no se conserva.
   */
  get esEdicion(): boolean {
    return this.accion === 'editar';
  }

  cargarNotificacion(id: any) {
    this.notificacionesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        const notificacion = Array.isArray(body) ? body[0] : body;

        if (!notificacion) {
          return;
        }

        this.model.id = this.esEdicion ? notificacion.id : null;
        this.model.titulo = notificacion.titulo || '';
        this.model.cuerpo = notificacion.cuerpo || '';
        this.model.id_categoria = notificacion.id_categoria || '';
        this.model.id_respuesta_tipo = notificacion.id_respuesta_tipo || '';
        this.model.id_plantilla = notificacion.id_plantilla || null;
        this.model.criterio_texto = notificacion.criterio_texto || '';
        this.model.incluir_whatsapp = notificacion.incluir_whatsapp == 1;
        this.model.whatsapp_numero = notificacion.whatsapp_numero || this.model.whatsapp_numero;

        this.titulo = (this.esEdicion ? "Editar Notificación: " : "Reenviar: ") + this.model.titulo;

        // Al editar interesa ver a quién llegó y quién la leyó: es la razón
        // más común para abrir una notificación ya enviada.
        if (this.esEdicion) {
          this.cargarAcuses(notificacion.id);
        }
      },
      error: (error: any) => {
        console.error("Error al cargar notificación", error);
        Swal.fire('Error', 'No se pudo cargar la notificación', 'error');
      }
    });
  }

  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  cargarAcuses(idNotificacion: any) {
    this.cargandoAcuses = true;

    this.destinatariosService.obtenerResumen(idNotificacion).subscribe({
      next: (response: any) => { this.resumenAcuses = response.body || null; },
      error: (error: any) => { console.error("Error al cargar el resumen", error); }
    });

    this.destinatariosService.obtenerByNotificacion(idNotificacion).subscribe({
      next: (response: any) => {
        this.destinatariosEnviados = response.body || [];
        this.cargandoAcuses = false;
      },
      error: (error: any) => {
        console.error("Error al cargar destinatarios", error);
        this.cargandoAcuses = false;
      }
    });
  }

  get destinatariosFiltrados(): any[] {
    if (this.filtroAcuses === 'sin_leer') {
      return this.destinatariosEnviados.filter(d => !d.fecha_lectura);
    }
    if (this.filtroAcuses === 'sin_responder') {
      return this.destinatariosEnviados.filter(d => !d.id_respuesta_opcion);
    }
    return this.destinatariosEnviados;
  }

  nombreAcudiente(destinatario: any): string {
    return [destinatario.acudiente_primer_nombre, destinatario.acudiente_primer_apellido,
            destinatario.acudiente_segundo_apellido].filter(p => !!p).join(' ');
  }

  nombreEstudiante(destinatario: any): string {
    return [destinatario.estudiante_primer_nombre, destinatario.estudiante_primer_apellido]
      .filter(p => !!p).join(' ');
  }

  porcentaje(parte: number, total: number): number {
    if (!total) return 0;
    return Math.round((parte / total) * 100);
  }

  cargarCatalogos() {
    this.categoriasService.obtenerActivos().subscribe({
      next: (response: any) => { this.categorias = response.body || []; },
      error: (error: any) => { console.error("Error al cargar categorías", error); }
    });

    this.tiposRespuestaService.obtenerActivosConOpciones().subscribe({
      next: (response: any) => { this.tiposRespuesta = response.body || []; },
      error: (error: any) => { console.error("Error al cargar tipos de respuesta", error); }
    });

    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => { this.grupos = response.body || []; },
      error: (error: any) => { console.error("Error al cargar grupos", error); }
    });
  }

  /**
   * El número del parámetro global es solo el valor inicial. Queda editable
   * para poder pedir que contesten a otra persona, por ejemplo la profesora
   * de un extracurricular.
   */
  cargarNumeroWhatsappPorDefecto() {
    this.configuracionGlobalService.obtenerByClave('notificaciones_whatsapp_numero_default').subscribe({
      next: (response: any) => {
        const dato = Array.isArray(response.body) ? response.body[0] : response.body;
        if (!this.model.whatsapp_numero) {
          this.model.whatsapp_numero = dato?.valor_texto || '';
        }
      },
      error: () => { /* sin parámetro cargado el campo queda vacío */ }
    });
  }

  cambiarAlcance() {
    this.arbol = [];
    this.roles = [];

    if (!this.alcance) {
      return;
    }

    this.cargando = true;

    const peticion = this.alcance === this.ALCANCE_TODOS
      ? this.estudiantesService.obtenerActivos()
      : this.estudiantesService.obtenerTodosXGrupo(this.alcance);

    peticion.subscribe({
      next: (response: any) => {
        const filas = response.body || [];
        this.cargando = false;
        this.cargarAcudientes(this.extraerEstudiantes(filas));
      },
      error: (error: any) => {
        console.error("Error al cargar estudiantes", error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
      }
    });
  }

  /**
   * Los endpoints de estudiantes devuelven filas de estudiantes_x_grupos: su
   * 'id' es el de la matrícula, no el del estudiante, y un estudiante puede
   * aparecer más de una vez si tiene varias matrículas activas.
   */
  extraerEstudiantes(filas: any[]): Map<string, { nombre: string, grupo: string }> {
    const mapa = new Map<string, { nombre: string, grupo: string }>();

    filas.forEach((fila: any) => {
      const idEstudiante = fila.id_estudiante;
      if (!idEstudiante || mapa.has(idEstudiante)) {
        return;
      }
      mapa.set(idEstudiante, {
        nombre: this.armarNombrePersona(fila),
        grupo: fila.nombre_grupo || '',
      });
    });

    return mapa;
  }

  /**
   * Le pide al backend los acudientes habilitados de esos estudiantes. Es el
   * mismo endpoint de previsualización, que además del conteo devuelve el
   * detalle con el rol de cada acudiente.
   */
  cargarAcudientes(estudiantes: Map<string, { nombre: string, grupo: string }>) {
    const ids = Array.from(estudiantes.keys());

    if (ids.length === 0) {
      Swal.fire('Advertencia', 'No hay estudiantes activos para ese alcance', 'warning');
      return;
    }

    this.cargandoAcudientes = true;

    this.notificacionesService.previsualizarDestinatarios(ids).subscribe({
      next: (response: any) => {
        this.armarArbol(estudiantes, response?.destinatarios || []);
        this.cargandoAcudientes = false;
      },
      error: (error: any) => {
        console.error("Error al cargar acudientes", error);
        this.cargandoAcudientes = false;
        Swal.fire('Error', 'No se pudieron cargar los acudientes', 'error');
      }
    });
  }

  armarArbol(estudiantes: Map<string, { nombre: string, grupo: string }>, destinatarios: any[]) {
    const porEstudiante = new Map<string, AcudienteSeleccionable[]>();
    const rolesVistos = new Map<string, RolFiltro>();

    destinatarios.forEach((fila: any) => {
      const acudiente: AcudienteSeleccionable = {
        id_estudiante: fila.id_estudiante,
        id_persona: fila.id_persona,
        nombre: this.armarNombreAcudiente(fila),
        id_tipo_acudiente: fila.id_tipo_acudiente ?? null,
        tipo_nombre: fila.tipo_acudiente_nombre || 'Sin rol',
        tipo_icono: fila.tipo_acudiente_icono || '',
        tieneUsuario: !!fila.id_usuario,
        seleccionado: true,
      };

      if (!porEstudiante.has(acudiente.id_estudiante)) {
        porEstudiante.set(acudiente.id_estudiante, []);
      }
      porEstudiante.get(acudiente.id_estudiante)?.push(acudiente);

      const clave = String(acudiente.id_tipo_acudiente);
      if (!rolesVistos.has(clave)) {
        rolesVistos.set(clave, {
          id: acudiente.id_tipo_acudiente,
          nombre: acudiente.tipo_nombre,
          icono: acudiente.tipo_icono,
          marcado: true,
        });
      }
    });

    this.arbol = [];

    estudiantes.forEach((datos, idEstudiante) => {
      const acudientes = porEstudiante.get(idEstudiante) || [];
      if (acudientes.length === 0) {
        return;
      }
      this.arbol.push({
        id: idEstudiante,
        nombre: datos.nombre,
        grupo: datos.grupo,
        acudientes: acudientes,
      });
    });

    this.arbol.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.roles = Array.from(rolesVistos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  armarNombrePersona(fila: any): string {
    return [fila.primer_nombre, fila.segundo_nombre, fila.primer_apellido, fila.segundo_apellido]
      .filter(p => !!p).join(' ').trim();
  }

  armarNombreAcudiente(fila: any): string {
    return [fila.acudiente_primer_nombre, fila.acudiente_segundo_nombre,
            fila.acudiente_primer_apellido, fila.acudiente_segundo_apellido]
      .filter(p => !!p).join(' ').trim();
  }

  /** Ids de los roles marcados arriba. Gobierna qué se ve y qué se envía. */
  get rolesActivos(): Set<string> {
    return new Set(this.roles.filter(r => r.marcado).map(r => String(r.id)));
  }

  /**
   * Acudientes de un estudiante que pertenecen a algún rol marcado. Al
   * desmarcar un rol sus acudientes desaparecen de la lista y quedan
   * deseleccionados, de modo que lo que se ve es lo que se va a enviar.
   */
  acudientesVisibles(estudiante: EstudianteConAcudientes): AcudienteSeleccionable[] {
    const activos = this.rolesActivos;
    return estudiante.acudientes.filter(a => activos.has(String(a.id_tipo_acudiente)));
  }

  get arbolVisible(): EstudianteConAcudientes[] {
    return this.arbol.filter(e => this.acudientesVisibles(e).length > 0);
  }

  get arbolFiltrado(): EstudianteConAcudientes[] {
    const filtro = this.filtroTexto.trim().toLowerCase();
    const visibles = this.arbolVisible;

    if (!filtro) {
      return visibles;
    }

    return visibles.filter(e =>
      e.nombre.toLowerCase().includes(filtro) ||
      this.acudientesVisibles(e).some(a => a.nombre.toLowerCase().includes(filtro))
    );
  }

  get seleccionados(): AcudienteSeleccionable[] {
    const resultado: AcudienteSeleccionable[] = [];
    this.arbolVisible.forEach(e => this.acudientesVisibles(e).forEach(a => {
      if (a.seleccionado) {
        resultado.push(a);
      }
    }));
    return resultado;
  }

  get totalAcudientes(): number {
    return this.arbolVisible.reduce((suma, e) => suma + this.acudientesVisibles(e).length, 0);
  }

  get totalEstudiantesVisibles(): number {
    return this.arbolVisible.length;
  }

  get estudiantesAlcanzados(): number {
    return this.arbolVisible.filter(e => this.acudientesVisibles(e).some(a => a.seleccionado)).length;
  }

  get sinUsuario(): number {
    return this.seleccionados.filter(a => !a.tieneUsuario).length;
  }

  alternarRol(rol: RolFiltro) {
    this.arbol.forEach(e => e.acudientes.forEach(a => {
      if (a.id_tipo_acudiente === rol.id) {
        a.seleccionado = rol.marcado;
      }
    }));
  }

  marcarTodos(marcar: boolean) {
    // 'Todos' reactiva los roles ocultos: si no, marcar todo dejaría fuera a
    // los que el usuario había filtrado y el conteo no cuadraría.
    if (marcar) {
      this.roles.forEach(r => r.marcado = true);
    }
    this.arbol.forEach(e => e.acudientes.forEach(a => a.seleccionado = marcar));
  }

  estudianteCompleto(estudiante: EstudianteConAcudientes): boolean {
    const visibles = this.acudientesVisibles(estudiante);
    return visibles.length > 0 && visibles.every(a => a.seleccionado);
  }

  alternarEstudiante(estudiante: EstudianteConAcudientes, marcar: boolean) {
    this.acudientesVisibles(estudiante).forEach(a => a.seleccionado = marcar);
  }

  get opcionesDelTipoSeleccionado(): any[] {
    const tipo = this.tiposRespuesta.find(t => t.id === this.model.id_respuesta_tipo);
    return tipo?.opciones || [];
  }

  seleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  quitarArchivo() {
    this.archivoSeleccionado = null;
  }

  abrirPlantillas() {
    this.mostrarModalPlantillas = true;
  }

  cerrarPlantillas() {
    this.mostrarModalPlantillas = false;
  }

  /**
   * Aplica la plantilla al formulario. Solo pisa los campos que la plantilla
   * define; los destinatarios ya escogidos se conservan.
   */
  aplicarPlantilla(datos: any) {
    this.model.id_plantilla = datos.id_plantilla || null;
    this.model.titulo = datos.titulo || '';
    this.model.cuerpo = datos.cuerpo || '';

    if (datos.id_categoria) {
      this.model.id_categoria = datos.id_categoria;
    }

    this.model.id_respuesta_tipo = datos.id_respuesta_tipo || '';
    this.model.incluir_whatsapp = !!datos.incluir_whatsapp;
    this.mostrarModalPlantillas = false;
  }

  /**
   * Mejora la redacción del mensaje con IA.
   *
   * Si la sugerencia perdió algún marcador entre llaves se descarta: el texto
   * se vería mejor pero las variables ya no se resolverían por familia.
   */
  mejorarConIa() {
    const texto = (this.model.cuerpo || '').trim();

    if (!texto) {
      Swal.fire('Advertencia', 'Escriba primero el mensaje que quiere mejorar', 'warning');
      return;
    }

    this.mejorando = true;
    const variablesAntes = this.plantillasService.extraerVariables(texto);

    const contexto = 'Es una notificación que un jardín infantil envía a los acudientes por la aplicación. '
      + 'Debe ser breve, clara y amable. '
      + 'No modifiques ni traduzcas los textos entre llaves como {nombre_estudiante}: '
      + 'son marcadores que el sistema reemplaza y deben quedar escritos exactamente igual.';

    this.iaMejorarTextoService.mejorarTexto({ texto, contexto }).subscribe({
      next: (response: any) => {
        const mejorado = response?.texto_mejorado || '';
        this.mejorando = false;

        if (!mejorado) {
          Swal.fire('Error', 'La IA no devolvió una sugerencia', 'error');
          return;
        }

        const variablesDespues = this.plantillasService.extraerVariables(mejorado);
        const perdidas = variablesAntes.filter(v => !variablesDespues.includes(v));

        if (perdidas.length > 0) {
          Swal.fire(
            'Sugerencia descartada',
            'La sugerencia eliminó las variables ' + perdidas.join(', ') + '. No se aplicó para no dañar el mensaje.',
            'warning'
          );
          return;
        }

        this.cuerpoAnterior = this.model.cuerpo;
        this.model.cuerpo = mejorado;
      },
      error: (error: any) => {
        console.error("Error al mejorar texto", error);
        this.mejorando = false;
        Swal.fire('Error', 'No se pudo mejorar el texto', 'error');
      }
    });
  }

  deshacerMejora() {
    if (this.cuerpoAnterior === null) return;
    this.model.cuerpo = this.cuerpoAnterior;
    this.cuerpoAnterior = null;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.titulo || this.model.titulo.trim() === '') {
      Swal.fire('Advertencia', 'El título es obligatorio', 'warning');
      return;
    }

    if (!this.model.cuerpo || this.model.cuerpo.trim() === '') {
      Swal.fire('Advertencia', 'El mensaje es obligatorio', 'warning');
      return;
    }

    if (!this.model.id_categoria) {
      Swal.fire('Advertencia', 'La categoría es obligatoria', 'warning');
      return;
    }

    const elegidos = this.seleccionados;

    if (elegidos.length === 0 && !this.esEdicion) {
      Swal.fire('Advertencia', 'Seleccione al menos un acudiente', 'warning');
      return;
    }

    if (this.model.incluir_whatsapp && !(this.model.whatsapp_numero || '').trim()) {
      Swal.fire('Advertencia', 'Indique el número de WhatsApp o desactive el botón de respuesta', 'warning');
      return;
    }

    const data = {
      titulo: this.model.titulo.trim(),
      cuerpo: this.model.cuerpo.trim(),
      id_categoria: this.model.id_categoria,
      id_respuesta_tipo: this.model.id_respuesta_tipo || null,
      id_plantilla: this.model.id_plantilla,
      criterio_texto: (this.model.criterio_texto || '').trim(),
      incluir_whatsapp: this.model.incluir_whatsapp ? 1 : 0,
      whatsapp_numero: (this.model.whatsapp_numero || '').trim(),
      enviar_correo: this.model.enviar_correo ? 1 : 0,
      estudiantes: Array.from(new Set(elegidos.map(a => a.id_estudiante))),
      destinatarios: elegidos.map(a => ({
        id_estudiante: a.id_estudiante,
        id_persona: a.id_persona,
      })),
    } as any;

    this.enviando = true;

    if (this.esEdicion) {
      data.id = this.model.id;
      this.notificacionesService.actualizar(data).subscribe({
        next: (response: any) => {
          this.enviando = false;
          Swal.fire('Éxito', 'Notificación actualizada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al actualizar notificación", error);
          this.enviando = false;
          Swal.fire('Error', 'No se pudo actualizar la notificación', 'error');
        }
      });
      return;
    }

    this.notificacionesService.crear(data).subscribe({
      next: (response: any) => {
        const idNotificacion = response?.id;

        if (this.archivoSeleccionado && idNotificacion) {
          this.subirAdjunto(idNotificacion, response);
          return;
        }

        this.terminarEnvio(response);
      },
      error: (error: any) => {
        console.error("Error al crear notificación", error);
        this.enviando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo enviar la notificación', 'error');
      }
    });
  }

  /**
   * El adjunto se sube después de crear la notificación porque necesita su
   * id. Si la subida falla, la notificación ya salió: se avisa sin borrarla.
   */
  subirAdjunto(idNotificacion: string, respuestaEnvio: any) {
    this.adjuntosService.subir(idNotificacion, this.archivoSeleccionado as File).subscribe({
      next: () => { this.terminarEnvio(respuestaEnvio); },
      error: (error: any) => {
        console.error("Error al subir adjunto", error);
        this.enviando = false;
        Swal.fire(
          'Enviada con advertencia',
          'La notificación se envió, pero el adjunto no se pudo cargar.',
          'warning'
        );
        this.router.navigate([this.regresar]);
      }
    });
  }

  terminarEnvio(respuesta: any) {
    const total = respuesta?.total_destinatarios ?? 0;
    const enviadas = respuesta?.push?.enviadas ?? 0;
    this.enviando = false;

    Swal.fire(
      'Enviada',
      `Notificación enviada a ${total} acudiente(s). Avisos push entregados: ${enviadas}.`,
      'success'
    );

    this.router.navigate([this.regresar]);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
