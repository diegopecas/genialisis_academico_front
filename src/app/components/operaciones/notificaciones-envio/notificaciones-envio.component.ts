import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { NotificacionesCategoriasService } from '../../../services/notificaciones-categorias.service';
import { NotificacionesRespuestasTiposService } from '../../../services/notificaciones-respuestas-tipos.service';
import { NotificacionesAdjuntosService } from '../../../services/notificaciones-adjuntos.service';
import { GruposService } from '../../../services/grupos.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { ConfiguracionGlobalService } from '../../../services/configuracion-global.service';

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
  selector: 'app-notificaciones-envio',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './notificaciones-envio.component.html',
  styleUrl: './notificaciones-envio.component.scss'
})
export class NotificacionesEnvioComponent implements OnInit, OnDestroy {
  titulo = 'Envío de Notificaciones';

  /** Valor del selector de alcance que representa a toda la institución. */
  readonly ALCANCE_TODOS = 'TODOS';

  public cargando = false;
  public cargandoAcudientes = false;
  public enviando = false;
  public mensajeError = '';
  public mensajeExito = '';

  public categorias: any[] = [];
  public tiposRespuesta: any[] = [];
  public grupos: any[] = [];

  public alcance = '';
  public filtroTexto = '';
  public arbol: EstudianteConAcudientes[] = [];
  public roles: RolFiltro[] = [];

  public form = {
    titulo: '',
    cuerpo: '',
    id_categoria: '',
    id_respuesta_tipo: '',
    criterio_texto: '',
    incluir_whatsapp: true,
    whatsapp_numero: '',
    enviar_correo: false,
  };

  public archivoSeleccionado: File | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private notificacionesService: NotificacionesService,
    private categoriasService: NotificacionesCategoriasService,
    private tiposRespuestaService: NotificacionesRespuestasTiposService,
    private adjuntosService: NotificacionesAdjuntosService,
    private gruposService: GruposService,
    private estudiantesService: EstudiantesService,
    private configuracionGlobalService: ConfiguracionGlobalService,
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarNumeroWhatsappPorDefecto();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private cargarCatalogos(): void {
    this.cargando = true;

    this.subscriptions.push(
      this.categoriasService.obtenerActivos().subscribe({
        next: (respuesta: any) => { this.categorias = respuesta.body || []; },
        error: () => { this.mensajeError = 'No se pudieron cargar las categorías'; }
      })
    );

    this.subscriptions.push(
      this.tiposRespuestaService.obtenerActivosConOpciones().subscribe({
        next: (respuesta: any) => { this.tiposRespuesta = respuesta.body || []; },
        error: () => { this.mensajeError = 'No se pudieron cargar los tipos de respuesta'; }
      })
    );

    this.subscriptions.push(
      this.gruposService.obtenerTodos().subscribe({
        next: (respuesta: any) => {
          this.grupos = respuesta.body || [];
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No se pudieron cargar los grupos';
          this.cargando = false;
        }
      })
    );
  }

  /**
   * El numero del parametro global es solo el valor inicial. Queda editable
   * para poder pedir que contesten a otra persona, por ejemplo la profesora
   * de un extracurricular.
   */
  private cargarNumeroWhatsappPorDefecto(): void {
    this.subscriptions.push(
      this.configuracionGlobalService.obtenerByClave('notificaciones_whatsapp_numero_default').subscribe({
        next: (respuesta: any) => {
          const dato = Array.isArray(respuesta.body) ? respuesta.body[0] : respuesta.body;
          this.form.whatsapp_numero = dato?.valor_texto || '';
        },
        error: () => { /* sin parametro cargado el campo queda vacio */ }
      })
    );
  }

  cambiarAlcance(): void {
    this.arbol = [];
    this.roles = [];
    this.mensajeError = '';

    if (!this.alcance) {
      return;
    }

    this.cargando = true;

    const peticion = this.alcance === this.ALCANCE_TODOS
      ? this.estudiantesService.obtenerActivos()
      : this.estudiantesService.obtenerTodosXGrupo(this.alcance);

    this.subscriptions.push(
      peticion.subscribe({
        next: (respuesta: any) => {
          const filas = respuesta.body || [];
          this.cargando = false;
          this.cargarAcudientes(this.extraerEstudiantes(filas));
        },
        error: () => {
          this.mensajeError = 'No se pudieron cargar los estudiantes';
          this.cargando = false;
        }
      })
    );
  }

  /**
   * Los endpoints de estudiantes devuelven filas de estudiantes_x_grupos: su
   * 'id' es el de la matricula, no el del estudiante, y un estudiante puede
   * aparecer mas de una vez si tiene varias matriculas activas.
   */
  private extraerEstudiantes(filas: any[]): Map<string, { nombre: string, grupo: string }> {
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
   * mismo endpoint de previsualizacion, que ademas del conteo devuelve el
   * detalle con el rol de cada acudiente.
   */
  private cargarAcudientes(estudiantes: Map<string, { nombre: string, grupo: string }>): void {
    const ids = Array.from(estudiantes.keys());

    if (ids.length === 0) {
      this.mensajeError = 'No hay estudiantes activos para ese alcance';
      return;
    }

    this.cargandoAcudientes = true;

    this.subscriptions.push(
      this.notificacionesService.previsualizarDestinatarios(ids).subscribe({
        next: (respuesta: any) => {
          this.armarArbol(estudiantes, respuesta?.destinatarios || []);
          this.cargandoAcudientes = false;
        },
        error: () => {
          this.mensajeError = 'No se pudieron cargar los acudientes';
          this.cargandoAcudientes = false;
        }
      })
    );
  }

  private armarArbol(estudiantes: Map<string, { nombre: string, grupo: string }>, destinatarios: any[]): void {
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

  private armarNombrePersona(fila: any): string {
    const partes = [
      fila.primer_nombre,
      fila.segundo_nombre,
      fila.primer_apellido,
      fila.segundo_apellido,
    ];
    return partes.filter(p => !!p).join(' ').trim();
  }

  private armarNombreAcudiente(fila: any): string {
    const partes = [
      fila.acudiente_primer_nombre,
      fila.acudiente_segundo_nombre,
      fila.acudiente_primer_apellido,
      fila.acudiente_segundo_apellido,
    ];
    return partes.filter(p => !!p).join(' ').trim();
  }

  /** Ids de los roles marcados arriba. Gobierna que se ve y que se envia. */
  private get rolesActivos(): Set<string> {
    return new Set(this.roles.filter(r => r.marcado).map(r => String(r.id)));
  }

  /**
   * Acudientes de un estudiante que pertenecen a algun rol marcado. Al
   * desmarcar un rol sus acudientes desaparecen de la lista, y el metodo
   * alternarRol ya los deja deseleccionados, de modo que lo que se ve es
   * exactamente lo que se va a enviar.
   */
  acudientesVisibles(estudiante: EstudianteConAcudientes): AcudienteSeleccionable[] {
    const activos = this.rolesActivos;
    return estudiante.acudientes.filter(a => activos.has(String(a.id_tipo_acudiente)));
  }

  /** Estudiantes que conservan al menos un acudiente visible. */
  private get arbolVisible(): EstudianteConAcudientes[] {
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

  /** Marca o desmarca en bloque todos los acudientes de un rol. */
  alternarRol(rol: RolFiltro): void {
    this.arbol.forEach(e => e.acudientes.forEach(a => {
      if (a.id_tipo_acudiente === rol.id) {
        a.seleccionado = rol.marcado;
      }
    }));
  }

  marcarTodos(marcar: boolean): void {
    // 'Todos' reactiva los roles ocultos: si no, marcar todo dejaria fuera a
    // los que el usuario habia filtrado y el conteo no cuadraria con lo que
    // ve en pantalla.
    if (marcar) {
      this.roles.forEach(r => r.marcado = true);
    }

    this.arbol.forEach(e => e.acudientes.forEach(a => a.seleccionado = marcar));
  }

  estudianteCompleto(estudiante: EstudianteConAcudientes): boolean {
    const visibles = this.acudientesVisibles(estudiante);
    return visibles.length > 0 && visibles.every(a => a.seleccionado);
  }

  alternarEstudiante(estudiante: EstudianteConAcudientes, marcar: boolean): void {
    this.acudientesVisibles(estudiante).forEach(a => a.seleccionado = marcar);
  }

  get opcionesDelTipoSeleccionado(): any[] {
    const tipo = this.tiposRespuesta.find(t => t.id === this.form.id_respuesta_tipo);
    return tipo?.opciones || [];
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoSeleccionado = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  enviar(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    const elegidos = this.seleccionados;

    if (!this.form.titulo.trim() || !this.form.cuerpo.trim() || !this.form.id_categoria) {
      this.mensajeError = 'El título, el mensaje y la categoría son obligatorios';
      return;
    }

    if (elegidos.length === 0) {
      this.mensajeError = 'Seleccione al menos un acudiente';
      return;
    }

    if (this.form.incluir_whatsapp && !this.form.whatsapp_numero.trim()) {
      this.mensajeError = 'Indique el número de WhatsApp o desactive el botón de respuesta';
      return;
    }

    this.enviando = true;

    const estudiantes = Array.from(new Set(elegidos.map(a => a.id_estudiante)));

    const cuerpoPeticion = {
      titulo: this.form.titulo.trim(),
      cuerpo: this.form.cuerpo.trim(),
      id_categoria: this.form.id_categoria,
      id_respuesta_tipo: this.form.id_respuesta_tipo || null,
      criterio_texto: this.form.criterio_texto.trim(),
      incluir_whatsapp: this.form.incluir_whatsapp ? 1 : 0,
      whatsapp_numero: this.form.whatsapp_numero.trim(),
      enviar_correo: this.form.enviar_correo ? 1 : 0,
      estudiantes: estudiantes,
      destinatarios: elegidos.map(a => ({
        id_estudiante: a.id_estudiante,
        id_persona: a.id_persona,
      })),
    };

    this.subscriptions.push(
      this.notificacionesService.crear(cuerpoPeticion).subscribe({
        next: (respuesta: any) => {
          const idNotificacion = respuesta?.id;

          if (this.archivoSeleccionado && idNotificacion) {
            this.subirAdjunto(idNotificacion, respuesta);
            return;
          }

          this.terminarEnvio(respuesta);
        },
        error: (error: any) => {
          this.mensajeError = error?.error?.error || 'No se pudo enviar la notificación';
          this.enviando = false;
        }
      })
    );
  }

  /**
   * El adjunto se sube despues de crear la notificacion porque necesita su
   * id. Si la subida falla, la notificacion ya salio: se avisa sin borrarla,
   * el adjunto se puede volver a cargar desde monitoreo.
   */
  private subirAdjunto(idNotificacion: string, respuestaEnvio: any): void {
    this.subscriptions.push(
      this.adjuntosService.subir(idNotificacion, this.archivoSeleccionado as File).subscribe({
        next: () => { this.terminarEnvio(respuestaEnvio); },
        error: (error: any) => {
          this.mensajeExito = 'La notificación se envió, pero el adjunto no se pudo cargar';
          this.mensajeError = error?.error?.error || '';
          this.enviando = false;
          this.limpiarFormulario();
        }
      })
    );
  }

  private terminarEnvio(respuesta: any): void {
    const total = respuesta?.total_destinatarios ?? 0;
    const enviadas = respuesta?.push?.enviadas ?? 0;
    this.mensajeExito = `Notificación enviada a ${total} acudiente(s). Avisos push entregados: ${enviadas}.`;
    this.enviando = false;
    this.limpiarFormulario();
  }

  private limpiarFormulario(): void {
    this.form.titulo = '';
    this.form.cuerpo = '';
    this.form.id_respuesta_tipo = '';
    this.form.criterio_texto = '';
    this.archivoSeleccionado = null;
    this.marcarTodos(false);
  }
}