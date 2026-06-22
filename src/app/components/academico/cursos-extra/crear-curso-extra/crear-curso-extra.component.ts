import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CursosExtraService } from '../../../../services/cursos-extra.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import { HorariosCursosExtraService } from '../../../../services/horarios-cursos-extra.service';
import { TarifasCursosExtraService } from '../../../../services/tarifas-cursos-extra.service';
import { DocentesXCursosExtraService } from '../../../../services/docentes-x-cursos-extra.service';
import { ProveedoresXCursosExtraService } from '../../../../services/proveedores-x-cursos-extra.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-curso-extra',
  templateUrl: './crear-curso-extra.component.html',
  styleUrl: './crear-curso-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearCursoExtraComponent implements OnInit {

  titulo = "Crear Curso Extracurricular";
  accion: string = "";
  regresar = '/academico/cursos-extra';
  editable: boolean = true;
  submitted: boolean = false;
  pestanaActiva: string = 'basico';

  menuMovilAbierto: boolean = false;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    icono: '',
    color: '#3498db',
    cupo_maximo: null,
    fecha_inicio: '',
    fecha_fin: '',
    anio: new Date().getFullYear(),
    activo: 1
  } as any;

  // Modal de imágenes
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  // Horarios
  diasSemana: any[] = [];
  horariosCurso: any[] = [];
  mostrarModalHorario: boolean = false;
  horarioModal = {
    id: null,
    id_dia_semana: null,
    hora_inicial: '',
    hora_final: '',
    total_minutos: 0
  } as any;

  // Docentes
  docentesCurso: any[] = [];
  docentesDisponibles: any[] = [];
  idDocenteSeleccionado: any = null;
  esTitularSeleccionado: boolean = false;

  // Proveedores
  proveedoresCurso: any[] = [];
  proveedoresDisponibles: any[] = [];
  idProveedorSeleccionado: any = null;

  // Tarifas
  tarifasCurso: any[] = [];
  productosMatricula: any[] = [];
  productosPension: any[] = [];
  productosUnico: any[] = [];
  aniosEscolares: number[] = [];
  anioTarifa: number = new Date().getFullYear();
  valorMatriculaFormateado: string = '';
  valorPensionFormateado: string = '';
  valorUnicoFormateado: string = '';
  tarifaActual: any = {
    id: null,
    id_curso_extra: null,
    id_producto_matricula: null,
    valor_matricula: 0,
    cuotas_matricula: 1,
    id_producto_pension: null,
    valor_pension: 0,
    id_producto_unico: null,
    valor_unico: 0,
    cuotas_unico: 1,
    anio: new Date().getFullYear()
  };

  constructor(
    private cursosExtraService: CursosExtraService,
    private productosServiciosService: ProductosServiciosService,
    private diasSemanaService: DiasSemanaService,
    private horariosCursosExtraService: HorariosCursosExtraService,
    private tarifasCursosExtraService: TarifasCursosExtraService,
    private docentesXCursosExtraService: DocentesXCursosExtraService,
    private proveedoresXCursosExtraService: ProveedoresXCursosExtraService,
    private proveedoresService: ProveedoresService,
    private institucionConfigService: InstitucionConfigService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Curso Extracurricular";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Curso Extracurricular";
        this.editable = true;
        this.cargarCurso(id);
        this.cargarHorarios(id);
        this.cargarDocentes(id);
        this.cargarProveedoresCurso(id);
        this.cargarTarifas(id);
        this.cargarProductosTarifas();
        this.cargarAniosEscolares();
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Curso Extracurricular";
        this.editable = false;
        this.cargarCurso(id);
        this.cargarHorarios(id);
        this.cargarDocentes(id);
        this.cargarProveedoresCurso(id);
        this.cargarTarifas(id);
      }
    });

    this.cargarDiasSemana();
    this.cargarImagenes();
    this.cargarDocentesDisponibles();
    this.cargarProveedoresDisponibles();
  }

  // ==================== DATOS BASICOS ====================

  cargarCurso(id: any) {
    this.cursosExtraService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = `Editar Curso: ${this.model.nombre}`;
          } else if (this.accion === 'consultar') {
            this.titulo = `Consultar Curso: ${this.model.nombre}`;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar curso", error);
        Swal.fire('Error', 'No se pudo cargar el curso', 'error');
      }
    });
  }

  cargarImagenes() {
    this.http.get<any>('assets/data/imagenes-cursos-extra.json').subscribe({
      next: (data: any) => {
        this.imagenesDisponibles = data.imagenes;
        this.imagenesFiltradas = data.imagenes;
      },
      error: (error: any) => {
        console.error("Error al cargar imágenes", error);
      }
    });
  }

  abrirModalImagenes() {
    this.mostrarModalImagenes = true;
    this.busquedaImagen = '';
    this.imagenesFiltradas = this.imagenesDisponibles;
  }

  cerrarModalImagenes() {
    this.mostrarModalImagenes = false;
  }

  seleccionarImagen(imagen: any) {
    this.model.icono = imagen.ruta;
    this.cerrarModalImagenes();
  }

  filtrarImagenes() {
    if (!this.busquedaImagen) {
      this.imagenesFiltradas = this.imagenesDisponibles;
    } else {
      this.imagenesFiltradas = this.imagenesDisponibles.filter((img: any) =>
        img.nombre.toLowerCase().includes(this.busquedaImagen.toLowerCase())
      );
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del curso es obligatorio', 'warning');
      return;
    }

    if (!this.model.fecha_inicio) {
      Swal.fire('Advertencia', 'La fecha de inicio es obligatoria', 'warning');
      return;
    }

    if (!this.model.fecha_fin) {
      Swal.fire('Advertencia', 'La fecha de fin es obligatoria', 'warning');
      return;
    }

    if (this.model.fecha_inicio > this.model.fecha_fin) {
      Swal.fire('Advertencia', 'La fecha de inicio no puede ser mayor a la fecha de fin', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion ? this.model.descripcion.trim() : '',
      icono: this.model.icono || '',
      color: this.model.color || '#3498db',
      cupo_maximo: this.model.cupo_maximo ? parseInt(this.model.cupo_maximo) : null,
      fecha_inicio: this.model.fecha_inicio,
      fecha_fin: this.model.fecha_fin,
      anio: parseInt(this.model.anio),
      activo: this.model.activo
    } as any;

    if (this.accion === 'crear') {
      this.cursosExtraService.crear(data).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Curso creado correctamente', 'success');
          this.router.navigate(['/academico/cursos-extra/editar/' + response.id]);
        },
        error: (error: any) => {
          console.error("Error al crear curso", error);
          Swal.fire('Error', 'No se pudo crear el curso', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.cursosExtraService.actualizar(data).subscribe({
        next: (response: any) => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Curso actualizado',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: (error: any) => {
          console.error("Error al actualizar curso", error);
          Swal.fire('Error', 'No se pudo actualizar el curso', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/cursos-extra']);
  }

  // ==================== PESTAÑAS ====================

  cambiarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  toggleMenuMovil() {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  getNombrePestana(): string {
    const nombres: any = {
      'basico': 'Datos Básicos',
      'horarios': 'Horarios',
      'responsables': 'Docentes y Proveedores',
      'tarifas': 'Tarifas'
    };
    return nombres[this.pestanaActiva] || '';
  }

  getIconoPestana(): string {
    const iconos: any = {
      'basico': 'fas fa-info-circle',
      'horarios': 'fas fa-clock',
      'responsables': 'fas fa-chalkboard-teacher',
      'tarifas': 'fas fa-dollar-sign'
    };
    return iconos[this.pestanaActiva] || '';
  }

  // ==================== HORARIOS ====================

  cargarDiasSemana() {
    this.diasSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar días de la semana", error);
      }
    });
  }

  cargarHorarios(id: any) {
    this.horariosCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.horariosCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar horarios", error);
      }
    });
  }

  abrirModalHorario() {
    this.horarioModal = {
      id: null,
      id_dia_semana: null,
      hora_inicial: '',
      hora_final: '',
      total_minutos: 0
    };
    this.mostrarModalHorario = true;
  }

  cerrarModalHorario() {
    this.mostrarModalHorario = false;
  }

  calcularMinutos() {
    if (this.horarioModal.hora_inicial && this.horarioModal.hora_final) {
      const [hi, mi] = this.horarioModal.hora_inicial.split(':').map(Number);
      const [hf, mf] = this.horarioModal.hora_final.split(':').map(Number);
      this.horarioModal.total_minutos = (hf * 60 + mf) - (hi * 60 + mi);
    }
  }

  guardarHorario() {
    if (!this.horarioModal.id_dia_semana) {
      Swal.fire('Advertencia', 'Debe seleccionar un día', 'warning');
      return;
    }
    if (!this.horarioModal.hora_inicial || !this.horarioModal.hora_final) {
      Swal.fire('Advertencia', 'Debe ingresar hora inicial y final', 'warning');
      return;
    }
    if (this.horarioModal.hora_inicial >= this.horarioModal.hora_final) {
      Swal.fire('Advertencia', 'La hora inicial debe ser menor a la hora final', 'warning');
      return;
    }

    this.calcularMinutos();

    const data = {
      id_curso_extra: this.model.id,
      id_dia_semana: parseInt(this.horarioModal.id_dia_semana),
      hora_inicial: this.horarioModal.hora_inicial,
      hora_final: this.horarioModal.hora_final,
      total_minutos: this.horarioModal.total_minutos
    } as any;

    if (this.horarioModal.id) {
      data.id = this.horarioModal.id;
      this.horariosCursosExtraService.actualizar(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario actualizado', showConfirmButton: false, timer: 2000 });
          this.cargarHorarios(this.model.id);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al actualizar horario", error);
          Swal.fire('Error', 'No se pudo actualizar el horario', 'error');
        }
      });
    } else {
      this.horariosCursosExtraService.crear(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario creado', showConfirmButton: false, timer: 2000 });
          this.cargarHorarios(this.model.id);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al crear horario", error);
          Swal.fire('Error', 'No se pudo crear el horario', 'error');
        }
      });
    }
  }

  editarHorario(horario: any) {
    this.horarioModal = { ...horario };
    this.mostrarModalHorario = true;
  }

  async eliminarHorario(horario: any) {
    const result = await Swal.fire({
      title: '¿Eliminar horario?',
      text: `${horario.nombre_dia}: ${horario.hora_inicial} - ${horario.hora_final}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.horariosCursosExtraService.eliminar({ id: horario.id }).subscribe({
        next: () => {
          this.cargarHorarios(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al eliminar horario", error);
          Swal.fire('Error', 'No se pudo eliminar el horario', 'error');
        }
      });
    }
  }

  // ==================== DOCENTES ====================

  cargarDocentesDisponibles() {
    this.http.get<any>(environment.api + 'docentes', { observe: 'response' }).subscribe({
      next: (response: any) => {
        this.docentesDisponibles = (response.body || []).filter((d: any) => d.activo == 1);
      },
      error: (error: any) => {
        console.error("Error al cargar docentes", error);
      }
    });
  }

  cargarDocentes(id: any) {
    this.docentesXCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.docentesCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar docentes del curso", error);
      }
    });
  }

  agregarDocente() {
    if (!this.idDocenteSeleccionado) {
      Swal.fire('Advertencia', 'Debe seleccionar un docente', 'warning');
      return;
    }

    const yaExiste = this.docentesCurso.find((d: any) => d.id_docente == this.idDocenteSeleccionado);
    if (yaExiste) {
      Swal.fire('Advertencia', 'El docente ya está asignado a este curso', 'warning');
      return;
    }

    const data = {
      id_docente: parseInt(this.idDocenteSeleccionado),
      id_curso_extra: this.model.id,
      es_titular: this.esTitularSeleccionado ? 1 : 0
    };

    this.docentesXCursosExtraService.crear(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Docente asignado', showConfirmButton: false, timer: 2000 });
        this.cargarDocentes(this.model.id);
        this.idDocenteSeleccionado = null;
        this.esTitularSeleccionado = false;
      },
      error: (error: any) => {
        console.error("Error al asignar docente", error);
        Swal.fire('Error', 'No se pudo asignar el docente', 'error');
      }
    });
  }

  async eliminarDocente(docente: any) {
    const result = await Swal.fire({
      title: '¿Quitar docente?',
      text: `¿Desea quitar a ${docente.nombre_completo} del curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.docentesXCursosExtraService.eliminar({ id: docente.id }).subscribe({
        next: () => {
          this.cargarDocentes(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al quitar docente", error);
          Swal.fire('Error', 'No se pudo quitar el docente', 'error');
        }
      });
    }
  }

  // ==================== PROVEEDORES ====================

  cargarProveedoresDisponibles() {
    this.proveedoresService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.proveedoresDisponibles = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar proveedores", error);
      }
    });
  }

  cargarProveedoresCurso(id: any) {
    this.proveedoresXCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.proveedoresCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar proveedores del curso", error);
      }
    });
  }

  agregarProveedor() {
    if (!this.idProveedorSeleccionado) {
      Swal.fire('Advertencia', 'Debe seleccionar un proveedor', 'warning');
      return;
    }

    const yaExiste = this.proveedoresCurso.find((p: any) => p.id_proveedor == this.idProveedorSeleccionado);
    if (yaExiste) {
      Swal.fire('Advertencia', 'El proveedor ya está asignado a este curso', 'warning');
      return;
    }

    const data = {
      id_proveedor: parseInt(this.idProveedorSeleccionado),
      id_curso_extra: this.model.id
    };

    this.proveedoresXCursosExtraService.crear(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Proveedor asignado', showConfirmButton: false, timer: 2000 });
        this.cargarProveedoresCurso(this.model.id);
        this.idProveedorSeleccionado = null;
      },
      error: (error: any) => {
        console.error("Error al asignar proveedor", error);
        Swal.fire('Error', 'No se pudo asignar el proveedor', 'error');
      }
    });
  }

  async eliminarProveedor(proveedor: any) {
    const result = await Swal.fire({
      title: '¿Quitar proveedor?',
      text: `¿Desea quitar a ${proveedor.nombre_completo} del curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.proveedoresXCursosExtraService.eliminar({ id: proveedor.id }).subscribe({
        next: () => {
          this.cargarProveedoresCurso(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al quitar proveedor", error);
          Swal.fire('Error', 'No se pudo quitar el proveedor', 'error');
        }
      });
    }
  }

  // ==================== TARIFAS ====================

  cargarProductosTarifas() {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const productos = response.body || [];
        this.productosMatricula = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 1
        );
        this.productosPension = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 2
        );
        this.productosUnico = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 4
        );
      },
      error: (error: any) => {
        console.error("Error al cargar productos para tarifas", error);
      }
    });
  }

  cargarTarifas(id: any) {
    this.tarifasCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.tarifasCurso = response.body || [];
        this.seleccionarTarifaAnio();
      },
      error: (error: any) => {
        console.error("Error al cargar tarifas", error);
      }
    });
  }

  cargarAniosEscolares() {
    const annos = this.institucionConfigService.getAnnosEscolares();
    this.aniosEscolares = annos.map((a: any) => a.id);
    if (this.aniosEscolares.length > 0 && !this.anioTarifa) {
      this.anioTarifa = this.aniosEscolares[0];
    }
  }

  seleccionarTarifaAnio() {
    const tarifaExistente = this.tarifasCurso.find(t => t.anio == this.anioTarifa);
    if (tarifaExistente) {
      this.tarifaActual = { ...tarifaExistente };
    } else {
      this.tarifaActual = {
        id: null,
        id_curso_extra: this.model.id,
        id_producto_matricula: null,
        valor_matricula: 0,
        cuotas_matricula: 1,
        id_producto_pension: null,
        valor_pension: 0,
        id_producto_unico: null,
        valor_unico: 0,
        cuotas_unico: 1,
        anio: this.anioTarifa
      };
    }
    this.valorMatriculaFormateado = this.formatearNumero(this.tarifaActual.valor_matricula);
    this.valorPensionFormateado = this.formatearNumero(this.tarifaActual.valor_pension);
    this.valorUnicoFormateado = this.formatearNumero(this.tarifaActual.valor_unico);
  }

  onAnioTarifaChange() {
    this.tarifaActual.anio = this.anioTarifa;
    this.seleccionarTarifaAnio();
  }

  formatearNumero(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  onValorMatriculaInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_matricula = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_matricula > 0) {
      event.target.value = this.tarifaActual.valor_matricula.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  onValorPensionInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_pension = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_pension > 0) {
      event.target.value = this.tarifaActual.valor_pension.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  onProductoMatriculaChange() {
    if (this.tarifaActual.id_producto_matricula) {
      const producto = this.productosMatricula.find((p: any) => p.id == this.tarifaActual.id_producto_matricula);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_matricula = producto.valor_sugerido;
        this.valorMatriculaFormateado = this.formatearNumero(this.tarifaActual.valor_matricula);
      }
    } else {
      this.tarifaActual.valor_matricula = 0;
      this.valorMatriculaFormateado = '';
    }
  }

  onProductoPensionChange() {
    if (this.tarifaActual.id_producto_pension) {
      const producto = this.productosPension.find((p: any) => p.id == this.tarifaActual.id_producto_pension);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_pension = producto.valor_sugerido;
        this.valorPensionFormateado = this.formatearNumero(this.tarifaActual.valor_pension);
      }
    } else {
      this.tarifaActual.valor_pension = 0;
      this.valorPensionFormateado = '';
    }
  }

  onProductoUnicoChange() {
    if (this.tarifaActual.id_producto_unico) {
      const producto = this.productosUnico.find((p: any) => p.id == this.tarifaActual.id_producto_unico);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_unico = producto.valor_sugerido;
        this.valorUnicoFormateado = this.formatearNumero(this.tarifaActual.valor_unico);
      }
    } else {
      this.tarifaActual.valor_unico = 0;
      this.valorUnicoFormateado = '';
    }
  }

  onValorUnicoInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_unico = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_unico > 0) {
      event.target.value = this.tarifaActual.valor_unico.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  guardarTarifa() {
    const data = {
      id_curso_extra: this.model.id,
      id_producto_matricula: this.tarifaActual.id_producto_matricula ? parseInt(this.tarifaActual.id_producto_matricula) : null,
      valor_matricula: this.tarifaActual.valor_matricula || 0,
      cuotas_matricula: this.tarifaActual.cuotas_matricula ? parseInt(this.tarifaActual.cuotas_matricula) : 1,
      id_producto_pension: this.tarifaActual.id_producto_pension ? parseInt(this.tarifaActual.id_producto_pension) : null,
      valor_pension: this.tarifaActual.valor_pension || 0,
      id_producto_unico: this.tarifaActual.id_producto_unico ? parseInt(this.tarifaActual.id_producto_unico) : null,
      valor_unico: this.tarifaActual.valor_unico || 0,
      cuotas_unico: this.tarifaActual.cuotas_unico ? parseInt(this.tarifaActual.cuotas_unico) : 1,
      anio: parseInt(this.tarifaActual.anio)
    } as any;

    if (this.tarifaActual.id) {
      data.id = parseInt(this.tarifaActual.id);
      this.tarifasCursosExtraService.actualizar(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa actualizada', showConfirmButton: false, timer: 2000 });
          this.cargarTarifas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al actualizar tarifa", error);
          Swal.fire('Error', 'No se pudo actualizar la tarifa', 'error');
        }
      });
    } else {
      this.tarifasCursosExtraService.crear(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa creada', showConfirmButton: false, timer: 2000 });
          this.cargarTarifas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al crear tarifa", error);
          Swal.fire('Error', 'No se pudo crear la tarifa', 'error');
        }
      });
    }
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }) || '$0';
  }
}