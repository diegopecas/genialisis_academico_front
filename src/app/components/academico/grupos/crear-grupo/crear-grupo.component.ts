import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GruposService } from '../../../../services/grupos.service';
import { GradosService } from '../../../../services/grados.service';
import { GradosXGrupoService } from '../../../../services/grados-x-grupo.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { AreaAcademicaXGrupoService } from '../../../../services/area-academica-x-grupo.service';
import { HorariosService } from '../../../../services/horarios.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import { TarifasGruposService } from '../../../../services/tarifas-grupos.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-grupo',
  templateUrl: './crear-grupo.component.html',
  styleUrl: './crear-grupo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearGrupoComponent implements OnInit {

  titulo = "Crear Grupo";
  accion: string = "";
  regresar = '/academico/grupos';
  editable: boolean = true;
  submitted: boolean = false;
  pestanaActiva: string = 'basico';

  // Menú móvil para tabs
  menuMovilAbierto: boolean = false;

  // Modal de imágenes
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  // Grados disponibles y asociados
  gradosDisponibles: any[] = [];
  gradosAsociados: any[] = [];
  gradosSeleccionados: { [key: string]: boolean } = {};

  // Áreas académicas disponibles y asociadas
  areasDisponibles: any[] = [];
  areasAsociadas: any[] = [];
  areasSeleccionadas: { [key: string]: boolean } = {};

  // Horarios
  diasSemana: any[] = [];
  horariosGrupo: any[] = [];
  horasDelDia: string[] = [];
  areasSeleccionadasFiltro: { [key: string]: boolean } = {};
  mostrarModalHorario: boolean = false;
  horarioErrorSolapamiento: string = '';
  horarioModal = {
    id: null,
    id_area_academica: null,
    id_dia_semana: null,
    hora_inicial: '',
    hora_final: '',
    total_minutos: 0,
    total_clases: 1
  } as any;

  // Tarifas
  tarifasGrupo: any[] = [];
  productosMatricula: any[] = [];
  productosPension: any[] = [];
  aniosEscolares: number[] = [];
  anioTarifa: number = new Date().getFullYear();
  valorMatriculaFormateado: string = '';
  valorPensionFormateado: string = '';
  tarifaActual: any = {
    id: null,
    id_grupo: null,
    id_producto_matricula: null,
    id_producto_pension: null,
    valor_matricula: 0,
    valor_pension: 0,
    anio: new Date().getFullYear()
  };

  model = {
    id: null,
    nombre: '',
    icono: '',
    color: '#000000',
    calificable: 0,
    orden: 1
  } as any;

  constructor(
    private gruposService: GruposService,
    private gradosService: GradosService,
    private gradosXGrupoService: GradosXGrupoService,
    private areasAcademicasService: AreasAcademicasService,
    private areaAcademicaXGrupoService: AreaAcademicaXGrupoService,
    private horariosService: HorariosService,
    private diasSemanaService: DiasSemanaService,
    private tarifasGruposService: TarifasGruposService,
    private productosServiciosService: ProductosServiciosService,
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
        this.titulo = "Crear Grupo";
        this.editable = true;
        this.obtenerUltimoOrden();
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Grupo";
        this.editable = true;
        this.cargarGrupo(id);
        this.cargarGradosDisponibles(id);
        this.cargarGradosAsociados(id);
        this.cargarAreasDisponibles(id);
        this.cargarAreasAsociadas(id);
        this.cargarHorarios(id);
        this.cargarTarifasGrupo(id);
        this.cargarProductos();
        this.cargarAniosEscolares();
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Grupo";
        this.editable = false;
        this.cargarGrupo(id);
        this.cargarGradosAsociados(id);
        this.cargarAreasAsociadas(id);
      }
    });

    this.cargarImagenes();
    this.cargarDiasSemana();
  }

  obtenerUltimoOrden() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        const grupos = response.body as any[];
        if (grupos && grupos.length > 0) {
          const maxOrden = Math.max(...grupos.map(g => g.orden || 0));
          this.model.orden = maxOrden + 1;
        }
      },
      error: (error: any) => {
        console.error("Error al obtener último orden", error);
      }
    });
  }

  cargarGrupo(id: any) {
    this.gruposService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Grupo cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = `Editar Grupo: ${this.model.nombre}`;
          } else if (this.accion === 'consultar') {
            this.titulo = `Consultar Grupo: ${this.model.nombre}`;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar grupo", error);
        Swal.fire('Error', 'No se pudo cargar el grupo', 'error');
      }
    });
  }

  cargarImagenes() {
    this.http.get<any>('assets/data/imagenes-grupos.json').subscribe({
      next: (data: any) => {
        console.log("Imágenes cargadas", data);
        this.imagenesDisponibles = data.imagenes;
        this.imagenesFiltradas = data.imagenes;
      },
      error: (error: any) => {
        console.error("Error al cargar imágenes", error);
        Swal.fire('Error', 'No se pudo cargar el catálogo de imágenes', 'error');
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
      this.imagenesFiltradas = this.imagenesDisponibles.filter(img =>
        img.nombre.toLowerCase().includes(this.busquedaImagen.toLowerCase())
      );
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del grupo es obligatorio', 'warning');
      return;
    }

    if (!this.model.icono || this.model.icono.trim() === '') {
      Swal.fire('Advertencia', 'Debe seleccionar un icono para el grupo', 'warning');
      return;
    }

    if (!this.model.color || this.model.color.trim() === '') {
      Swal.fire('Advertencia', 'Debe seleccionar un color para el grupo', 'warning');
      return;
    }

    if (this.model.orden === null || this.model.orden === undefined) {
      Swal.fire('Advertencia', 'El orden es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      icono: this.model.icono,
      color: this.model.color,
      calificable: this.model.calificable ? 1 : 0,
      orden: parseInt(this.model.orden)
    } as any;

    if (this.accion === 'crear') {
      this.gruposService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Grupo creado", response);
          Swal.fire('Éxito', 'Grupo creado correctamente', 'success');
          this.router.navigate(['/academico/grupos']);
        },
        error: (error: any) => {
          console.error("Error al crear grupo", error);
          Swal.fire('Error', 'No se pudo crear el grupo', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.gruposService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Grupo actualizado", response);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Grupo actualizado',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: (error: any) => {
          console.error("Error al actualizar grupo", error);
          Swal.fire('Error', 'No se pudo actualizar el grupo', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/grupos']);
  }

  // ========== Métodos para gestión de grados ==========

  cargarGradosDisponibles(id_grupo: any) {
    this.gradosService.obtenerDisponiblesPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Grados disponibles", body);
        this.gradosDisponibles = body;
      },
      error: (error: any) => {
        console.error("Error al cargar grados disponibles", error);
      }
    });
  }

  cargarGradosAsociados(id_grupo: any) {
    this.gradosXGrupoService.obtenerPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Grados asociados", body);
        this.gradosAsociados = body;
      },
      error: (error: any) => {
        console.error("Error al cargar grados asociados", error);
      }
    });
  }

  toggleGrado(id_grado: string) {
    this.gradosSeleccionados[id_grado] = !this.gradosSeleccionados[id_grado];
  }

  asociarGrados() {
    const gradosAAsociar = Object.keys(this.gradosSeleccionados)
      .filter(key => this.gradosSeleccionados[+key])
      .map(key => +key);

    if (gradosAAsociar.length === 0) {
      Swal.fire('Advertencia', 'Debe seleccionar al menos un grado', 'warning');
      return;
    }

    const promesas = gradosAAsociar.map(id_grado => {
      const data = {
        id_grado: id_grado,
        id_grupo: this.model.id
      };
      return this.gradosXGrupoService.crear(data).toPromise();
    });

    Promise.all(promesas).then(() => {
      Swal.fire('Éxito', 'Grados asociados correctamente', 'success');
      this.gradosSeleccionados = {};
      this.cargarGradosDisponibles(this.model.id);
      this.cargarGradosAsociados(this.model.id);
    }).catch(error => {
      console.error("Error al asociar grados", error);
      Swal.fire('Error', 'No se pudieron asociar los grados', 'error');
    });
  }

  async desasociarGrado(gradoXGrupo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar el grado ${gradoXGrupo.nombre_grado} de este grupo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.gradosXGrupoService.eliminar({ id: gradoXGrupo.id }).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Grado desasociado correctamente', 'success');
          this.cargarGradosDisponibles(this.model.id);
          this.cargarGradosAsociados(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al desasociar grado", error);
          Swal.fire('Error', 'No se pudo desasociar el grado', 'error');
        }
      });
    }
  }


  // ========== Métodos para gestión de áreas académicas ==========

  cargarAreasDisponibles(id_grupo: any) {
    this.areasAcademicasService.obtenerDisponiblesPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Áreas académicas disponibles", body);
        this.areasDisponibles = body;
      },
      error: (error: any) => {
        console.error("Error al cargar áreas académicas", error);
      }
    });
  }

  cargarAreasAsociadas(id_grupo: any) {
    this.areaAcademicaXGrupoService.obtenerPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Áreas académicas asociadas", body);
        this.areasAsociadas = body;
      },
      error: (error: any) => {
        console.error("Error al cargar áreas asociadas", error);
      }
    });
  }

  asociarAreas() {
    const areasAAsociar = Object.keys(this.areasSeleccionadas)
      .filter(key => this.areasSeleccionadas[+key])
      .map(key => +key);

    if (areasAAsociar.length === 0) {
      Swal.fire('Advertencia', 'Debe seleccionar al menos un área académica', 'warning');
      return;
    }

    const promesas = areasAAsociar.map(id_area => {
      const data = {
        id_area_academica: id_area,
        id_grupo: this.model.id,
        id_docente: null
      };
      return this.areaAcademicaXGrupoService.crear(data).toPromise();
    });

    Promise.all(promesas).then(() => {
      Swal.fire('Éxito', 'Áreas académicas asociadas correctamente', 'success');
      this.areasSeleccionadas = {};
      this.cargarAreasDisponibles(this.model.id);
      this.cargarAreasAsociadas(this.model.id);
    }).catch(error => {
      console.error("Error al asociar áreas", error);
      Swal.fire('Error', 'No se pudieron asociar las áreas académicas', 'error');
    });
  }

  async desasociarArea(areaAsociada: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar el área ${areaAsociada.nombre_area_academica} de este grupo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.areaAcademicaXGrupoService.eliminar(areaAsociada.id).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Área académica desasociada correctamente', 'success');
          this.cargarAreasDisponibles(this.model.id);
          this.cargarAreasAsociadas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al desasociar área", error);
          Swal.fire('Error', 'No se pudo desasociar el área académica', 'error');
        }
      });
    }
  }


  // ========== Métodos para gestión de horarios ==========

  cargarDiasSemana() {
    this.diasSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.diasSemana = body;
      },
      error: (error: any) => {
        console.error("Error al cargar días de la semana", error);
      }
    });
  }

  cargarHorarios(id_grupo: any) {
    this.horariosService.obtenerByGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Horarios cargados", body);
        this.horariosGrupo = body;
        this.calcularHorasDelDia();
        this.inicializarFiltroAreas();
      },
      error: (error: any) => {
        console.error("Error al cargar horarios", error);
      }
    });
  }

  inicializarFiltroAreas() {
    this.areasAsociadas.forEach(area => {
      this.areasSeleccionadasFiltro[area.id_area_academica] = true;
    });
  }

  toggleAreaFiltro(idArea: string) {
    this.areasSeleccionadasFiltro[idArea] = !this.areasSeleccionadasFiltro[idArea];
  }

  get horariosFiltrados(): any[] {
    return this.horariosGrupo.filter(h => this.areasSeleccionadasFiltro[h.id_area_academica]);
  }

  get diasActivos(): number {
    const diasUnicos = new Set(this.horariosFiltrados.map(h => h.id_dia_semana));
    return diasUnicos.size;
  }

  get horasSemanales(): number {
    const totalMinutos = this.horariosFiltrados.reduce((total, h) => total + h.total_minutos, 0);
    return Math.round(totalMinutos / 60 * 10) / 10;
  }

  // Getter para la vista móvil de horarios agrupados por día
  get horariosAgrupadosPorDia(): any[] {
    const grupos: any[] = [];
    this.diasSemana.forEach(dia => {
      const horariosDia = this.horariosFiltrados
        .filter(h => h.id_dia_semana == dia.id)
        .sort((a, b) => {
          const horaA = a.hora_inicial || '';
          const horaB = b.hora_inicial || '';
          return horaA.localeCompare(horaB);
        });
      if (horariosDia.length > 0) {
        grupos.push({
          dia: dia,
          horarios: horariosDia
        });
      }
    });
    return grupos;
  }

  // Seleccionar pestaña y cerrar menú móvil
  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  abrirModalHorario(id_area_academica?: any, id_dia_semana?: any, hora?: string) {
    let horaInicial = '';
    let horaFinal = '';

    if (hora) {
      horaInicial = hora;
      const [h, m] = hora.split(':').map(Number);
      const totalMin = h * 60 + m + 30;
      const hFin = Math.floor(totalMin / 60);
      const mFin = totalMin % 60;
      horaFinal = `${hFin.toString().padStart(2, '0')}:${mFin.toString().padStart(2, '0')}`;
    }

    this.horarioModal = {
      id: null,
      id_area_academica: id_area_academica || null,
      id_dia_semana: id_dia_semana || null,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      total_minutos: horaInicial && horaFinal ? 30 : 0,
      total_clases: 1
    };
    this.horarioErrorSolapamiento = '';
    this.mostrarModalHorario = true;

    if (horaInicial && horaFinal) {
      this.calcularMinutos();
    }
  }

  cerrarModalHorario() {
    this.mostrarModalHorario = false;
    this.horarioErrorSolapamiento = '';
  }

  calcularMinutos() {
    this.horarioErrorSolapamiento = '';

    if (this.horarioModal.hora_inicial && this.horarioModal.hora_final) {
      const [horaIni, minIni] = this.horarioModal.hora_inicial.split(':').map(Number);
      const [horaFin, minFin] = this.horarioModal.hora_final.split(':').map(Number);
      
      const minutosIni = horaIni * 60 + minIni;
      const minutosFin = horaFin * 60 + minFin;
      
      const diferencia = minutosFin - minutosIni;
      this.horarioModal.total_minutos = diferencia > 0 ? diferencia : 0;

      if (this.horarioModal.id_area_academica && this.horarioModal.id_dia_semana && diferencia > 0) {
        this.validarSolapamientoInline();
      }
    }
  }

  /**
   * Valida solapamiento contra horarios existentes del mismo grupo y día (cualquier área).
   * Setea horarioErrorSolapamiento con el mensaje de error si hay conflicto.
   */
  validarSolapamientoInline() {
    this.horarioErrorSolapamiento = '';

    const horariosConflicto = this.horariosGrupo.filter((h: any) => {
      if (this.horarioModal.id && String(h.id) === String(this.horarioModal.id)) return false;
      if (String(h.id_dia_semana) !== String(this.horarioModal.id_dia_semana)) return false;

      const inicioNuevo = this.horarioModal.hora_inicial;
      const finNuevo = this.horarioModal.hora_final;
      const inicioExistente = h.hora_inicial?.substring(0, 5) || h.hora_inicial;
      const finExistente = h.hora_final?.substring(0, 5) || h.hora_final;

      return inicioNuevo < finExistente && inicioExistente < finNuevo;
    });

    if (horariosConflicto.length > 0) {
      const conflicto = horariosConflicto[0];
      const horaIni = conflicto.hora_inicial?.substring(0, 5) || conflicto.hora_inicial;
      const horaFin = conflicto.hora_final?.substring(0, 5) || conflicto.hora_final;
      const nombreArea = this.areasAsociadas.find((a: any) => a.id_area_academica == conflicto.id_area_academica)?.nombre_area_academica || 'otra área';
      this.horarioErrorSolapamiento = `Se cruza con ${nombreArea} (${horaIni} - ${horaFin}). No se permiten horarios superpuestos.`;
    }
  }

  guardarHorario() {
    if (!this.horarioModal.id_area_academica) {
      Swal.fire('Advertencia', 'Debe seleccionar un área académica', 'warning');
      return;
    }

    if (!this.horarioModal.id_dia_semana) {
      Swal.fire('Advertencia', 'Debe seleccionar un día', 'warning');
      return;
    }

    if (!this.horarioModal.hora_inicial || !this.horarioModal.hora_final) {
      Swal.fire('Advertencia', 'Debe ingresar hora inicial y final', 'warning');
      return;
    }

    if (this.horarioModal.hora_final <= this.horarioModal.hora_inicial) {
      Swal.fire('Advertencia', 'La hora final debe ser mayor que la hora inicial', 'warning');
      return;
    }

    this.calcularMinutos();

    if (this.horarioModal.total_minutos <= 0) {
      return;
    }

    this.validarSolapamientoInline();
    if (this.horarioErrorSolapamiento) {
      return;
    }

    const data = {
      id_grupo: this.model.id,
      id_area_academica: this.horarioModal.id_area_academica,
      id_dia_semana: this.horarioModal.id_dia_semana,
      hora_inicial: this.horarioModal.hora_inicial,
      hora_final: this.horarioModal.hora_final,
      total_minutos: this.horarioModal.total_minutos,
      total_clases: this.horarioModal.total_clases || 1
    };

    if (this.horarioModal.id) {
      const updateData = { ...data, id: this.horarioModal.id };
      this.horariosService.actualizar(updateData).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Horario actualizado correctamente', 'success');
          this.cargarHorarios(this.model.id);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al actualizar horario", error);
          Swal.fire('Error', 'No se pudo actualizar el horario', 'error');
        }
      });
    } else {
      this.horariosService.crear(data).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Horario creado correctamente', 'success');
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
    this.horarioModal = {
      id: horario.id,
      id_area_academica: horario.id_area_academica,
      id_dia_semana: horario.id_dia_semana,
      hora_inicial: horario.hora_inicial?.substring(0, 5) || horario.hora_inicial,
      hora_final: horario.hora_final?.substring(0, 5) || horario.hora_final,
      total_minutos: horario.total_minutos,
      total_clases: horario.total_clases || 1
    };
    this.horarioErrorSolapamiento = '';
    this.mostrarModalHorario = true;
  }

  async eliminarHorario(horario: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar este horario?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.horariosService.eliminar({ id: horario.id }).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Horario eliminado correctamente', 'success');
          this.cargarHorarios(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al eliminar horario", error);
          Swal.fire('Error', 'No se pudo eliminar el horario', 'error');
        }
      });
    }
  }

  obtenerHorariosPorAreaYDia(id_area: string, id_dia: number): any[] {
    return this.horariosGrupo.filter(h => 
      h.id_area_academica === id_area && h.id_dia_semana === id_dia
    );
  }

  obtenerColorArea(id_area: string): string {
    const horario = this.horariosGrupo.find(h => h.id_area_academica === id_area);
    if (horario && horario.area_academica_color) {
      return horario.area_academica_color;
    }
    const area = this.areasAsociadas.find(a => a.id_area_academica === id_area);
    return area?.color || '#FFFFFF';
  }

  obtenerNombreArea(id_area: string): string {
    const area = this.areasAsociadas.find(a => a.id_area_academica === id_area);
    return area?.nombre_area_academica || '';
  }

  calcularHorasDelDia() {
    if (this.horariosGrupo.length === 0) {
      this.horasDelDia = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
      return;
    }

    let horaMinima = 24 * 60;
    let horaMaxima = 0;

    this.horariosGrupo.forEach(horario => {
      const [horaIni, minIni] = horario.hora_inicial.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;

      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosFin = horaFin * 60 + minFin;

      if (minutosInicio < horaMinima) horaMinima = minutosInicio;
      if (minutosFin > horaMaxima) horaMaxima = minutosFin;
    });

    const horas: string[] = [];
    const horaInicioRedondeada = Math.floor(horaMinima / 30) * 30;
    const horaFinRedondeada = Math.ceil(horaMaxima / 30) * 30;

    for (let minutos = horaInicioRedondeada; minutos < horaFinRedondeada; minutos += 30) {
      const hora = Math.floor(minutos / 60);
      const min = minutos % 60;
      const horaFormateada = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      horas.push(horaFormateada);
    }

    this.horasDelDia = horas;
  }

  getHorarioInfo(idDia: any, hora: string): any | null {
    const [horaNum, minutosNum] = hora.split(':').map(Number);
    const minutosHoraActual = horaNum * 60 + minutosNum;

    const horario = this.horariosFiltrados.find(h => {
      if (h.id_dia_semana != idDia) {
        return false;
      }

      const [horaIni, minIni] = h.hora_inicial.split(':').map(Number);
      const [horaFin, minFin] = h.hora_final.split(':').map(Number);

      const minutosInicio = horaIni * 60 + minIni;
      const minutosFin = horaFin * 60 + minFin;

      return minutosHoraActual >= minutosInicio && minutosHoraActual < minutosFin;
    });

    if (horario) {
      const horaInicioFormato = horario.hora_inicial.substring(0, 5);
      const horaFinFormato = horario.hora_final.substring(0, 5);
      const horaActualFormato = `${horaNum.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')}`;

      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosFin = horaFin * 60 + minFin;
      
      const siguienteFrama = minutosHoraActual + 30;
      const esUltimaCelda = siguienteFrama >= minutosFin;

      const esInicio = horaActualFormato === horaInicioFormato;

      return {
        ...horario,
        esInicio: esInicio,
        esFin: esUltimaCelda,
        duracionCompleta: `${horaInicioFormato} - ${horaFinFormato}`,
        esIntermedio: !esInicio && !esUltimaCelda
      };
    }

    return null;
  }

  getClaseHorario(idDia: any, hora: string): string {
    const horarioInfo = this.getHorarioInfo(idDia, hora);
    return horarioInfo ? 'tiene-horario' : 'sin-horario';
  }

  mostrarDetalleHorario(horarioInfo: any) {
    const area = this.obtenerNombreArea(horarioInfo.id_area_academica);

    Swal.fire({
      title: 'Detalle de Horario',
      html: `
        <div class="text-start">
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Horario:</strong> ${horarioInfo.duracionCompleta}</p>
          <p><strong>Duración:</strong> ${horarioInfo.total_minutos} minutos</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      showCancelButton: true,
      cancelButtonText: 'Editar',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
        this.editarHorario(horarioInfo);
      }
    });
  }

  // Adaptador para la vista móvil de horarios
  mostrarDetalleHorarioMovil(horario: any) {
    const horaIni = (horario.hora_inicial || '').substring(0, 5);
    const horaFin = (horario.hora_final || '').substring(0, 5);
    this.mostrarDetalleHorario({
      ...horario,
      duracionCompleta: horaIni + ' - ' + horaFin,
      esInicio: true
    });
  }

  // ==================== TARIFAS ====================

  cargarProductos() {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const productos = response.body || [];
        this.productosMatricula = productos.filter((p: any) => 
          p.clasificacion_codigo === 'ACADEMICO' && p.id_periodicidad_cobro == 1
        );
        this.productosPension = productos.filter((p: any) => 
          p.clasificacion_codigo === 'ACADEMICO' && p.id_periodicidad_cobro == 2
        );
      },
      error: (error: any) => {
        console.error("Error al cargar productos", error);
      }
    });
  }

  cargarTarifasGrupo(idGrupo: any) {
    this.tarifasGruposService.obtenerByGrupo(idGrupo).subscribe({
      next: (response: any) => {
        this.tarifasGrupo = response.body || [];
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
    const tarifaExistente = this.tarifasGrupo.find(t => t.anio == this.anioTarifa);
    if (tarifaExistente) {
      this.tarifaActual = { ...tarifaExistente };
    } else {
      this.tarifaActual = {
        id: null,
        id_grupo: this.model.id,
        id_producto_matricula: null,
        id_producto_pension: null,
        valor_matricula: 0,
        valor_pension: 0,
        anio: this.anioTarifa
      };
    }
    this.valorMatriculaFormateado = this.formatearNumero(this.tarifaActual.valor_matricula);
    this.valorPensionFormateado = this.formatearNumero(this.tarifaActual.valor_pension);
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

  guardarTarifa() {
    if (!this.tarifaActual.id_producto_matricula) {
      Swal.fire('Advertencia', 'Debe seleccionar un producto de matrícula', 'warning');
      return;
    }
    if (!this.tarifaActual.id_producto_pension) {
      Swal.fire('Advertencia', 'Debe seleccionar un producto de pensión', 'warning');
      return;
    }
    if (!this.tarifaActual.valor_matricula || this.tarifaActual.valor_matricula <= 0) {
      Swal.fire('Advertencia', 'Debe ingresar el valor de matrícula', 'warning');
      return;
    }
    if (!this.tarifaActual.valor_pension || this.tarifaActual.valor_pension <= 0) {
      Swal.fire('Advertencia', 'Debe ingresar el valor de pensión', 'warning');
      return;
    }

    const data = {
      id_grupo: this.model.id,
      id_producto_matricula: this.tarifaActual.id_producto_matricula,
      id_producto_pension: this.tarifaActual.id_producto_pension,
      valor_matricula: this.tarifaActual.valor_matricula,
      valor_pension: this.tarifaActual.valor_pension,
      anio: parseInt(this.tarifaActual.anio)
    } as any;

    console.log('Tarifa actual:', this.tarifaActual);
    console.log('Data a enviar:', data);

    if (this.tarifaActual.id) {
      data.id = this.tarifaActual.id;
      console.log('Actualizando tarifa con id:', data.id);
      this.tarifasGruposService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log('Respuesta actualizar:', response);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Tarifa actualizada',
            showConfirmButton: false,
            timer: 2000
          });
          this.cargarTarifasGrupo(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al actualizar tarifa", error);
          Swal.fire('Error', 'No se pudo actualizar la tarifa', 'error');
        }
      });
    } else {
      console.log('Creando nueva tarifa');
      this.tarifasGruposService.crear(data).subscribe({
        next: (response: any) => {
          console.log('Respuesta crear:', response);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Tarifa creada',
            showConfirmButton: false,
            timer: 2000
          });
          this.cargarTarifasGrupo(this.model.id);
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