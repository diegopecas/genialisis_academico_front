import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { IndicadoresLogrosService } from '../../../../services/indicadores-logros.service';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';
import { ActividadesAcademicasXIndicadoresLogrosService } from '../../../../services/actividades-academicas-x-indicadores-logros.service';
import { TiposActividadesAcademicasService } from '../../../../services/tipos-actividades-academicas.service';
import { TablasComponent } from '../../../../common/tablas/tablas.component';

// Declarar bootstrap globalmente
declare var bootstrap: any;

// Interfaz para el modelo del indicador
interface IndicadorLogroModel {
  id: number;
  nombre: string;
  id_logro: number;
  nombre_logro: string;
  id_grado: number;
  nombre_grado: string;
  id_area_academica: number;
  area_academica_nombre: string;
  id_eje_curricular: number;
  eje_curricular_nombre: string;
  id_esfera_desarrollo: number;
  esfera_desarrollo_nombre: string;
  id_competencia_cognitiva: number;
  competencia_cognitiva_nombre: string;
  id_estandar_basico: number;
  estandar_basico_nombre: string;
  id_corte_academico: number;
  corte_academico_nombre: string;
}

// Tipo para datos parciales del indicador (cuando vienen del servicio)
type IndicadorLogroParcial = Partial<IndicadorLogroModel>;

@Component({
  selector: 'app-editar-indicadores-logros',
  templateUrl: './editar-indicadores-logros.component.html',
  styleUrl: './editar-indicadores-logros.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class EditarIndicadoresLogrosComponent implements OnInit, OnDestroy {
  public titulo = "Indicadores de Logro";
  public id = "0";
  public accion = "";
  public editable = false;
  public titulosActividades: any[] = [];
  public submitted = false;

  private modalInstance: any = null;

  // Variables para el modal de actividades
  public actividadesSeleccionadas: any[] = [];
  public actividadSubmitted = false;
  public actividadesDisponibles: any[] = [];
  public actividadesBusqueda = '';
  public filtroTipo = '';
  public tiposActividades: any[] = [];

  public datosActividadesAcademicas: any[] = [];

  public model: IndicadorLogroModel = {
    id: 0,
    nombre: "",
    id_logro: 0,
    nombre_logro: "",
    id_grado: 0,
    nombre_grado: "",
    id_area_academica: 0,
    area_academica_nombre: "",
    id_eje_curricular: 0,
    eje_curricular_nombre: "",
    id_esfera_desarrollo: 0,
    esfera_desarrollo_nombre: "",
    id_competencia_cognitiva: 0,
    competencia_cognitiva_nombre: "",
    id_estandar_basico: 0,
    estandar_basico_nombre: "",
    id_corte_academico: 0,
    corte_academico_nombre: ""
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private indicadoresLogrosService: IndicadoresLogrosService,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private actividadesXIndicadoresService: ActividadesAcademicasXIndicadoresLogrosService,
    private tiposActividadesService: TiposActividadesAcademicasService
  ) { }

  // Método helper para crear un modelo con valores por defecto
  private crearModeloVacio(): IndicadorLogroModel {
    return {
      id: 0,
      nombre: "",
      id_logro: 0,
      nombre_logro: "",
      id_grado: 0,
      nombre_grado: "",
      id_area_academica: 0,
      area_academica_nombre: "",
      id_eje_curricular: 0,
      eje_curricular_nombre: "",
      id_esfera_desarrollo: 0,
      esfera_desarrollo_nombre: "",
      id_competencia_cognitiva: 0,
      competencia_cognitiva_nombre: "",
      id_estandar_basico: 0,
      estandar_basico_nombre: "",
      id_corte_academico: 0,
      corte_academico_nombre: ""
    };
  }

  // Método helper para asegurar que el modelo tenga todas las propiedades
  private asignarModelo(datosParciales: IndicadorLogroParcial): void {
    this.model = {
      ...this.crearModeloVacio(),
      ...datosParciales
    };
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      console.log("EditarIndicadoresLogrosComponent", this.accion, this.id)

      // Inicializar el modelo con valores por defecto
      this.model = this.crearModeloVacio();

      // Establecer título inicial según la acción
      switch (this.accion) {
        case 'editar':
          this.titulo = "Editar Indicador de Logro";
          this.editable = true;
          this.consultarListas();
          this.obtenerIndicador(this.id);
          break;
        case 'consultar':
          this.titulo = "Consultar Indicador de Logro";
          this.editable = false;
          this.consultarListas();
          this.obtenerIndicador(this.id);
          break;
      }
    });
  }

  ngOnDestroy() {
    // Cerrar modal si está abierto
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  crearTitulosActividades() {
    this.titulosActividades = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'titulo',
        alias: 'Título de la Actividad',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_actividad',
        alias: 'Tipo',
        alinear: 'centrado',
      },
      {
        clave: 'minutos_duracion',
        alias: 'Duración (min)',
        alinear: 'centrado',
      }
    ];
  }

  consultarListas() {
    // Cargar tipos de actividades
    this.tiposActividadesService.obtenerTodos().subscribe((response: any) => {
      const tipos = response.body;
      // Extraer tipos únicos de las actividades
      const tiposSet = new Set<string>();
      tipos.forEach((tipo: any) => {
        if (tipo.nombre) {
          tiposSet.add(tipo.nombre);
        }
      });
      this.tiposActividades = Array.from(tiposSet).map(nombre => ({ nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
    });

    // Cargar todas las actividades académicas disponibles
    this.actividadesAcademicasService.obtenerTodos().subscribe((response: any) => {
      this.actividadesDisponibles = response.body;
    });
  }

  obtenerIndicador(id_indicador: any) {
    // Usar directamente el servicio getById que trae toda la información
    this.indicadoresLogrosService.obtenerById(id_indicador).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Indicador completo del servicio getById:", body);

        if (body && body.length > 0) {
          const indicadorCompleto = body[0];

          // Usar el método helper para asignar el modelo con TODAS las propiedades
          this.asignarModelo({
            id: indicadorCompleto.id || 0,
            nombre: indicadorCompleto.nombre || '',
            id_logro: indicadorCompleto.id_logro || 0,
            nombre_logro: indicadorCompleto.nombre_logro || 'No disponible',
            id_grado: indicadorCompleto.id_grado || 0,
            nombre_grado: indicadorCompleto.nombre_grado || 'No disponible',
            id_area_academica: indicadorCompleto.id_area_academica || 0,
            area_academica_nombre: indicadorCompleto.area_academica_nombre || 'No disponible',
            id_eje_curricular: indicadorCompleto.id_eje_curricular || 0,
            eje_curricular_nombre: indicadorCompleto.eje_curricular_nombre || 'No especificado',
            id_esfera_desarrollo: indicadorCompleto.id_esfera_desarrollo || 0,
            esfera_desarrollo_nombre: indicadorCompleto.esfera_desarrollo_nombre || 'No especificado',
            id_competencia_cognitiva: indicadorCompleto.id_competencia_cognitiva || 0,
            competencia_cognitiva_nombre: indicadorCompleto.competencia_cognitiva_nombre || 'No especificado',
            id_estandar_basico: indicadorCompleto.id_estandar_basico || 0,
            estandar_basico_nombre: indicadorCompleto.estandar_basico_nombre || 'No especificado',
            id_corte_academico: indicadorCompleto.id_corte_academico || 0,
            corte_academico_nombre: indicadorCompleto.corte_academico_nombre || 'No especificado'
          });

          // Actualizar el título según la acción
          if (this.model.nombre) {
            if (this.accion === 'editar') {
              this.titulo = `Editar: ${this.model.nombre}`;
            } else if (this.accion === 'consultar') {
              this.titulo = `Consultar: ${this.model.nombre}`;
            }
          }
        }
      },
      error: (error: any) => {
        console.error("Error al obtener indicador:", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar la información del indicador.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });

    this.getActividadesByIndicador(id_indicador);
  }

  grabar() {
    console.log("grabar", this.model);
    this.submitted = true;

    if (this.accion === "editar" && this.formularioValido()) {
      // Solo actualizamos el nombre del indicador
      const datosActualizar = {
        id: this.model.id,
        nombre: this.model.nombre,
        id_logro: this.model.id_logro
      };

      this.indicadoresLogrosService.actualizar(datosActualizar).subscribe((response: any) => {
        console.log("editar response", response);
        const data = response.id;
        if (data) {
          Swal.fire({
            title: 'Indicador actualizado con éxito',
            text: 'Los cambios han sido guardados correctamente.',
            icon: "success",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#F5A623'
          }).then(() => {
            this.router.navigate(['academico/indicadores-logros/']);
          });
        } else {
          Swal.fire({
            title: 'Error al actualizar el indicador',
            text: 'Ha ocurrido un error al intentar actualizar el indicador. Por favor, intente nuevamente.',
            icon: "error",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar"
          })
          console.log("Error al actualizar indicador.");
        }
      })
    }
  }

  formularioValido(): boolean {
    return !!(this.model.nombre && this.model.nombre.trim().length > 0);
  }

  getActividadesByIndicador(id: any) {
    this.actividadesXIndicadoresService.obtenerByIndicador(id).subscribe((response: any) => {
      const actividades = response.body || [];
      console.log("Actividades asociadas al indicador:", actividades);

      // Mapear los datos correctamente según la estructura del servicio
      this.datosActividadesAcademicas = actividades.map((act: any) => ({
        id: act.id,
        id_actividad_academica: act.id_actividad_academica,
        id_indicador_logro: act.id_indicador_logro,
        titulo: act.titulo_actividad || 'Sin título',
        descripcion: act.descripcion_actividad || '',
        nombre_tipo_actividad: 'Sin tipo',
        minutos_duracion: 0
      }));

      // Si necesitamos información adicional de las actividades, hacer una segunda llamada
      if (actividades.length > 0) {
        this.enriquecerDatosActividades();
      }

      this.crearTitulosActividades();
    });
  }

  enriquecerDatosActividades() {
    // Obtener todas las actividades para enriquecer los datos
    this.actividadesAcademicasService.obtenerTodos().subscribe((response: any) => {
      const todasActividades = response.body || [];

      // Enriquecer cada actividad asociada con información completa
      this.datosActividadesAcademicas = this.datosActividadesAcademicas.map((actAsociada: any) => {
        const actividadCompleta = todasActividades.find((act: any) => act.id == actAsociada.id_actividad_academica);

        if (actividadCompleta) {
          return {
            ...actAsociada,
            titulo: actividadCompleta.titulo || actAsociada.titulo,
            nombre_tipo_actividad: actividadCompleta.nombre_tipo_actividad || 'Sin tipo',
            minutos_duracion: actividadCompleta.minutos_duracion || 0,
            materiales: actividadCompleta.materiales || ''
          };
        }

        return actAsociada;
      });
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
          this.router.navigate(['academico/indicadores-logros/']);
        }
      });
    } else {
      this.router.navigate(['academico/indicadores-logros/']);
    }
  }

  formularioModificado(): boolean {
    // Verificar si el nombre ha sido modificado
    return this.model.nombre !== "";
  }

  seleccionarActividad(event: any) {
    console.log("seleccionarActividad", event);

    if (event.accion === 'eliminar') {
      const actividad = this.datosActividadesAcademicas.find((a: any) => a.id === event.id);
      if (actividad) {
        this.eliminarActividadAsociada(actividad);
      }
    }

    if (event.accion === 'consultar') {
      // Navegar a la vista de consulta de la actividad usando el id correcto
      const actividad = this.datosActividadesAcademicas.find((a: any) => a.id === event.id);
      if (actividad && actividad.id_actividad_academica) {
        this.router.navigate(['/academico/actividades-academicas/consultar/' + actividad.id_actividad_academica]);
      }
    }
  }

  // Métodos para manejar el modal de actividades
  abrirModalActividad() {
    this.actividadSubmitted = false;
    this.actividadesSeleccionadas = [];
    this.actividadesBusqueda = '';
    this.filtroTipo = '';

    const modalElement = document.getElementById('modalActividad');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement);
      this.modalInstance.show();
    }
  }

  cerrarModalActividad() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
    this.actividadesSeleccionadas = [];
    this.filtroTipo = '';
    this.actividadesBusqueda = '';
  }

  asociarActividades() {
    this.actividadSubmitted = true;

    if (!this.actividadesSeleccionadas || this.actividadesSeleccionadas.length === 0) {
      return;
    }

    const totalActividades = this.actividadesSeleccionadas.length;
    let asociadas = 0;
    let errores = 0;
    let duplicadas = 0;

    // Mostrar loading
    Swal.fire({
      title: 'Asociando actividades',
      html: `Procesando ${totalActividades} actividad${totalActividades > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Procesar cada actividad seleccionada
    const promesas = this.actividadesSeleccionadas.map(actividad => {
      const body = {
        id_actividad_academica: actividad.id,
        id_indicador_logro: this.id
      };

      return this.actividadesXIndicadoresService.crear(body).toPromise()
        .then(() => {
          asociadas++;
        })
        .catch((error) => {
          if (error.status === 409) {
            duplicadas++;
          } else {
            errores++;
          }
          console.error(`Error al asociar actividad ${actividad.titulo}:`, error);
        });
    });

    // Esperar a que todas las promesas terminen
    Promise.all(promesas).then(() => {
      let mensaje = '';
      let icon: any = 'success';

      if (asociadas === totalActividades) {
        mensaje = `${asociadas} actividad${asociadas > 1 ? 'es asociadas' : ' asociada'} correctamente.`;
      } else {
        icon = 'warning';
        mensaje = `Proceso completado:<br>`;
        if (asociadas > 0) mensaje += `✓ ${asociadas} actividad${asociadas > 1 ? 'es asociadas' : ' asociada'}<br>`;
        if (duplicadas > 0) mensaje += `⚠ ${duplicadas} ya estaba${duplicadas > 1 ? 'n' : ''} asociada${duplicadas > 1 ? 's' : ''}<br>`;
        if (errores > 0) mensaje += `✗ ${errores} error${errores > 1 ? 'es' : ''}`;
      }

      Swal.fire({
        title: 'Proceso completado',
        html: mensaje,
        icon: icon,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#F5A623'
      }).then(() => {
        this.cerrarModalActividad();
        this.getActividadesByIndicador(this.id);
      });
    });
  }

  eliminarActividadAsociada(actividad: any) {
    const tituloActividad = actividad.titulo || actividad.titulo_actividad || 'Sin título';

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar la actividad "${tituloActividad}" de este indicador?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const body = {
          id_actividad_academica: actividad.id_actividad_academica,
          id_indicador_logro: this.id
        };

        this.actividadesXIndicadoresService.eliminar(body).subscribe({
          next: (response: any) => {
            console.log('Respuesta desasociación:', response);
            Swal.fire({
              title: 'Desasociada',
              text: 'La actividad académica ha sido desasociada del indicador.',
              icon: 'success',
              confirmButtonColor: '#F5A623'
            });
            this.getActividadesByIndicador(this.id);
          },
          error: (error: any) => {
            console.error('Error al desasociar actividad:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo desasociar la actividad. Por favor, intente nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }

  get actividadesFiltradas() {
    let actividades = this.actividadesDisponibles;

    // Filtrar por búsqueda de texto
    if (this.actividadesBusqueda) {
      const busqueda = this.actividadesBusqueda.toLowerCase();
      actividades = actividades.filter((actividad: any) =>
        actividad.titulo.toLowerCase().includes(busqueda)
      );
    }

    // Filtrar por tipo
    if (this.filtroTipo) {
      actividades = actividades.filter((actividad: any) =>
        actividad.nombre_tipo_actividad === this.filtroTipo
      );
    }

    return actividades;
  }

  toggleActividadSeleccion(actividad: any) {
    const index = this.actividadesSeleccionadas.findIndex(a => a.id === actividad.id);
    if (index === -1) {
      // Agregar a la selección
      this.actividadesSeleccionadas.push(actividad);
    } else {
      // Remover de la selección
      this.actividadesSeleccionadas.splice(index, 1);
    }
  }

  isActividadSeleccionada(actividad: any): boolean {
    return this.actividadesSeleccionadas.some(a => a.id === actividad.id);
  }

  seleccionarTodas() {
    this.actividadesSeleccionadas = [...this.actividadesFiltradas];
  }

  deseleccionarTodas() {
    this.actividadesSeleccionadas = [];
  }
}