import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { LogrosService } from '../../../../services/logros.service';
import { GradosService } from '../../../../services/grados.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { EsferasDesarrolloService } from '../../../../services/esferas-desarrollo.service';
import { EjesCurricularesService } from '../../../../services/ejes-curriculares.service';
import { CompetenciasCognitivasService } from '../../../../services/competencias-cognitivas.service';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import { EstandaresBasicosService } from '../../../../services/estandares-basicos.service';
import { IndicadoresLogrosService } from '../../../../services/indicadores-logros.service';
import { ActividadesAcademicasXIndicadoresLogrosService } from '../../../../services/actividades-academicas-x-indicadores-logros.service';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { forkJoin } from 'rxjs';

// Declarar bootstrap globalmente
declare var bootstrap: any;

@Component({
  selector: 'app-crear-logros',
  templateUrl: './crear-logros.component.html',
  styleUrl: './crear-logros.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class CrearLogrosComponent implements OnInit, OnDestroy {
  public titulo = "logros";
  public tituloHeader = "logros";
  public id = "0";
  public accion = "";
  public editable = false;
  public nuevo = false;
  public titulos = [] as any[];
  public submitted = false;
  public caracteresRestantes = 3000;
  private modalInstance: any = null;

  // Variables para el modal de indicadores
  public nuevoIndicador = {
    nombre: '',
    id_logro: ''
  };
  public indicadorSubmitted = false;
  public editandoIndicador = false;
  public indicadorEditando: any = null;

  public listas = {
    grados: [] as any[],
    areasAcademicas: [] as any[],
    esferasDesarrollo: [] as any[],
    ejesCurriculares: [] as any[],
    competenciasCognitivas: [] as any[],
    cortesAcademicos: [] as any[],
    estandaresBasicos: [] as any[]
  }

  public datosIndicadoresLogro = [] as any[];
  public actividadesAsociadas = [] as any[];

  public model = {
    id: 0 as any,
    id_grado: "",
    id_area_academica: "",
    id_esfera_desarrollo: "",
    id_eje_curricular: "",
    id_competencia_cognitiva: "",
    id_estandar_basico: "",
    id_corte_academico: "",
    nombre: ""
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private logrosService: LogrosService,
    private gradosService: GradosService,
    private areasAcademicasService: AreasAcademicasService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private ejesCurricularesService: EjesCurricularesService,
    private competenciasCognitivasService: CompetenciasCognitivasService,
    private cortesAcademicosService: CortesAcademicosService,
    private estandaresBasicosService: EstandaresBasicosService,
    private indicadoresLogrosService: IndicadoresLogrosService,
    private actividadesAcademicasXIndicadoresLogrosService: ActividadesAcademicasXIndicadoresLogrosService,
    private actividadesAcademicasService: ActividadesAcademicasService
  ) { }

  ngOnInit() {
    this.route.params
      .subscribe(params => {
        this.accion = params['accion'];
        this.id = params['id'];
        console.log("CrearLogrosComponent", this.accion, this.id)
        switch (this.accion) {
          case 'crear':
            this.editable = true;
            this.nuevo = true;
            this.consultarListas();
            break;
          case 'editar':
            this.editable = true;
            this.nuevo = false;
            this.consultarListas();
            this.obtenerLogro(this.id);
            break;
          case 'consultar':
            this.editable = false;
            this.nuevo = false;
            this.consultarListas();
            this.obtenerLogro(this.id);
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

  actualizarContadorCaracteres() {
    const longitudTexto = this.model.nombre ? this.model.nombre.length : 0;
    this.caracteresRestantes = 3000 - longitudTexto;
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Descripción del Indicador',
        alinear: 'izquierda',
      }
    ];
  }

  consultarListas() {
    // Cargar grados
    this.gradosService.obtenerTodos().subscribe((response: any) => {
      this.listas.grados = response.body;
    });

    // Cargar áreas académicas
    this.areasAcademicasService.obtenerTodos().subscribe((response: any) => {
      this.listas.areasAcademicas = response.body;
    });

    // Cargar esferas de desarrollo
    this.esferasDesarrolloService.obtenerTodos().subscribe((response: any) => {
      this.listas.esferasDesarrollo = response.body;
    });

    // Cargar ejes curriculares
    this.ejesCurricularesService.obtenerTodos().subscribe((response: any) => {
      this.listas.ejesCurriculares = response.body;
    });

    // Cargar competencias cognitivas
    this.competenciasCognitivasService.obtenerTodos().subscribe((response: any) => {
      this.listas.competenciasCognitivas = response.body;
    });

    // Cargar cortes académicos
    this.cortesAcademicosService.obtenerTodos().subscribe((response: any) => {
      this.listas.cortesAcademicos = response.body;
    });

    // Cargar estándares básicos
    this.estandaresBasicosService.obtenerTodos().subscribe((response: any) => {
      this.listas.estandaresBasicos = response.body;
    });
  }

  obtenerLogro(id_logro: any) {
    this.logrosService.obtenerById(id_logro).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerLogro", body);
      this.model = body[0];

      // Actualizar el título del header con el nombre del logro
      if (this.model.nombre) {
        const nombreCorto = this.model.nombre.length > 50
          ? this.model.nombre.substring(0, 50) + '...'
          : this.model.nombre;
        this.tituloHeader = `Logro: ${nombreCorto}`;
      }

      // Actualizar contador de caracteres
      this.actualizarContadorCaracteres();
    });
    this.getIndicadoresLogrosByLogro(id_logro);
  }

  grabar() {
    console.log("grabar", this.model);
    this.submitted = true;

    if (this.accion === "crear" && this.formularioValido()) {
      this.logrosService.crear(this.model).subscribe((response: any) => {
        console.log("crear response", response);
        const data = response.id;
        if (data) {
          Swal.fire({
            title: 'Logro creado con éxito',
            text: 'El logro académico ha sido registrado correctamente.',
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
            title: 'Error al crear el logro',
            text: 'Ha ocurrido un error al intentar crear el logro. Por favor, intente nuevamente.',
            icon: "error",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar"
          })
          console.log("Error al crear logro.");
        }
      })
    }
    if (this.accion === "editar" && this.formularioValido()) {
      this.logrosService.actualizar(this.model).subscribe((response: any) => {
        console.log("editar response", response);
        const data = response.id;
        if (data) {
          Swal.fire({
            title: 'Logro actualizado con éxito',
            text: 'Los cambios han sido guardados correctamente.',
            icon: "success",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#F5A623'
          }).then(() => {
            this.router.navigate(['academico/logros/']);
          });
        } else {
          Swal.fire({
            title: 'Error al actualizar el logro',
            text: 'Ha ocurrido un error al intentar actualizar el logro. Por favor, intente nuevamente.',
            icon: "error",
            showCancelButton: false,
            focusConfirm: true,
            confirmButtonText: "Aceptar"
          })
          console.log("Error al actualizar logro.");
        }
      })
    }
  }

  limpiarFormulario() {
    this.model = {
      id: 0 as any,
      id_grado: "",
      id_area_academica: "",
      id_esfera_desarrollo: "",
      id_eje_curricular: "",
      id_competencia_cognitiva: "",
      id_estandar_basico: "",
      id_corte_academico: "",
      nombre: ""
    };

    this.caracteresRestantes = 3000;
    this.submitted = false;
    this.tituloHeader = "logros";
  }

  formularioValido() {
    const camposValidos = !!(this.model.id_grado &&
      this.model.id_area_academica &&
      this.model.id_esfera_desarrollo &&
      this.model.id_eje_curricular &&
      this.model.id_competencia_cognitiva &&
      this.model.id_estandar_basico &&
      this.model.id_corte_academico &&
      this.model.nombre &&
      this.model.nombre.trim().length > 0);

    return camposValidos;
  }

  getIndicadoresLogrosByLogro(id: any) {
    this.logrosService.getIndicadoresLogrosByLogro(id).subscribe((response: any) => {
      this.datosIndicadoresLogro = response.body || [];
      this.crearTitulos();

      // Cargar las actividades asociadas usando el método optimizado
      this.cargarActividadesAsociadas();
    });
  }

  cargarActividadesAsociadas() {
    // Una sola llamada HTTP para obtener todas las actividades del logro
    this.actividadesAcademicasXIndicadoresLogrosService.obtenerByLogro(this.id).subscribe(
      (response: any) => {
        const actividades = response.body || [];

        // Mapear las actividades al formato esperado
        this.actividadesAsociadas = actividades.map((actividad: any) => ({
          id: actividad.actividad_id,
          titulo: actividad.actividad_titulo,
          descripcion: actividad.actividad_descripcion,
          nivel_uno: actividad.actividad_nivel_uno,
          nivel_dos: actividad.actividad_nivel_dos,
          minutos_duracion: actividad.actividad_minutos_duracion,
          materiales: actividad.actividad_materiales,
          id_tipo_actividad_academica: actividad.actividad_id_tipo,
          nombre_tipo_actividad: actividad.actividad_tipo_nombre,
          indicador_nombre: actividad.indicadores_nombres || actividad.indicador_nombre
        }));

        console.log('Actividades cargadas:', this.actividadesAsociadas);
      },
      (error) => {
        console.error('Error al cargar actividades asociadas:', error);
        this.actividadesAsociadas = [];
      }
    );
  }

  verDetalleActividad(idActividad: number) {
    this.router.navigate(['/academico/actividades-academicas/consultar', idActividad]);
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
          this.router.navigate(['academico/logros/']);
        }
      });
    } else {
      this.router.navigate(['academico/logros/']);
    }
  }

  formularioModificado(): boolean {
    return !!(this.model.id_grado !== "" ||
      this.model.id_area_academica !== "" ||
      this.model.id_esfera_desarrollo !== "" ||
      this.model.id_eje_curricular !== "" ||
      this.model.id_competencia_cognitiva !== "" ||
      this.model.id_estandar_basico !== "" ||
      this.model.id_corte_academico !== "" ||
      (this.model.nombre && this.model.nombre.trim().length > 0));
  }

  seleccionarIndicador(event: any) {
    console.log("seleccionarIndicador", event);

    if (event.accion === 'editar') {
      const indicador = this.datosIndicadoresLogro.find(i => i.id === event.id);
      if (indicador) {
        this.editandoIndicador = true;
        this.indicadorEditando = indicador;
        this.nuevoIndicador = {
          nombre: indicador.nombre,
          id_logro: this.id
        };
        this.abrirModalIndicador();
      }
    } else if (event.accion === 'eliminar') {
      const indicador = this.datosIndicadoresLogro.find(i => i.id === event.id);
      if (indicador) {
        this.eliminarIndicador(indicador);
      }
    } else if (event.accion === 'consultar') {
      this.router.navigate(['academico/indicadores-logros/consultar', event.id]);
    }
  }

  // Métodos para manejar el modal de indicadores
  abrirModalIndicador() {
    this.indicadorSubmitted = false;
    if (!this.editandoIndicador) {
      this.nuevoIndicador = {
        nombre: '',
        id_logro: this.id
      };
    }

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
    this.editandoIndicador = false;
    this.indicadorEditando = null;
    this.nuevoIndicador = {
      nombre: '',
      id_logro: this.id
    };
  }

  guardarIndicador() {
    this.indicadorSubmitted = true;

    if (!this.nuevoIndicador.nombre || this.nuevoIndicador.nombre.trim().length === 0) {
      return;
    }

    if (this.editandoIndicador && this.indicadorEditando) {
      // Actualizar indicador existente
      const indicadorActualizar = {
        id: this.indicadorEditando.id,
        nombre: this.nuevoIndicador.nombre,
        id_logro: this.id
      };

      this.indicadoresLogrosService.actualizar(indicadorActualizar).subscribe((response: any) => {
        console.log("Indicador actualizado", response);
        if (response.id) {
          Swal.fire({
            title: 'Indicador actualizado',
            text: 'El indicador de logro ha sido actualizado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#F5A623'
          });
          this.cerrarModalIndicador();
          this.getIndicadoresLogrosByLogro(this.id);
        }
      }, (error) => {
        console.error("Error al actualizar indicador", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el indicador de logro.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      });
    } else {
      // Crear nuevo indicador
      this.indicadoresLogrosService.crear(this.nuevoIndicador).subscribe((response: any) => {
        console.log("Indicador creado", response);
        if (response.id) {
          Swal.fire({
            title: 'Indicador creado',
            text: 'El indicador de logro ha sido agregado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#F5A623'
          });
          this.cerrarModalIndicador();
          this.getIndicadoresLogrosByLogro(this.id);
        }
      }, (error) => {
        console.error("Error al crear indicador", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo crear el indicador de logro.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      });
    }
  }

  eliminarIndicador(indicador: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el indicador "${indicador.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.indicadoresLogrosService.eliminar({ id: indicador.id }).subscribe((response: any) => {
          console.log("Indicador eliminado", response);
          Swal.fire({
            title: 'Eliminado',
            text: 'El indicador de logro ha sido eliminado.',
            icon: 'success',
            confirmButtonColor: '#F5A623'
          });
          this.getIndicadoresLogrosByLogro(this.id);
        }, (error) => {
          console.error("Error al eliminar indicador", error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo eliminar el indicador de logro.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        });
      }
    });
  }
}