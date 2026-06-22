import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';
import { ActividadesAcademicasXIndicadoresLogrosService } from '../../../../services/actividades-academicas-x-indicadores-logros.service';
import { TiposActividadesAcademicasService } from '../../../../services/tipos-actividades-academicas.service';
import { IndicadoresLogrosService } from '../../../../services/indicadores-logros.service';
import { SprintsService } from '../../../../services/sprints.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { EstadosTareasService } from '../../../../services/estados-tareas.service';
import { AmbientesService } from '../../../../services/ambientes.service';
import { MaterialesXActividadService } from '../../../../services/materiales-x-actividad.service';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

// Declarar el editor globalmente
declare var ClassicEditor: any;
declare var bootstrap: any;

@Component({
  selector: 'app-crear-actividades-academicas',
  templateUrl: './crear-actividades-academicas.component.html',
  styleUrl: './crear-actividades-academicas.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class CrearActividadesAcademicasComponent implements OnInit, OnDestroy, AfterViewInit {
  public titulo = "actividades académicas";
  public id = "0";
  public accion = "";
  public editable = false;
  public nuevo = false;
  public titulos: any[] = [];
  public submitted = false;
  
  // Instancias de editores
  private editorDescripcion: any = null;
  private editorNivelUno: any = null;
  private editorNivelDos: any = null;
  
  public caracteresRestantesDescripcion = 5000;
  public caracteresRestantesNivelUno = 3000;
  public caracteresRestantesNivelDos = 3000;
  
  private modalInstance: any = null;

  // Variables para el modal de indicadores
  public indicadoresSeleccionados: any[] = [];
  public indicadorSubmitted = false;
  public indicadoresDisponibles: any[] = [];
  public indicadoresBusqueda = '';
  public filtroGrupo = '';
  public filtroArea = '';
  public filtroCorte = '';
  public gruposIndicadores: any[] = [];
  public areasIndicadores: any[] = [];
  public cortesIndicadores: any[] = [];

  public listas = {
    tiposActividades: [] as any[],
    ambientes: [] as any[]
  }

  public datosIndicadoresLogro: any[] = [];

  // Sprints asociados
  public titulosSprints: any[] = [];
  public datosTareasActividad: any[] = [];
  public sprintsDisponibles: any[] = [];
  public estadosTareas: any[] = [];
  public gruposActividad: any[] = [];
  public areasActividad: any[] = [];
  public mostrarModalSprint: boolean = false;
  public sprintModalData = {
    id_sprint: null as any,
    id_grupo: null as any,
    id_area_academica: null as any
  };

  // Materiales como chips
  public materialesLista: any[] = [];
  public nuevoMaterialTexto: string = '';
  public productosDisponiblesActividad: any[] = [];
  public productoDetalleModal: any = null;
  
  public model = {
    id: 0 as any,
    id_tipo_actividad_academica: "",
    titulo: "",
    descripcion: "",
    nivel_uno: "",
    nivel_dos: "",
    minutos_duracion: null as any,
    materiales: "",
    id_ambiente: null as any
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private actividadesXIndicadoresService: ActividadesAcademicasXIndicadoresLogrosService,
    private tiposActividadesService: TiposActividadesAcademicasService,
    private indicadoresLogrosService: IndicadoresLogrosService,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private estadosTareasService: EstadosTareasService,
    private ambientesService: AmbientesService,
    private materialesXActividadService: MaterialesXActividadService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      console.log("CrearActividadesAcademicasComponent", this.accion, this.id)
      
      switch (this.accion) {
        case 'crear':
          this.titulo = "Crear Actividad Académica";
          this.editable = true;
          this.nuevo = true;
          this.consultarListas();
          break;
        case 'editar':
          this.titulo = "Editar Actividad Académica";
          this.editable = true;
          this.nuevo = false;
          this.consultarListas();
          this.obtenerActividad(this.id);
          break;
        case 'consultar':
          this.titulo = "Consultar Actividad Académica";
          this.editable = false;
          this.nuevo = false;
          this.consultarListas();
          this.obtenerActividad(this.id);
          break;
      }
    });
  }

  ngAfterViewInit() {
    if (this.accion === 'crear') {
      setTimeout(() => {
        this.initializeEditors();
      }, 100);
    }
  }

  ngOnDestroy() {
    if (this.editorDescripcion) {
      this.editorDescripcion.destroy()
        .then(() => console.log('Editor descripción destruido correctamente'))
        .catch((error: any) => console.error('Error destruyendo el editor descripción:', error));
    }
    
    if (this.editorNivelUno) {
      this.editorNivelUno.destroy()
        .then(() => console.log('Editor nivel uno destruido correctamente'))
        .catch((error: any) => console.error('Error destruyendo el editor nivel uno:', error));
    }
    
    if (this.editorNivelDos) {
      this.editorNivelDos.destroy()
        .then(() => console.log('Editor nivel dos destruido correctamente'))
        .catch((error: any) => console.error('Error destruyendo el editor nivel dos:', error));
    }

    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  initializeEditors() {
    if (typeof ClassicEditor === 'undefined') {
      console.warn('CKEditor no está cargado aún, reintentando...');
      setTimeout(() => this.initializeEditors(), 1000);
      return;
    }

    this.initializeEditor('editor-descripcion', 'descripcion', 5000);
    this.initializeEditor('editor-nivel-uno', 'nivel_uno', 3000);
    this.initializeEditor('editor-nivel-dos', 'nivel_dos', 3000);
  }

  initializeEditor(elementId: string, modelField: 'descripcion' | 'nivel_uno' | 'nivel_dos', maxChars: number) {
    if ((modelField === 'descripcion' && this.editorDescripcion) ||
        (modelField === 'nivel_uno' && this.editorNivelUno) ||
        (modelField === 'nivel_dos' && this.editorNivelDos)) {
      console.log(`Editor ${modelField} ya está inicializado, saltando...`);
      return;
    }

    const editorElement = document.querySelector(`#${elementId}`);
    if (!editorElement) {
      console.warn(`Elemento del editor ${elementId} no encontrado, reintentando...`);
      setTimeout(() => this.initializeEditor(elementId, modelField, maxChars), 500);
      return;
    }

    const placeholderText = {
      'descripcion': 'Ingrese la descripción detallada de la actividad académica...',
      'nivel_uno': 'Describa las actividades para el nivel uno...',
      'nivel_dos': 'Describa las actividades para el nivel dos...'
    };

    ClassicEditor
      .create(editorElement, {
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
        placeholder: placeholderText[modelField],
      })
      .then((editor: any) => {
        if (modelField === 'descripcion') {
          this.editorDescripcion = editor;
        } else if (modelField === 'nivel_uno') {
          this.editorNivelUno = editor;
        } else if (modelField === 'nivel_dos') {
          this.editorNivelDos = editor;
        }
        
        console.log(`Editor ${modelField} inicializado correctamente`);
        
        if (this.model[modelField]) {
          editor.setData(this.model[modelField]);
          this.actualizarContadorCaracteres(modelField, maxChars);
        }

        if (!this.editable) {
          editor.enableReadOnlyMode('readonly');
        }

        editor.model.document.on('change:data', () => {
          const data = editor.getData();
          this.model[modelField] = data;
          this.actualizarContadorCaracteres(modelField, maxChars);
          this.formularioValido();
        });
      })
      .catch((error: any) => {
        console.error(`Error al inicializar CKEditor ${modelField}:`, error);
      });
  }

  actualizarContadorCaracteres(field: 'descripcion' | 'nivel_uno' | 'nivel_dos', maxChars: number) {
    const text = this.stripHtml(this.model[field]);
    const remaining = maxChars - text.length;
    
    if (field === 'descripcion') {
      this.caracteresRestantesDescripcion = remaining;
    } else if (field === 'nivel_uno') {
      this.caracteresRestantesNivelUno = remaining;
    } else if (field === 'nivel_dos') {
      this.caracteresRestantesNivelDos = remaining;
    }
    
    if (remaining < 0) {
      Swal.fire({
        title: 'Límite de caracteres',
        text: `Ha alcanzado el límite máximo de ${maxChars} caracteres en ${field}`,
        icon: 'warning',
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  stripHtml(html: string): string {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre_indicador', alias: 'Indicador de Logro', alinear: 'izquierda' },
      { clave: 'nombre_grado', alias: 'Grado', alinear: 'izquierda' },
      { clave: 'nombres_grupos', alias: 'Grupo(s)', alinear: 'izquierda' },
      { clave: 'nombre_area', alias: 'Área Académica', alinear: 'izquierda' }
    ];
  }

  parsearGruposJson(gruposJson: any): string {
    if (!gruposJson) return '';
    try {
      const grupos = typeof gruposJson === 'string' ? JSON.parse(gruposJson) : gruposJson;
      if (Array.isArray(grupos)) {
        return grupos.map((g: any) => g.nombre).join(', ');
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  consultarListas() {
    // Cargar tipos de actividades
    this.tiposActividadesService.obtenerTodos().subscribe((response: any) => {
      this.listas.tiposActividades = response.body;
    });

    // Cargar ambientes activos
    this.ambientesService.obtenerActivos().subscribe((response: any) => {
      this.listas.ambientes = response.body || [];
    });

    // Cargar todos los indicadores de logros disponibles
    this.indicadoresLogrosService.obtenerTodos().subscribe((response: any) => {
      this.indicadoresDisponibles = response.body;
      
      this.indicadoresDisponibles.forEach((indicador: any) => {
        indicador.nombres_grupos = this.parsearGruposJson(indicador.grupos_json);
      });

      const gruposSet = new Set<string>();
      const areasSet = new Set<string>();
      const cortesSet = new Set<string>();
      
      this.indicadoresDisponibles.forEach((indicador: any) => {
        if (indicador.grupos_json) {
          try {
            const grupos = typeof indicador.grupos_json === 'string' 
              ? JSON.parse(indicador.grupos_json) 
              : indicador.grupos_json;
            if (Array.isArray(grupos)) {
              grupos.forEach((g: any) => {
                if (g.nombre) gruposSet.add(g.nombre);
              });
            }
          } catch (e) {
            // Si falla el parseo, ignorar
          }
        }
        if (indicador.area_academica_nombre) {
          areasSet.add(indicador.area_academica_nombre);
        }
        if (indicador.corte_academico_nombre) {
          cortesSet.add(indicador.corte_academico_nombre);
        }
      });
      
      this.gruposIndicadores = Array.from(gruposSet).map(nombre => ({ nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.areasIndicadores = Array.from(areasSet).map(nombre => ({ nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
      this.cortesIndicadores = Array.from(cortesSet).map(nombre => ({ nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
  }

  obtenerActividad(id_actividad: any) {
    this.actividadesAcademicasService.obtenerById(id_actividad).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerActividad", body);
      this.model = body[0];
      
      if (this.model.titulo) {
        if (this.accion === 'editar') {
          this.titulo = `Editar: ${this.model.titulo}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar: ${this.model.titulo}`;
        }
      }

      // Cargar materiales como chips desde la tabla materiales_x_actividad
      this.cargarMaterialesActividad(id_actividad);

      // Cargar productos disponibles basado en indicadores
      this.cargarProductosDisponibles();
      
      if (!this.editorDescripcion && !this.editorNivelUno && !this.editorNivelDos) {
        setTimeout(() => {
          this.initializeEditors();
        }, 500);
      }
    });
    this.getIndicadoresLogrosByActividad(id_actividad);
    this.cargarTareasActividad(id_actividad);
    this.cargarSprintsDisponibles();
    this.cargarEstadosTareas();
  }

  // ========================================================================
  // SECCIÓN: MATERIALES COMO CHIPS
  // ========================================================================

  cargarMaterialesActividad(idActividad: any) {
    this.materialesXActividadService.obtenerByActividad(idActividad).subscribe({
      next: (response: any) => {
        const datos = response.body || [];
        this.materialesLista = datos.map((m: any) => ({
          id: m.id,
          id_producto: m.id_producto,
          nombre_material: m.nombre_material,
          es_producto: !!m.id_producto,
          imagen: m.imagen_producto || null,
          descripcion: m.descripcion_producto || null
        }));
        // Si no hay materiales en la tabla nueva, parsear del campo texto legacy
        if (this.materialesLista.length === 0 && this.model.materiales) {
          this.materialesLista = this.model.materiales.split(',')
            .map((m: string) => m.trim())
            .filter((m: string) => m.length > 0)
            .map((m: string) => ({
              id: null,
              id_producto: null,
              nombre_material: m,
              es_producto: false,
              imagen: null,
              descripcion: null
            }));
        }
      },
      error: () => {
        // Fallback: parsear del campo texto
        if (this.model.materiales) {
          this.materialesLista = this.model.materiales.split(',')
            .map((m: string) => m.trim())
            .filter((m: string) => m.length > 0)
            .map((m: string) => ({
              id: null,
              id_producto: null,
              nombre_material: m,
              es_producto: false,
              imagen: null,
              descripcion: null
            }));
        }
      }
    });
  }

  cargarProductosDisponibles() {
    // Obtener los grupos de los indicadores para saber qué productos mostrar
    this.actividadesAcademicasService.getIndicadoresLogrosByActividad(this.id).subscribe({
      next: (response: any) => {
        const indicadores = response.body || [];
        const grupoIds = new Set<number>();
        indicadores.forEach((ind: any) => {
          if (ind.grupos_json) {
            try {
              const grupos = typeof ind.grupos_json === 'string' ? JSON.parse(ind.grupos_json) : ind.grupos_json;
              if (Array.isArray(grupos)) {
                grupos.forEach((g: any) => { if (g.id) grupoIds.add(g.id); });
              }
            } catch (e) { /* ignorar */ }
          }
        });

        // Tomar el primer grupo para cargar productos
        if (grupoIds.size > 0) {
          const primerGrupoId = Array.from(grupoIds)[0];
          this.materialesXActividadService.obtenerProductosPorGrupo(primerGrupoId).subscribe({
            next: (resp: any) => {
              this.productosDisponiblesActividad = resp.body || [];
            }
          });
        }
      }
    });
  }

  agregarMaterialTextoLibre() {
    const texto = this.nuevoMaterialTexto?.trim();
    if (!texto) return;

    const yaExiste = this.materialesLista.some(
      (m: any) => m.nombre_material.toLowerCase() === texto.toLowerCase()
    );
    if (yaExiste) {
      Swal.fire('Ya existe', 'Ese material ya está en la lista.', 'info');
      return;
    }

    this.materialesLista.push({
      id: null,
      id_producto: null,
      nombre_material: texto,
      es_producto: false,
      imagen: null,
      descripcion: null
    });
    this.nuevoMaterialTexto = '';
    this.sincronizarCampoMateriales();
  }

  toggleMaterialProducto(producto: any) {
    const idx = this.materialesLista.findIndex((m: any) => m.id_producto === producto.id);
    if (idx >= 0) {
      this.materialesLista.splice(idx, 1);
    } else {
      this.materialesLista.push({
        id: null,
        id_producto: producto.id,
        nombre_material: producto.nombre,
        es_producto: true,
        imagen: producto.imagen || null,
        descripcion: producto.descripcion || null
      });
    }
    this.sincronizarCampoMateriales();
  }

  isMaterialProductoAgregado(idProducto: string): boolean {
    return this.materialesLista.some((m: any) => m.id_producto === idProducto);
  }

  quitarMaterialDeLista(index: number) {
    this.materialesLista.splice(index, 1);
    this.sincronizarCampoMateriales();
  }

  sincronizarCampoMateriales() {
    // Autocompletar el campo de texto legacy con los nombres separados por coma
    this.model.materiales = this.materialesLista.map((m: any) => m.nombre_material).join(', ');
  }

  verProductoDetalle(material: any) {
    if (material.es_producto) {
      this.productoDetalleModal = material;
    }
  }

  // ========================================================================
  // SECCIÓN: GRABAR
  // ========================================================================

  grabar() {
    console.log("grabar", this.model);
    this.submitted = true;

    if (this.editorDescripcion) {
      this.model.descripcion = this.editorDescripcion.getData();
    }
    if (this.editorNivelUno) {
      this.model.nivel_uno = this.editorNivelUno.getData();
    }
    if (this.editorNivelDos) {
      this.model.nivel_dos = this.editorNivelDos.getData();
    }

    // Sincronizar materiales antes de grabar
    this.sincronizarCampoMateriales();

    if (this.accion === "crear" && this.formularioValido()) {
      this.actividadesAcademicasService.crear(this.model).subscribe((response: any) => {
        console.log("crear response", response);
        const data = response.id;
        if (data) {
          // Grabar materiales en la tabla nueva
          this.grabarMaterialesActividad(data);
          Swal.fire({
            title: 'Actividad creada con éxito',
            text: 'La actividad académica ha sido registrada correctamente.',
            icon: "success",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#F5A623'
          }).then(() => {
            this.limpiarFormulario();
          });
        } else {
          Swal.fire({
            title: 'Error al crear la actividad',
            text: 'Ha ocurrido un error al intentar crear la actividad. Por favor, intente nuevamente.',
            icon: "error",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar"
          })
          console.log("Error al crear actividad.");
        }
      })
    }
    if (this.accion === "editar" && this.formularioValido()) {
      this.actividadesAcademicasService.actualizar(this.model).subscribe((response: any) => {
        console.log("editar response", response);
        const data = response.id;
        if (data) {
          // Actualizar materiales: borrar y recrear
          this.grabarMaterialesActividad(this.model.id);
          Swal.fire({
            title: 'Actividad actualizada con éxito',
            text: 'Los cambios han sido guardados correctamente.',
            icon: "success",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#F5A623'
          }).then(() => {
            this.router.navigate(['academico/actividades-academicas/']);
          });
        } else {
          Swal.fire({
            title: 'Error al actualizar la actividad',
            text: 'Ha ocurrido un error al intentar actualizar la actividad. Por favor, intente nuevamente.',
            icon: "error",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar"
          })
          console.log("Error al actualizar actividad.");
        }
      })
    }
  }

  grabarMaterialesActividad(idActividad: any) {
    // Primero borrar los existentes (solo si es editar)
    if (this.accion === 'editar') {
      this.materialesXActividadService.eliminarByActividad(idActividad).subscribe({
        next: () => { this.insertarMateriales(idActividad); },
        error: () => { this.insertarMateriales(idActividad); }
      });
    } else {
      this.insertarMateriales(idActividad);
    }
  }

  private insertarMateriales(idActividad: any) {
    this.materialesLista.forEach((mat: any) => {
      this.materialesXActividadService.crear({
        id_actividad_academica: idActividad,
        id_producto: mat.id_producto,
        nombre_material: mat.nombre_material,
        cantidad: 1
      }).subscribe();
    });
  }

  limpiarFormulario() {
    this.model = {
      id: 0 as any,
      id_tipo_actividad_academica: "",
      titulo: "",
      descripcion: "",
      nivel_uno: "",
      nivel_dos: "",
      minutos_duracion: null,
      materiales: "",
      id_ambiente: null
    };
    
    if (this.editorDescripcion) { this.editorDescripcion.setData(''); }
    if (this.editorNivelUno) { this.editorNivelUno.setData(''); }
    if (this.editorNivelDos) { this.editorNivelDos.setData(''); }
    
    this.caracteresRestantesDescripcion = 5000;
    this.caracteresRestantesNivelUno = 3000;
    this.caracteresRestantesNivelDos = 3000;
    this.submitted = false;
    this.materialesLista = [];
    this.nuevoMaterialTexto = '';
  }

  formularioValido(): boolean {
    const camposValidos = !!(this.model.id_tipo_actividad_academica &&
      this.model.titulo && this.model.titulo.trim().length > 0 &&
      this.model.descripcion && this.stripHtml(this.model.descripcion).trim().length > 0 &&
      this.model.nivel_uno && this.stripHtml(this.model.nivel_uno).trim().length > 0 &&
      this.model.nivel_dos && this.stripHtml(this.model.nivel_dos).trim().length > 0 &&
      this.model.minutos_duracion && this.model.minutos_duracion > 0 &&
      this.model.materiales && this.model.materiales.trim().length > 0);
      
    return camposValidos;
  }

  getIndicadoresLogrosByActividad(id: any) {
    this.actividadesXIndicadoresService.obtenerByActividad(id).subscribe((response: any) => {
      const datos = response.body || [];
      datos.forEach((item: any) => {
        item.nombres_grupos = this.parsearGruposJson(item.grupos_json);
      });
      this.datosIndicadoresLogro = datos;
      this.crearTitulos();
    });
  }

  volver() {
    if (this.editable && this.formularioModificado()) {
      Swal.fire({
        title: '¿Está seguro de salir?',
        text: 'Los cambios no guardados se perderán',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['academico/actividades-academicas/']);
        }
      });
    } else {
      this.router.navigate(['academico/actividades-academicas/']);
    }
  }

  formularioModificado(): boolean {
    return !!(this.model.id_tipo_actividad_academica !== "" ||
           this.model.titulo !== "" ||
           (this.model.descripcion && this.stripHtml(this.model.descripcion).trim().length > 0) ||
           (this.model.nivel_uno && this.stripHtml(this.model.nivel_uno).trim().length > 0) ||
           (this.model.nivel_dos && this.stripHtml(this.model.nivel_dos).trim().length > 0) ||
           this.model.minutos_duracion ||
           this.model.materiales !== "");
  }

  seleccionarIndicador(event: any) {
    console.log("seleccionarIndicador", event);
    
    if (event.accion === 'eliminar') {
      const indicador = this.datosIndicadoresLogro.find((i: any) => i.id === event.id);
      if (indicador) {
        this.eliminarIndicadorAsociado(indicador);
      }
    }
  }

  abrirModalIndicador() {
    this.indicadorSubmitted = false;
    this.indicadoresSeleccionados = [];
    this.indicadoresBusqueda = '';
    this.filtroGrupo = '';
    this.filtroArea = '';
    this.filtroCorte = '';
    
    const modalElement = document.getElementById('modalIndicador');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement);
      this.modalInstance.show();
    }
  }

  cerrarModalIndicador() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
    this.indicadoresSeleccionados = [];
    this.filtroGrupo = '';
    this.filtroArea = '';
    this.filtroCorte = '';
    this.indicadoresBusqueda = '';
  }

  asociarIndicadores() {
    this.indicadorSubmitted = true;
    
    if (!this.indicadoresSeleccionados || this.indicadoresSeleccionados.length === 0) {
      return;
    }

    if (this.nuevo) {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'Debe guardar primero la actividad antes de poder asociar indicadores.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#F5A623'
      });
      this.cerrarModalIndicador();
      return;
    }

    const totalIndicadores = this.indicadoresSeleccionados.length;
    let asociados = 0;
    let errores = 0;
    let duplicados = 0;

    Swal.fire({
      title: 'Asociando indicadores',
      html: `Procesando ${totalIndicadores} indicador${totalIndicadores > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const promesas = this.indicadoresSeleccionados.map(indicador => {
      const body = {
        id_actividad_academica: this.id,
        id_indicador_logro: indicador.id
      };

      return this.actividadesXIndicadoresService.crear(body).toPromise()
        .then(() => { asociados++; })
        .catch((error) => {
          if (error.status === 409) { duplicados++; } else { errores++; }
          console.error(`Error al asociar indicador ${indicador.nombre}:`, error);
        });
    });

    Promise.all(promesas).then(() => {
      let mensaje = '';
      let icon: any = 'success';

      if (asociados === totalIndicadores) {
        mensaje = `${asociados} indicador${asociados > 1 ? 'es asociados' : ' asociado'} correctamente.`;
      } else {
        icon = 'warning';
        mensaje = `Proceso completado:<br>`;
        if (asociados > 0) mensaje += `✓ ${asociados} indicador${asociados > 1 ? 'es asociados' : ' asociado'}<br>`;
        if (duplicados > 0) mensaje += `⚠ ${duplicados} ya estaba${duplicados > 1 ? 'n' : ''} asociado${duplicados > 1 ? 's' : ''}<br>`;
        if (errores > 0) mensaje += `✗ ${errores} error${errores > 1 ? 'es' : ''}`;
      }

      Swal.fire({
        title: 'Proceso completado',
        html: mensaje,
        icon: icon,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#F5A623'
      }).then(() => {
        this.cerrarModalIndicador();
        this.getIndicadoresLogrosByActividad(this.id);
        // Recargar productos disponibles por si cambiaron los grupos
        this.cargarProductosDisponibles();
      });
    });
  }

  eliminarIndicadorAsociado(indicador: any) {
    if (this.datosTareasActividad.length > 0) {
      let gruposNombreIndicador: string[] = [];
      if (indicador.grupos_json) {
        try {
          const grupos = typeof indicador.grupos_json === 'string'
            ? JSON.parse(indicador.grupos_json)
            : indicador.grupos_json;
          if (Array.isArray(grupos)) {
            gruposNombreIndicador = grupos.map((g: any) => g.nombre);
          }
        } catch (e) { /* ignorar */ }
      }
      const areaNombreIndicador = indicador.nombre_area || '';

      const indicadoresRestantes = this.datosIndicadoresLogro.filter(
        (i: any) => i.id !== indicador.id
      );

      const gruposAreasRestantes = new Set<string>();
      indicadoresRestantes.forEach((ind: any) => {
        let gruposNombres: string[] = [];
        if (ind.grupos_json) {
          try {
            const grupos = typeof ind.grupos_json === 'string'
              ? JSON.parse(ind.grupos_json)
              : ind.grupos_json;
            if (Array.isArray(grupos)) {
              gruposNombres = grupos.map((g: any) => g.nombre);
            }
          } catch (e) { /* ignorar */ }
        }
        const areaNombre = ind.nombre_area || '';
        gruposNombres.forEach(gNombre => {
          gruposAreasRestantes.add(`${gNombre}|||${areaNombre}`);
        });
      });

      const tareasHuerfanas = this.datosTareasActividad.filter((tarea: any) => {
        const clave = `${tarea.nombre_grupo}|||${tarea.nombre_area}`;
        return !gruposAreasRestantes.has(clave);
      });

      if (tareasHuerfanas.length > 0) {
        const detalle = tareasHuerfanas.map((t: any) =>
          `• ${t.nombre_sprint} → ${t.nombre_grupo} / ${t.nombre_area}`
        ).join('<br>');

        Swal.fire({
          title: 'No se puede eliminar',
          html: `Si elimina este indicador, las siguientes tareas en sprints quedarían sin respaldo de grupo/área:<br><br>${detalle}<br><br>Primero elimine esas tareas de los sprints.`,
          icon: 'error',
          confirmButtonColor: '#F5A623'
        });
        return;
      }
    }

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar el indicador "${indicador.nombre_indicador}" de esta actividad?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const body = {
          id_actividad_academica: this.id,
          id_indicador_logro: indicador.id_indicador_logro
        };
        
        this.actividadesXIndicadoresService.eliminar(body).subscribe({
          next: (response: any) => {
            console.log('Respuesta desasociación:', response);
            Swal.fire({
              title: 'Desasociado',
              text: 'El indicador de logro ha sido desasociado de la actividad.',
              icon: 'success',
              confirmButtonColor: '#F5A623'
            });
            this.getIndicadoresLogrosByActividad(this.id);
          },
          error: (error: any) => {
            console.error('Error al desasociar indicador:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo desasociar el indicador. Por favor, intente nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }

  get indicadoresFiltrados() {
    let indicadores = this.indicadoresDisponibles;
    
    if (this.indicadoresBusqueda) {
      const busqueda = this.indicadoresBusqueda.toLowerCase();
      indicadores = indicadores.filter((indicador: any) => 
        indicador.nombre.toLowerCase().includes(busqueda)
      );
    }
    
    if (this.filtroGrupo) {
      indicadores = indicadores.filter((indicador: any) => {
        if (!indicador.grupos_json) return false;
        try {
          const grupos = typeof indicador.grupos_json === 'string' 
            ? JSON.parse(indicador.grupos_json) 
            : indicador.grupos_json;
          return Array.isArray(grupos) && grupos.some((g: any) => g.nombre === this.filtroGrupo);
        } catch (e) {
          return false;
        }
      });
    }
    
    if (this.filtroArea) {
      indicadores = indicadores.filter((indicador: any) => 
        indicador.area_academica_nombre === this.filtroArea
      );
    }
    
    if (this.filtroCorte) {
      indicadores = indicadores.filter((indicador: any) => 
        indicador.corte_academico_nombre === this.filtroCorte
      );
    }
    
    return indicadores;
  }

  toggleIndicadorSeleccion(indicador: any) {
    const index = this.indicadoresSeleccionados.findIndex(i => i.id === indicador.id);
    if (index === -1) {
      this.indicadoresSeleccionados.push(indicador);
    } else {
      this.indicadoresSeleccionados.splice(index, 1);
    }
  }

  isIndicadorSeleccionado(indicador: any): boolean {
    return this.indicadoresSeleccionados.some(i => i.id === indicador.id);
  }

  seleccionarTodos() {
    this.indicadoresSeleccionados = [...this.indicadoresFiltrados];
  }

  deseleccionarTodos() {
    this.indicadoresSeleccionados = [];
  }

  // ========================================================================
  // SECCIÓN: SPRINTS ASOCIADOS
  // ========================================================================

  crearTitulosSprints() {
    this.titulosSprints = [
      { clave: 'nombre_sprint', alias: 'Sprint', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'nombre_area', alias: 'Área Académica', alinear: 'izquierda' },
      { clave: 'nombre_estado', alias: 'Estado', alinear: 'centrado', tipo: 'badge', claseCSS: 'claseCSS' },
      { clave: 'fecha_registro', alias: 'Fecha Registro', alinear: 'centrado', tipo: 'date' }
    ];
  }

  cargarTareasActividad(idActividad: any) {
    this.tareasXSprintsService.obtenerByActividadId(idActividad).subscribe({
      next: (response: any) => {
        const datos = response.body || [];
        datos.forEach((tarea: any) => {
          switch (parseInt(tarea.id_estado_tarea)) {
            case 1: tarea.claseCSS = 'bg-warning text-dark'; break;
            case 2: tarea.claseCSS = 'bg-success text-white'; break;
            case 3: tarea.claseCSS = 'bg-danger text-white'; break;
            default: tarea.claseCSS = 'bg-secondary text-white';
          }
        });
        this.datosTareasActividad = datos;
        this.crearTitulosSprints();
      },
      error: (error: any) => {
        console.error('Error al cargar tareas de la actividad', error);
        this.datosTareasActividad = [];
      }
    });
  }

  cargarSprintsDisponibles() {
    this.sprintsService.obtenerTodos().subscribe({
      next: (response: any) => {
        const todos = response.body || [];
        const hoy = new Date().toISOString().split('T')[0];
        this.sprintsDisponibles = todos.filter((s: any) =>
          s.actual == 1 || s.fecha_final >= hoy
        ).sort((a: any, b: any) => a.fecha_inicial.localeCompare(b.fecha_inicial));
      },
      error: (error: any) => {
        console.error('Error al cargar sprints', error);
      }
    });
  }

  cargarEstadosTareas() {
    this.estadosTareasService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.estadosTareas = response.body || [];
      },
      error: (error: any) => {
        console.error('Error al cargar estados de tareas', error);
      }
    });
  }

  extraerGruposAreasDeIndicadores() {
    this.actividadesAcademicasService.getIndicadoresLogrosByActividad(this.id).subscribe({
      next: (response: any) => {
        const indicadores = response.body || [];
        const gruposMap = new Map<number, string>();
        const areasMap = new Map<number, string>();

        indicadores.forEach((ind: any) => {
          if (ind.grupos_json) {
            try {
              const grupos = typeof ind.grupos_json === 'string'
                ? JSON.parse(ind.grupos_json)
                : ind.grupos_json;
              if (Array.isArray(grupos)) {
                grupos.forEach((g: any) => {
                  if (g.id && g.nombre) gruposMap.set(g.id, g.nombre);
                });
              }
            } catch (e) { /* ignorar */ }
          }

          if (ind.id && ind.area_academica_nombre) {
            areasMap.set(ind.id, ind.area_academica_nombre);
          }
        });

        this.gruposActividad = Array.from(gruposMap, ([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.areasActividad = Array.from(areasMap, ([id, nombre]) => ({ id, nombre }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        if (this.gruposActividad.length === 1) {
          this.sprintModalData.id_grupo = this.gruposActividad[0].id;
        }
        if (this.areasActividad.length === 1) {
          this.sprintModalData.id_area_academica = this.areasActividad[0].id;
        }
      },
      error: () => {
        this.gruposActividad = [];
        this.areasActividad = [];
      }
    });
  }

  abrirModalSprint() {
    if (this.datosIndicadoresLogro.length === 0) {
      Swal.fire(
        'Sin indicadores',
        'Debe asociar indicadores de logro a esta actividad antes de poder asociarla a un sprint.',
        'warning'
      );
      return;
    }

    this.sprintModalData = {
      id_sprint: null,
      id_grupo: null,
      id_area_academica: null
    };
    this.extraerGruposAreasDeIndicadores();
    this.mostrarModalSprint = true;
  }

  cerrarModalSprint() {
    this.mostrarModalSprint = false;
  }

  asociarASprint() {
    if (!this.sprintModalData.id_sprint || !this.sprintModalData.id_grupo || !this.sprintModalData.id_area_academica) {
      Swal.fire('Advertencia', 'Debe seleccionar sprint, grupo y área académica.', 'warning');
      return;
    }

    const yaExiste = this.datosTareasActividad.some((t: any) =>
      String(t.id_sprint) === String(this.sprintModalData.id_sprint) &&
      String(t.id_grupo) === String(this.sprintModalData.id_grupo) &&
      String(t.id_area_academica) === String(this.sprintModalData.id_area_academica)
    );

    if (yaExiste) {
      Swal.fire({
        title: 'Ya existe una asociación',
        text: 'Esta actividad ya está asociada a ese sprint con el mismo grupo y área. ¿Desea crear otra tarea de todas formas?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, crear otra',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.crearTareaSprint();
        }
      });
      return;
    }

    this.crearTareaSprint();
  }

  private crearTareaSprint() {
    const body = {
      id_sprint: this.sprintModalData.id_sprint,
      id_actividad_academica: this.model.id,
      id_grupo: this.sprintModalData.id_grupo,
      id_area_academica: this.sprintModalData.id_area_academica,
      id_estado_tarea: 1,
      fecha_registro: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    this.tareasXSprintsService.crear(body).subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Asociada correctamente',
          text: 'La actividad ha sido asociada al sprint.',
          icon: 'success',
          confirmButtonColor: '#F5A623'
        });
        this.cerrarModalSprint();
        this.cargarTareasActividad(this.model.id);
      },
      error: (error: any) => {
        console.error('Error al asociar actividad al sprint', error);
        Swal.fire('Error', 'No se pudo asociar la actividad al sprint.', 'error');
      }
    });
  }

  accionTareaSprint(event: any) {
    const tarea = event.registro;

    if (event.accion === 'eliminar') {
      this.eliminarTareaSprint(tarea);
    } else if (event.accion === 'cambiarEstado') {
      this.cambiarEstadoTarea(tarea);
    }
  }

  eliminarTareaSprint(tarea: any) {
    if (parseInt(tarea.id_estado_tarea) === 2) {
      Swal.fire('No permitido', 'No se puede eliminar una tarea que ya fue ejecutada.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar esta actividad del sprint "${tarea.nombre_sprint}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tareasXSprintsService.eliminar({ id: tarea.id }).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminada',
              text: 'La tarea ha sido eliminada del sprint.',
              icon: 'success',
              confirmButtonColor: '#F5A623'
            });
            this.cargarTareasActividad(this.model.id);
          },
          error: (error: any) => {
            console.error('Error al eliminar tarea', error);
            Swal.fire('Error', 'No se pudo eliminar la tarea. Puede tener calificaciones asociadas.', 'error');
          }
        });
      }
    });
  }

  cambiarEstadoTarea(tarea: any) {
    const estadoActual = parseInt(tarea.id_estado_tarea);

    const opciones: any = {};
    this.estadosTareas.forEach((e: any) => {
      if (e.id !== estadoActual) {
        opciones[e.id] = e.nombre;
      }
    });

    Swal.fire({
      title: 'Cambiar estado',
      text: `Estado actual: ${tarea.nombre_estado}`,
      input: 'select',
      inputOptions: opciones,
      inputPlaceholder: 'Seleccione nuevo estado',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value: any) => {
        if (!value) return 'Debe seleccionar un estado';
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.tareasXSprintsService.actualizarEstado({
          id: tarea.id,
          id_estado_tarea: parseInt(result.value)
        }).subscribe({
          next: () => {
            Swal.fire({
              title: 'Estado actualizado',
              icon: 'success',
              confirmButtonColor: '#F5A623'
            });
            this.cargarTareasActividad(this.model.id);
          },
          error: (error: any) => {
            console.error('Error al cambiar estado', error);
            Swal.fire('Error', 'No se pudo cambiar el estado de la tarea.', 'error');
          }
        });
      }
    });
  }
}