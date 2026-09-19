import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import { EstudiantesXCursosExtraService } from '../../../services/estudiantes-x-cursos-extra.service';
import { TarifasCursosExtraService } from '../../../services/tarifas-cursos-extra.service';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';

/** Una cuota a generar. Misma forma que usa el flujo individual. */
interface ValorGenerado {
  id_producto_servicio: string;
  nombre_producto: string;
  fecha: string;
  valor: number;
  tipo: string;
  detalle: string;
}

@Component({
  selector: 'app-inscripcion-cursos-extra',
  templateUrl: './inscripcion-cursos-extra.component.html',
  styleUrl: './inscripcion-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InscripcionCursosExtraComponent implements OnInit {

  titulo = 'Inscripción a Cursos Extracurriculares';
  pestanaActiva: string = 'inscribir';
  menuMovilAbierto: boolean = false;

  cursos: any[] = [];
  idCursoSeleccionado: any = null;
  cursoSeleccionado: any = null;

  // Fecha con la que se registra la inscripcion. Arranca en hoy y es editable
  // porque a veces se registra despues de que el nino ya empezo el curso.
  fechaInscripcion: string = '';

  disponibles: any[] = [];
  inscritos: any[] = [];
  disponiblesFiltrados: any[] = [];
  inscritosFiltrados: any[] = [];

  busquedaDisponibles: string = '';
  busquedaInscritos: string = '';
  grupoDisponibles: string = '';
  grupoInscritos: string = '';
  gruposDisponibles: any[] = [];
  gruposInscritos: any[] = [];

  seleccionadosDisponibles: Set<string> = new Set();
  seleccionadosInscritos: Set<string> = new Set();

  procesando: boolean = false;

  constructor(
    private cursosExtraService: CursosExtraService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
    private tarifasCursosExtraService: TarifasCursosExtraService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private institucionConfigService: InstitucionConfigService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.fechaInscripcion = this.formatearFechaISO(new Date());
    this.cargarCursos();
  }

  // ==================== PESTAÑAS ====================

  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  // ==================== CURSO ====================

  cargarCursos() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.cursos = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar cursos", error);
        Swal.fire('Error', 'No se pudieron cargar los cursos', 'error');
      }
    });
  }

  onCursoChange() {
    this.limpiarSelecciones();
    this.disponibles = [];
    this.inscritos = [];
    this.disponiblesFiltrados = [];
    this.inscritosFiltrados = [];

    if (!this.idCursoSeleccionado) {
      this.cursoSeleccionado = null;
      return;
    }

    this.cursoSeleccionado = this.cursos.find((c: any) => c.id == this.idCursoSeleccionado);
    this.cargarDisponibles();
    this.cargarInscritos();
  }

  cargarDisponibles() {
    this.cursosExtraService.obtenerEstudiantesDisponibles(this.idCursoSeleccionado).subscribe({
      next: (response: any) => {
        this.disponibles = response.body || [];
        this.gruposDisponibles = this.extraerGrupos(this.disponibles);
        this.filtrarDisponibles();
      },
      error: (error: any) => {
        console.error("Error al cargar estudiantes disponibles", error);
      }
    });
  }

  cargarInscritos() {
    this.cursosExtraService.obtenerInscritos(this.idCursoSeleccionado).subscribe({
      next: (response: any) => {
        this.inscritos = response.body || [];
        this.gruposInscritos = this.extraerGrupos(this.inscritos);
        this.filtrarInscritos();
      },
      error: (error: any) => {
        console.error("Error al cargar inscritos", error);
      }
    });
  }

  /** Grupos presentes en una lista, para alimentar su selector de filtro. */
  extraerGrupos(lista: any[]): any[] {
    const mapa = new Map<string, string>();
    lista.forEach((e: any) => {
      if (e.id_grupo && e.nombre_grupo) {
        mapa.set(e.id_grupo, e.nombre_grupo);
      }
    });
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  limpiarSelecciones() {
    this.seleccionadosDisponibles.clear();
    this.seleccionadosInscritos.clear();
    this.busquedaDisponibles = '';
    this.busquedaInscritos = '';
    this.grupoDisponibles = '';
    this.grupoInscritos = '';
  }

  // ==================== FILTROS ====================

  filtrarDisponibles() {
    let lista = [...this.disponibles];

    if (this.grupoDisponibles) {
      lista = lista.filter((e: any) => e.id_grupo == this.grupoDisponibles);
    }
    if (this.busquedaDisponibles) {
      const texto = this.busquedaDisponibles.toLowerCase();
      lista = lista.filter((e: any) => (e.nombre_completo || '').toLowerCase().includes(texto));
    }

    this.disponiblesFiltrados = lista;
  }

  filtrarInscritos() {
    let lista = [...this.inscritos];

    if (this.grupoInscritos) {
      lista = lista.filter((e: any) => e.id_grupo == this.grupoInscritos);
    }
    if (this.busquedaInscritos) {
      const texto = this.busquedaInscritos.toLowerCase();
      lista = lista.filter((e: any) => (e.nombre_completo || '').toLowerCase().includes(texto));
    }

    this.inscritosFiltrados = lista;
  }

  // ==================== SELECCION ====================

  toggleDisponible(id: string) {
    if (this.seleccionadosDisponibles.has(id)) {
      this.seleccionadosDisponibles.delete(id);
    } else {
      this.seleccionadosDisponibles.add(id);
    }
  }

  toggleInscrito(id: string) {
    if (this.seleccionadosInscritos.has(id)) {
      this.seleccionadosInscritos.delete(id);
    } else {
      this.seleccionadosInscritos.add(id);
    }
  }

  // Solo opera sobre lo que esta visible con los filtros actuales, para que el
  // boton no toque estudiantes que el usuario no esta viendo.
  seleccionarTodosDisponibles() {
    const visibles = this.disponiblesFiltrados.map((e: any) => e.id);
    const todosMarcados = visibles.length > 0 && visibles.every((id: string) => this.seleccionadosDisponibles.has(id));

    if (todosMarcados) {
      visibles.forEach((id: string) => this.seleccionadosDisponibles.delete(id));
    } else {
      visibles.forEach((id: string) => this.seleccionadosDisponibles.add(id));
    }
  }

  seleccionarTodosInscritos() {
    const visibles = this.inscritosFiltrados.map((e: any) => e.id);
    const todosMarcados = visibles.length > 0 && visibles.every((id: string) => this.seleccionadosInscritos.has(id));

    if (todosMarcados) {
      visibles.forEach((id: string) => this.seleccionadosInscritos.delete(id));
    } else {
      visibles.forEach((id: string) => this.seleccionadosInscritos.add(id));
    }
  }

  todosDisponiblesMarcados(): boolean {
    return this.disponiblesFiltrados.length > 0 &&
      this.disponiblesFiltrados.every((e: any) => this.seleccionadosDisponibles.has(e.id));
  }

  todosInscritosMarcados(): boolean {
    return this.inscritosFiltrados.length > 0 &&
      this.inscritosFiltrados.every((e: any) => this.seleccionadosInscritos.has(e.id));
  }

  contarInscritosActivos(): number {
    return this.inscritos.filter((e: any) => e.activo == 1).length;
  }

  // ==================== INSCRIBIR ====================

  async inscribirSeleccionados() {
    if (!this.idCursoSeleccionado) {
      Swal.fire('Advertencia', 'Seleccione un curso', 'warning');
      return;
    }

    if (this.seleccionadosDisponibles.size === 0) {
      Swal.fire('Advertencia', 'Seleccione al menos un estudiante para inscribir', 'warning');
      return;
    }

    if (!this.fechaInscripcion) {
      Swal.fire('Advertencia', 'Indique la fecha de inscripción', 'warning');
      return;
    }

    // Fecha limite: solo valida si el curso la tiene diligenciada.
    if (this.cursoSeleccionado?.fecha_limite_inscripcion &&
        this.fechaInscripcion > this.cursoSeleccionado.fecha_limite_inscripcion) {
      Swal.fire('Advertencia',
        `Las inscripciones al curso cerraron el ${this.cursoSeleccionado.fecha_limite_inscripcion}.`,
        'warning');
      return;
    }

    const fueraDeRango = this.estudiantesFueraDeRangoEdad();
    if (fueraDeRango.length > 0) {
      const nombres = fueraDeRango.map((e: any) => `• ${e.nombre_completo.trim()} (${e.edad_meses} meses)`).join('<br>');
      Swal.fire({
        title: 'Estudiantes fuera del rango de edad',
        html: `El curso es para el rango que configuraste en Datos Básicos.<br><br>${nombres}<br><br>Quítelos de la selección para continuar.`,
        icon: 'warning',
        width: 600
      });
      return;
    }

    const excede = this.excedeCupo();
    if (excede) {
      if (!this.cursoSeleccionado.permite_sobrecupo) {
        Swal.fire('Advertencia',
          `No se pueden inscribir ${this.seleccionadosDisponibles.size} estudiante(s). El cupo máximo es ${this.cursoSeleccionado.cupo_maximo} y ya hay ${this.contarInscritosActivos()} inscritos.`,
          'warning');
        return;
      }

      const confirmaSobrecupo = await Swal.fire({
        title: 'El curso queda en sobrecupo',
        html: `El cupo máximo es <strong>${this.cursoSeleccionado.cupo_maximo}</strong> y quedarían <strong>${this.contarInscritosActivos() + this.seleccionadosDisponibles.size}</strong> inscritos.<br><br>Este curso permite sobrecupo. ¿Desea continuar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!confirmaSobrecupo.isConfirmed) return;
    }

    const generarCobros = await Swal.fire({
      title: '¿Generar los cobros?',
      html: `Se van a inscribir <strong>${this.seleccionadosDisponibles.size}</strong> estudiante(s) con fecha <strong>${this.fechaInscripcion}</strong>.<br><br>¿Desea generar también las cuentas por cobrar del curso?`,
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Sí, generar cobros',
      denyButtonText: 'Solo inscribir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#26a69a'
    });

    if (generarCobros.isDismissed) return;

    this.ejecutarInscripcion(generarCobros.isConfirmed);
  }

  /** Estudiantes seleccionados que no cumplen el rango de edad del curso. */
  private estudiantesFueraDeRangoEdad(): any[] {
    const minima = this.cursoSeleccionado?.edad_minima_meses;
    const maxima = this.cursoSeleccionado?.edad_maxima_meses;

    if (!minima && !maxima) return [];

    return this.disponibles.filter((e: any) => {
      if (!this.seleccionadosDisponibles.has(e.id)) return false;
      // Sin fecha de nacimiento no se puede evaluar: se deja pasar.
      if (e.edad_meses === null || e.edad_meses === undefined) return false;
      if (minima && e.edad_meses < minima) return true;
      if (maxima && e.edad_meses > maxima) return true;
      return false;
    });
  }

  private excedeCupo(): boolean {
    if (!this.cursoSeleccionado?.cupo_maximo) return false;
    const total = this.contarInscritosActivos() + this.seleccionadosDisponibles.size;
    return total > this.cursoSeleccionado.cupo_maximo;
  }

  private ejecutarInscripcion(conCobros: boolean) {
    this.procesando = true;

    Swal.fire({
      title: 'Inscribiendo estudiantes...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const anio = this.cursoSeleccionado?.anio || this.institucionConfigService.getAnioAcademicoActual();
    const promesas: any[] = [];
    const idsEstudiantes: string[] = [];

    this.seleccionadosDisponibles.forEach((idEstudiante: string) => {
      idsEstudiantes.push(idEstudiante);
      promesas.push(this.estudiantesXCursosExtraService.crear({
        id_estudiante: idEstudiante,
        id_curso_extra: this.idCursoSeleccionado,
        fecha_inscripcion: this.fechaInscripcion,
        anio: anio
      }).toPromise());
    });

    Promise.all(promesas).then((respuestas: any[]) => {
      // Se arma la lista de inscripciones recien creadas para la generacion de cobros.
      const inscripciones: any[] = [];
      respuestas.forEach((r: any, i: number) => {
        if (r && r.id) {
          const estudiante = this.disponibles.find((e: any) => e.id == idsEstudiantes[i]);
          inscripciones.push({
            id_inscripcion: r.id,
            id_persona: estudiante ? estudiante.id_persona : null,
            id_estudiante: idsEstudiantes[i]
          });
        }
      });

      this.seleccionadosDisponibles.clear();
      this.cargarDisponibles();
      this.cargarInscritos();

      if (!conCobros) {
        this.procesando = false;
        Swal.fire('Listo', `${inscripciones.length} estudiante(s) inscrito(s). No se generaron cobros.`, 'success');
        return;
      }

      this.generarCobros(inscripciones);
    }).catch((error: any) => {
      this.procesando = false;
      console.error("Error al inscribir", error);
      const mensaje = error?.error?.error ? error.error.error : 'No se pudieron inscribir todos los estudiantes';
      Swal.fire('Error', mensaje, 'error');
      this.cargarDisponibles();
      this.cargarInscritos();
    });
  }

  // ==================== COBROS ====================

  /** Carga la tarifa del año del curso y genera las cuentas de todas las inscripciones. */
  private generarCobros(inscripciones: any[]) {
    if (inscripciones.length === 0) {
      this.procesando = false;
      Swal.close();
      return;
    }

    const anio = this.cursoSeleccionado?.anio || this.institucionConfigService.getAnioAcademicoActual();

    this.tarifasCursosExtraService.obtenerByCurso(this.idCursoSeleccionado).subscribe({
      next: async (response: any) => {
        const tarifas = response.body || [];
        const tarifa = tarifas.find((t: any) => t.anio == anio) || null;

        if (!tarifa) {
          this.procesando = false;
          Swal.fire('Sin tarifa',
            `Los estudiantes quedaron inscritos, pero el curso no tiene tarifa configurada para el año ${anio}, así que no se generaron cobros.`,
            'warning');
          return;
        }

        const valores = this.construirValores(tarifa);

        if (valores.length === 0) {
          this.procesando = false;
          Swal.fire('Sin valores',
            'Los estudiantes quedaron inscritos, pero la tarifa del curso no tiene productos ni valores configurados, así que no se generaron cobros.',
            'warning');
          return;
        }

        const totalPorEstudiante = valores.reduce((s, v) => s + v.valor, 0);
        const totalGeneral = totalPorEstudiante * inscripciones.length;

        Swal.close();
        const confirma = await Swal.fire({
          title: 'Generar cuentas por cobrar',
          html: `Se van a crear <strong>${valores.length * inscripciones.length}</strong> cuentas por cobrar
                 para <strong>${inscripciones.length}</strong> estudiante(s).<br><br>
                 Por estudiante: <strong>${this.formatearMoneda(totalPorEstudiante)}</strong><br>
                 Total: <strong>${this.formatearMoneda(totalGeneral)}</strong><br><br>
                 ¿Desea continuar?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Sí, generar',
          cancelButtonText: 'No generar',
          confirmButtonColor: '#26a69a',
          width: 600
        });

        if (!confirma.isConfirmed) {
          this.procesando = false;
          Swal.fire('Listo', `${inscripciones.length} estudiante(s) inscrito(s). No se generaron cobros.`, 'success');
          return;
        }

        this.enviarCobros(inscripciones, valores);
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.close();
        console.error("Error al cargar la tarifa", error);
        Swal.fire('Error',
          'Los estudiantes quedaron inscritos, pero no se pudo cargar la tarifa del curso para generar los cobros.',
          'error');
      }
    });
  }

  /**
   * Arma las cuotas a partir de la tarifa, con la misma logica del flujo individual:
   * matricula y cobro unico diferidos por cuotas, pension mes a mes.
   * El punto de partida es la fecha de inscripcion, no la de inicio del curso, para
   * que quien entra tarde solo pague desde que entra.
   */
  private construirValores(tarifa: any): ValorGenerado[] {
    const valores: ValorGenerado[] = [];
    const nombreCurso = this.cursoSeleccionado?.nombre || 'Curso';
    const fechaInicio = new Date(this.fechaInscripcion + 'T00:00:00');
    const fechaFin = this.cursoSeleccionado?.fecha_fin
      ? new Date(this.cursoSeleccionado.fecha_fin + 'T00:00:00')
      : fechaInicio;

    const valorMatricula = parseFloat(tarifa.valor_matricula) || 0;
    const cuotasMatricula = tarifa.cuotas_matricula || 1;
    const valorPension = parseFloat(tarifa.valor_pension) || 0;
    const valorUnico = parseFloat(tarifa.valor_unico) || 0;
    const cuotasUnico = tarifa.cuotas_unico || 1;

    if (tarifa.id_producto_matricula && valorMatricula > 0) {
      const valorCuota = Math.round((valorMatricula / cuotasMatricula) * 100) / 100;
      for (let i = 0; i < cuotasMatricula; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        valores.push({
          id_producto_servicio: tarifa.id_producto_matricula,
          nombre_producto: tarifa.nombre_producto_matricula || 'Matrícula',
          fecha: this.formatearFechaISO(fechaCuota),
          valor: valorCuota,
          tipo: 'matricula',
          detalle: `Matrícula ${nombreCurso} - Cuota ${i + 1}/${cuotasMatricula}`
        });
      }
    }

    if (tarifa.id_producto_pension && valorPension > 0) {
      const current = new Date(fechaInicio);
      while (current <= fechaFin) {
        valores.push({
          id_producto_servicio: tarifa.id_producto_pension,
          nombre_producto: tarifa.nombre_producto_pension || 'Pensión',
          fecha: this.formatearFechaISO(current),
          valor: valorPension,
          tipo: 'pension',
          detalle: `Pensión ${nombreCurso} - ${this.formatearMesAnio(current)}`
        });

        const siguiente = new Date(current);
        siguiente.setMonth(siguiente.getMonth() + 1);
        current.setTime(siguiente.getTime());
      }
    }

    if (tarifa.id_producto_unico && valorUnico > 0) {
      const valorCuota = Math.round((valorUnico / cuotasUnico) * 100) / 100;
      for (let i = 0; i < cuotasUnico; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        valores.push({
          id_producto_servicio: tarifa.id_producto_unico,
          nombre_producto: tarifa.nombre_producto_unico || 'Cobro Único',
          fecha: this.formatearFechaISO(fechaCuota),
          valor: valorCuota,
          tipo: 'unico',
          detalle: `${nombreCurso} - Cuota ${i + 1}/${cuotasUnico}`
        });
      }
    }

    valores.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return valores;
  }

  private enviarCobros(inscripciones: any[], valores: ValorGenerado[]) {
    Swal.fire({
      title: 'Generando cuentas...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const data = {
      id_usuario: this.utilService.obtenerIdUsuarioActual(),
      id_curso_extra: this.idCursoSeleccionado,
      inscripciones: inscripciones,
      valores: valores
    };

    this.cuentasPorCobrarService.generarDesdeCursoExtra(data).subscribe({
      next: (response: any) => {
        this.procesando = false;
        Swal.close();

        if (response.error) {
          Swal.fire('Error', response.error, 'error');
          return;
        }

        let aviso = '';
        if (response.duplicados_parciales) {
          const cuantos = Object.keys(response.duplicados_parciales).length;
          aviso = `<hr><span class="text-warning">A ${cuantos} estudiante(s) no se les generaron cuentas porque ya las tenían.</span>`;
        }

        Swal.fire({
          title: 'Inscripción completa',
          html: `Se inscribieron <strong>${inscripciones.length}</strong> estudiante(s).<br><br>
                 Cuentas creadas: <strong>${response.cuentas_creadas}</strong><br>
                 ${response.total_matricula > 0 ? 'Matrícula: <strong>' + this.formatearMoneda(response.total_matricula) + '</strong><br>' : ''}
                 ${response.total_pension > 0 ? 'Pensiones: <strong>' + this.formatearMoneda(response.total_pension) + '</strong><br>' : ''}
                 ${response.total_unico > 0 ? 'Cobro único: <strong>' + this.formatearMoneda(response.total_unico) + '</strong><br>' : ''}
                 <hr><strong>Total: ${this.formatearMoneda(response.total_general)}</strong>
                 ${aviso}`,
          icon: 'success',
          confirmButtonColor: '#26a69a',
          width: 600
        });

        this.cargarInscritos();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.close();
        console.error("Error al generar cuentas", error);
        Swal.fire('Error',
          'Los estudiantes quedaron inscritos, pero no se pudieron generar las cuentas por cobrar.',
          'error');
      }
    });
  }

  // ==================== RETIRAR ====================

  /**
   * Retira a los seleccionados usando anular(), no eliminar(): asi se anulan las
   * cuentas por cobrar sin pagos y se conservan las que ya tienen abonos.
   */
  async retirarSeleccionados() {
    if (this.seleccionadosInscritos.size === 0) {
      Swal.fire('Advertencia', 'Seleccione al menos un estudiante para retirar', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Retirar estudiantes?',
      html: `Se van a retirar <strong>${this.seleccionadosInscritos.size}</strong> estudiante(s) del curso.<br><br>
             Las cuentas por cobrar sin pagos aplicados se anulan; las que ya tengan pagos se conservan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, retirar',
      cancelButtonText: 'Cancelar',
      width: 600
    });

    if (!result.isConfirmed) return;

    this.procesando = true;
    Swal.fire({
      title: 'Retirando estudiantes...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const promesas: any[] = [];
    const idsInscripcion: string[] = [];

    this.seleccionadosInscritos.forEach((idInscripcion: string) => {
      idsInscripcion.push(idInscripcion);
      promesas.push(this.estudiantesXCursosExtraService.anular(idInscripcion).toPromise());
    });

    Promise.all(promesas).then((respuestas: any[]) => {
      this.procesando = false;
      Swal.close();

      let totalAnuladas = 0;
      const conPagos: any[] = [];

      respuestas.forEach((r: any, i: number) => {
        if (!r) return;
        totalAnuladas += r.anuladas || 0;
        if (r.con_pagos && r.con_pagos.length > 0) {
          const inscrito = this.inscritos.find((e: any) => e.id == idsInscripcion[i]);
          r.con_pagos.forEach((c: any) => {
            conPagos.push({
              estudiante: inscrito ? inscrito.nombre_completo.trim() : '',
              nombre_producto: c.nombre_producto,
              fecha: c.fecha,
              valor: c.valor,
              valor_pagado: c.valor_pagado
            });
          });
        }
      });

      this.seleccionadosInscritos.clear();
      this.cargarDisponibles();
      this.cargarInscritos();

      // Las cuentas con pagos quedan vivas a proposito: hay que avisarlo o el
      // usuario cree que el retiro dejo la cartera en cero.
      if (conPagos.length > 0) {
        let tabla = '<table class="table table-sm table-bordered" style="font-size: 0.85rem;">';
        tabla += '<thead><tr><th>Estudiante</th><th>Producto</th><th>Fecha</th><th>Pagado</th></tr></thead><tbody>';
        conPagos.forEach((c: any) => {
          tabla += `<tr><td>${c.estudiante}</td><td>${c.nombre_producto}</td><td>${c.fecha}</td><td>${this.formatearMoneda(c.valor_pagado)}</td></tr>`;
        });
        tabla += '</tbody></table>';

        Swal.fire({
          title: 'Estudiantes retirados',
          html: `Se anularon <strong>${totalAnuladas}</strong> cuenta(s) por cobrar.<br><br>
                 Estas cuentas <strong>no se anularon</strong> porque ya tienen pagos aplicados:<br><br>${tabla}`,
          icon: 'warning',
          width: 700
        });
      } else {
        Swal.fire('Listo',
          `Estudiantes retirados. Se anularon ${totalAnuladas} cuenta(s) por cobrar.`,
          'success');
      }
    }).catch((error: any) => {
      this.procesando = false;
      Swal.close();
      console.error("Error al retirar", error);
      Swal.fire('Error', 'No se pudieron retirar todos los estudiantes', 'error');
      this.cargarDisponibles();
      this.cargarInscritos();
    });
  }

  // ==================== UTILIDADES ====================

  formatearFechaISO(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  formatearMesAnio(fecha: Date): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }) || '$0';
  }
}
