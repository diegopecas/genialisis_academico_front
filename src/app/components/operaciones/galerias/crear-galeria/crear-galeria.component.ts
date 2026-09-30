import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GaleriasXGruposService } from '../../../../services/galerias-x-grupos.service';
import { GaleriasService } from '../../../../services/galerias.service';
import { GruposService } from '../../../../services/grupos.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';

// CKEditor 5 se carga desde el CDN en index.html, igual que en la creación
// de actividades académicas.
declare var ClassicEditor: any;

@Component({
  selector: 'app-crear-galeria',
  templateUrl: './crear-galeria.component.html',
  styleUrl: './crear-galeria.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearGaleriaComponent implements OnInit, AfterViewInit, OnDestroy {

  /**
   * Cuántas actividades ejecutadas se traen, las más recientes del jardín.
   * Se traen de una vez y los filtros corren sobre esta lista, sin volver
   * al back.
   */
  private readonly LIMITE_ACTIVIDADES = 20;

  /**
   * Tonos suaves para distinguir las áreas en las tarjetas de actividad.
   * Cada área toma siempre el mismo tono (se escoge por su id).
   */
  private readonly TONOS_AREA = ['#7c6cf0', '#2bb0a1', '#e8839b', '#5b9bd5', '#f0a35e', '#9b7ede', '#43aa8b', '#d47fc4'];

  /** Largo máximo de galerias.nombre (varchar 100). */
  readonly MAX_NOMBRE = 100;

  titulo = "Crear Galería";
  accion = "crear";
  regresar = "/operaciones/galerias";
  editable = true;
  submitted = false;

  model = {
    id: null as string | null,
    nombre: '',
    descripcion: '',
    thumbnail: '',
    fecha: '',
    es_publica: 1,
    activo: 1,
    orden: 0,
    id_tarea_x_sprint: null as string | null
  };

  grupos: any[] = [];
  gruposSeleccionados: string[] = [];

  // Selección opcional de una actividad ejecutada para prellenar la galería.
  // Solo al crear. La lista se pide al back cuando el usuario abre el panel
  // y los filtros trabajan sobre ella sin volver a consultar.
  panelActividadesAbierto = false;
  private actividadesCargadas = false;
  filtroGrupoActividad: string = '';
  filtroAreaActividad: string = '';
  filtroTextoActividad: string = '';
  actividades: any[] = [];
  actividadesFiltradas: any[] = [];
  // Opciones de los filtros. Se guardan en arreglos y no se calculan con un
  // getter: si se arman en cada ciclo de pantalla, el <select> redibuja sus
  // opciones, muestra "Todos" y por dentro sigue filtrando por el anterior.
  gruposActividades: { id: string, nombre: string }[] = [];
  areasActividades: { id: string, nombre: string }[] = [];
  cargandoActividades = false;
  actividadSeleccionada: any = null;

  // Actividad asociada, de solo lectura al editar o consultar
  actividadAsociada: any = null;

  private editorDescripcion: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private galeriasService: GaleriasService,
    private gruposService: GruposService,
    private galeriasXGruposService: GaleriasXGruposService,
    private tareasXSprintsService: TareasXSprintsService
  ) {
    this.model.fecha = new Date().toISOString().split('T')[0];
  }

  ngOnInit(): void {
    this.cargarGrupos();

    const accion = this.route.snapshot.paramMap.get('accion');
    const id = this.route.snapshot.paramMap.get('id');

    if (accion === 'editar' && id && id !== '0') {
      this.accion = "editar";
      this.titulo = "Editar Galería"; // Título temporal mientras carga
      this.cargarGaleria(id);
    } else if (accion === 'consultar' && id && id !== '0') {
      this.accion = "consultar";
      this.titulo = "Consultar Galería";
      this.editable = false;
      this.cargarGaleria(id);
    }
  }

  ngAfterViewInit(): void {
    this.inicializarEditor();
  }

  ngOnDestroy(): void {
    if (this.editorDescripcion) {
      this.editorDescripcion.destroy()
        .catch((error: any) => console.error('Error destruyendo el editor de descripción:', error));
      this.editorDescripcion = null;
    }
  }

  // =========================================
  // Editor de descripción (CKEditor)
  // =========================================

  private inicializarEditor(): void {
    if (this.editorDescripcion) {
      return;
    }

    if (typeof ClassicEditor === 'undefined') {
      console.warn('CKEditor no está cargado aún, reintentando...');
      setTimeout(() => this.inicializarEditor(), 1000);
      return;
    }

    const elemento = document.querySelector('#editor-descripcion-galeria');
    if (!elemento) {
      setTimeout(() => this.inicializarEditor(), 500);
      return;
    }

    ClassicEditor
      .create(elemento, {
        toolbar: {
          items: [
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'bulletedList', 'numberedList', '|',
            'outdent', 'indent', '|',
            'link', 'blockQuote', '|',
            'undo', 'redo'
          ]
        },
        language: 'es',
        placeholder: 'Descripción de la galería',
      })
      .then((editor: any) => {
        this.editorDescripcion = editor;

        // La galería pudo cargar antes que el editor
        if (this.model.descripcion) {
          editor.setData(this.model.descripcion);
        }

        if (!this.editable) {
          editor.enableReadOnlyMode('readonly');
        }

        editor.model.document.on('change:data', () => {
          this.model.descripcion = editor.getData();
        });
      })
      .catch((error: any) => {
        console.error('Error al inicializar CKEditor de la galería:', error);
      });
  }

  /** Pone el texto en el editor, si ya existe. */
  private ponerDescripcionEnEditor(html: string): void {
    if (this.editorDescripcion) {
      this.editorDescripcion.setData(html || '');
    }
  }

  // =========================================
  // Selección de la actividad ejecutada
  // =========================================

  /** Al crear se ofrece tomar los datos de una actividad ejecutada. */
  get mostrarBusquedaActividad(): boolean {
    return this.accion === 'crear';
  }

  /** Abre el panel de actividades. La lista se pide solo la primera vez. */
  abrirPanelActividades(): void {
    this.panelActividadesAbierto = true;
    if (!this.actividadesCargadas) {
      this.cargarActividades();
    }
  }

  cerrarPanelActividades(): void {
    this.panelActividadesAbierto = false;
  }

  /** Trae de una vez las últimas actividades ejecutadas del jardín. */
  private cargarActividades(): void {
    this.cargandoActividades = true;
    this.tareasXSprintsService.obtenerUltimasEjecutadas(this.LIMITE_ACTIVIDADES).subscribe({
      next: (response: any) => {
        // Lo que pinta la tarjeta se calcula una vez aquí y no con funciones
        // en la plantilla, que se ejecutarían en cada ciclo de pantalla.
        this.actividades = (response.body || []).map((a: any) => this.prepararActividad(a));
        this.actividadesCargadas = true;
        this.cargandoActividades = false;
        this.gruposActividades = this.valoresUnicos(this.actividades, 'id_grupo', 'nombre_grupo');
        this.armarAreasActividades();
        this.aplicarFiltrosActividades();
      },
      error: (error) => {
        console.error("Error al cargar las actividades ejecutadas:", error);
        this.cargandoActividades = false;
      }
    });
  }

  /** Agrega a la actividad los datos de presentación de la tarjeta. */
  private prepararActividad(actividad: any): any {
    const [fecha, hora] = String(actividad.fecha_ejecucion || '').split(' ');
    const [year, month, day] = (fecha || '').split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, day || 1);
    return {
      ...actividad,
      vista_dia: day ? String(day) : '',
      vista_mes: day ? date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '') : '',
      vista_hora: hora ? hora.substring(0, 5) : '',
      vista_color: this.tonoArea(actividad.id_area_academica),
      vista_area: this.formaOracion(actividad.nombre_area),
      vista_iniciales: this.iniciales(actividad.nombre_docente),
      vista_resumen: this.textoPlano(actividad.descripcion_actividad)
    };
  }

  private tonoArea(idArea: string): string {
    if (!idArea) return this.TONOS_AREA[0];
    let suma = 0;
    for (let i = 0; i < idArea.length; i++) {
      suma = (suma + idArea.charCodeAt(i)) % 997;
    }
    return this.TONOS_AREA[suma % this.TONOS_AREA.length];
  }

  /** "PENSAMIENTO Y EXPLORACIÓN" -> "Pensamiento y exploración", para que no grite. */
  private formaOracion(texto: string): string {
    const limpio = (texto || '').trim().toLowerCase();
    return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : '';
  }

  /** "Francy Parada" -> "FP" */
  private iniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/).filter((p) => p.length > 0);
    return partes.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  }

  /** Áreas de las actividades cargadas; si hay grupo escogido, solo las de ese grupo. */
  private armarAreasActividades(): void {
    const base = this.filtroGrupoActividad
      ? this.actividades.filter((a) => a.id_grupo === this.filtroGrupoActividad)
      : this.actividades;
    this.areasActividades = this.valoresUnicos(base, 'id_area_academica', 'nombre_area');
  }

  /** Al cambiar el grupo se rehacen las áreas; si la escogida ya no está, se limpia. */
  onFiltroGrupoActividadChange(): void {
    this.armarAreasActividades();
    if (this.filtroAreaActividad &&
        !this.areasActividades.some((a) => a.id === this.filtroAreaActividad)) {
      this.filtroAreaActividad = '';
    }
    this.aplicarFiltrosActividades();
  }

  /**
   * Deja en actividadesFiltradas las cargadas que cumplen los filtros de
   * grupo, área y texto (título, grupo, área o docente).
   */
  aplicarFiltrosActividades(): void {
    const texto = this.normalizar(this.filtroTextoActividad);
    this.actividadesFiltradas = this.actividades.filter((a) => {
      if (this.filtroGrupoActividad && a.id_grupo !== this.filtroGrupoActividad) return false;
      if (this.filtroAreaActividad && a.id_area_academica !== this.filtroAreaActividad) return false;
      if (!texto) return true;
      const contenido = `${a.titulo_actividad} ${a.nombre_grupo} ${a.nombre_area} ${a.nombre_docente}`;
      return this.normalizar(contenido).includes(texto);
    });
  }

  limpiarFiltrosActividades(): void {
    this.filtroGrupoActividad = '';
    this.filtroAreaActividad = '';
    this.filtroTextoActividad = '';
    this.armarAreasActividades();
    this.aplicarFiltrosActividades();
  }

  get hayFiltrosActividades(): boolean {
    return !!(this.filtroGrupoActividad || this.filtroAreaActividad || this.filtroTextoActividad);
  }

  trackById(index: number, item: any): string {
    return item.id;
  }

  private valoresUnicos(lista: any[], campoId: string, campoNombre: string): { id: string, nombre: string }[] {
    const vistos = new Map<string, string>();
    for (const item of lista) {
      if (item[campoId] && !vistos.has(item[campoId])) {
        vistos.set(item[campoId], item[campoNombre] || '');
      }
    }
    return Array.from(vistos, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /**
   * Toma de la actividad el nombre, la descripción, la fecha y el grupo.
   * La galería queda privada con el grupo de la actividad; todo sigue
   * editable, así que se puede volver pública o agregar grupos.
   */
  seleccionarActividad(actividad: any): void {
    this.actividadSeleccionada = actividad;
    this.model.id_tarea_x_sprint = actividad.id;
    this.model.nombre = (actividad.titulo_actividad || '').substring(0, this.MAX_NOMBRE);
    this.model.descripcion = actividad.descripcion_actividad || '';
    this.model.fecha = this.soloFecha(actividad.fecha_ejecucion) || this.model.fecha;
    this.model.es_publica = 0;
    this.gruposSeleccionados = actividad.id_grupo ? [actividad.id_grupo] : [];
    this.ponerDescripcionEnEditor(this.model.descripcion);
    // Con la actividad escogida el panel se cierra; queda la tarjeta de la
    // actividad asociada al inicio del formulario.
    this.panelActividadesAbierto = false;
  }

  esActividadSeleccionada(actividad: any): boolean {
    return this.actividadSeleccionada?.id === actividad.id;
  }

  /**
   * Quita la asociación con la actividad. Los datos que ya se llenaron se
   * quedan en el formulario para que se ajusten a mano.
   */
  quitarActividad(): void {
    this.actividadSeleccionada = null;
    this.model.id_tarea_x_sprint = null;
  }

  /** Minúsculas y sin tildes, para que el buscador no dependa de ellas. */
  private normalizar(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /** '2026-09-29 10:15:00' -> '2026-09-29' */
  private soloFecha(fechaHora: string): string {
    if (!fechaHora) return '';
    return String(fechaHora).substring(0, 10);
  }

  formatearFechaHora(fechaHora: string): string {
    if (!fechaHora) return '';
    const [fecha, hora] = String(fechaHora).split(' ');
    const [year, month, day] = fecha.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const textoFecha = date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return hora ? `${textoFecha} ${hora.substring(0, 5)}` : textoFecha;
  }

  /** Texto sin etiquetas para el resumen de la tarjeta de actividad. */
  textoPlano(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  // =========================================
  // Carga de datos
  // =========================================

  cargarGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = response.body || [];
      },
      error: (error) => {
        console.error("Error al cargar grupos:", error);
      }
    });
  }

  cargarGaleria(id: string) {
    this.galeriasService.obtenerById(id).subscribe({
      next: (response: any) => {
        const galeria = response.body;
        this.model = {
          id: galeria.id,
          nombre: galeria.nombre,
          descripcion: galeria.descripcion || '',
          thumbnail: galeria.thumbnail || '',
          fecha: galeria.fecha?.split('T')[0] || '',
          es_publica: galeria.es_publica,
          activo: galeria.activo,
          orden: galeria.orden || 0,
          id_tarea_x_sprint: galeria.id_tarea_x_sprint || null
        };

        this.ponerDescripcionEnEditor(this.model.descripcion);

        // Actividad de la que salió la galería, solo para mostrarla
        this.actividadAsociada = galeria.id_tarea_x_sprint
          ? {
              titulo: galeria.titulo_actividad,
              fecha_ejecucion: galeria.fecha_ejecucion_actividad,
              nombre_grupo: galeria.nombre_grupo_actividad,
              nombre_area: galeria.nombre_area_actividad
            }
          : null;

        // CORREGIDO: Actualizar título con el nombre de la galería
        if (this.accion === 'editar') {
          this.titulo = `Editar: ${galeria.nombre}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar: ${galeria.nombre}`;
        }

        // Cargar grupos asignados
        this.cargarGruposAsignados(id);
      },
      error: (error) => {
        console.error("Error al cargar galería:", error);
        Swal.fire('Error', 'No se pudo cargar la galería', 'error');
        this.volver();
      }
    });
  }

  cargarGruposAsignados(idGaleria: string) {
    this.galeriasXGruposService.obtenerPorGaleria(idGaleria).subscribe({
      next: (response: any) => {
        const grupos = response.body || [];
        this.gruposSeleccionados = grupos.map((g: any) => g.id_grupo);
      },
      error: (error) => {
        console.error("Error al cargar grupos asignados:", error);
      }
    });
  }

  toggleGrupo(idGrupo: string) {
    const index = this.gruposSeleccionados.indexOf(idGrupo);
    if (index > -1) {
      this.gruposSeleccionados.splice(index, 1);
    } else {
      this.gruposSeleccionados.push(idGrupo);
    }
  }

  isGrupoSeleccionado(idGrupo: string): boolean {
    return this.gruposSeleccionados.includes(idGrupo);
  }

  validarFormulario(): boolean {
    if (!this.model.nombre || !this.model.fecha) {
      Swal.fire('Error', 'El nombre y la fecha son obligatorios', 'error');
      return false;
    }

    if (this.model.es_publica === 0 && this.gruposSeleccionados.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un grupo para galerías privadas', 'error');
      return false;
    }

    return true;
  }

  guardar() {
    this.submitted = true;

    // Se toma lo último del editor por si el evento de cambio no alcanzó
    if (this.editorDescripcion) {
      this.model.descripcion = this.editorDescripcion.getData();
    }

    if (!this.validarFormulario()) {
      return;
    }

    const galeria = { ...this.model };

    if (this.accion === 'crear') {
      this.galeriasService.crear(galeria).subscribe({
        next: (response: any) => {
          const idGaleria = response.id;

          // Asignar grupos si es privada
          if (galeria.es_publica === 0 && this.gruposSeleccionados.length > 0) {
            this.asignarGrupos(idGaleria);
          } else {
            Swal.fire('Éxito', 'Galería creada correctamente. Ya puedes gestionar sus imágenes', 'success');
            this.pasarAModoEdicion(idGaleria);
          }
        },
        error: (error) => {
          console.error("Error al crear galería:", error);
          Swal.fire('Error', 'No se pudo crear la galería', 'error');
        }
      });
    } else {
      this.galeriasService.actualizar(galeria).subscribe({
        next: () => {
          // Asignar grupos si es privada
          if (galeria.es_publica === 0 && this.gruposSeleccionados.length > 0) {
            this.asignarGrupos(galeria.id!);
          } else {
            Swal.fire('Éxito', 'Galería actualizada correctamente', 'success');
            this.router.navigate(['/operaciones/galerias']);
          }
        },
        error: (error) => {
          console.error("Error al actualizar galería:", error);
          Swal.fire('Error', 'No se pudo actualizar la galería', 'error');
        }
      });
    }
  }

  asignarGrupos(idGaleria: string) {
    // Al crear, la pantalla se queda en modo edición de la galería nueva;
    // al editar, vuelve al listado como siempre.
    const esNueva = this.accion === 'crear';

    this.galeriasXGruposService.asignarGrupos(idGaleria, this.gruposSeleccionados).subscribe({
      next: () => {
        if (esNueva) {
          Swal.fire('Éxito', 'Galería creada y grupos asignados correctamente. Ya puedes gestionar sus imágenes', 'success');
          this.pasarAModoEdicion(idGaleria);
        } else {
          Swal.fire('Éxito', 'Galería guardada y grupos asignados correctamente', 'success');
          this.router.navigate(['/operaciones/galerias']);
        }
      },
      error: (error) => {
        console.error("Error al asignar grupos:", error);
        Swal.fire('Advertencia', 'Galería guardada pero hubo un error al asignar grupos', 'warning');
        if (esNueva) {
          this.pasarAModoEdicion(idGaleria);
        } else {
          this.router.navigate(['/operaciones/galerias']);
        }
      }
    });
  }

  /**
   * Después de crear, la pantalla pasa a editar la galería recién creada,
   * para poder gestionar sus imágenes sin volver al listado.
   *
   * Se cambia en el sitio y solo se reemplaza la URL: navegar a
   * /editar/:id reutilizaría este mismo componente sin volver a correr
   * ngOnInit, y además el formulario ya tiene todos los datos.
   */
  private pasarAModoEdicion(idGaleria: string): void {
    this.model.id = idGaleria;
    this.accion = 'editar';
    this.titulo = `Editar: ${this.model.nombre}`;
    this.submitted = false;
    this.panelActividadesAbierto = false;

    // La actividad elegida pasa a mostrarse de solo lectura, como al editar
    this.actividadAsociada = this.actividadSeleccionada
      ? {
          titulo: this.actividadSeleccionada.titulo_actividad,
          fecha_ejecucion: this.actividadSeleccionada.fecha_ejecucion,
          nombre_grupo: this.actividadSeleccionada.nombre_grupo,
          nombre_area: this.actividadSeleccionada.nombre_area
        }
      : null;

    this.location.replaceState('/operaciones/galerias/editar/' + idGaleria);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }

  gestionarImagenes() {
    if (this.model.id) {
      this.router.navigate(['/operaciones/galerias/imagenes/' + this.model.id]);
    }
  }
}