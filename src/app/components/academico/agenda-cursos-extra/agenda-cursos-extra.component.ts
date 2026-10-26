import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { HoraInputComponent } from '../../../common/hora-input/hora-input.component';
import { FechaInputComponent } from '../../../common/fecha-input/fecha-input.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import { DocentesService } from '../../../services/docentes.service';
import { HorariosCursosExtraService } from '../../../services/horarios-cursos-extra.service';
import { EstudiantesXCursosExtraService } from '../../../services/estudiantes-x-cursos-extra.service';
import { TarifasCursosExtraService } from '../../../services/tarifas-cursos-extra.service';
import { EspaciosLugaresCursosExtraService } from '../../../services/espacios-lugares-cursos-extra.service';
import { SesionesCursosExtraService } from '../../../services/sesiones-cursos-extra.service';
import { ReservasSesionesCursosExtraService } from '../../../services/reservas-sesiones-cursos-extra.service';
import { ReservasFijasCursosExtraService } from '../../../services/reservas-fijas-cursos-extra.service';
import { PaquetesEstudiantesCursosExtraService } from '../../../services/paquetes-estudiantes-cursos-extra.service';

/**
 * Agenda de Cursos Extra.
 *
 * Muestra las sesiones (la clase de un curso en un dia y hora) semana por
 * semana, con su cancha, su profesor y el cupo disponible. Desde aqui se
 * generan las sesiones a partir de los horarios de los cursos, se crean
 * sesiones sueltas y se manejan las reservas (reservar, cancelar, reagendar)
 * segun las reglas de reserva de cada curso.
 *
 * Las pestañas Reservas fijas y Paquetes trabajan sobre el curso del filtro.
 * La asistencia se registra en Clases del Dia.
 */
@Component({
  selector: 'app-agenda-cursos-extra',
  templateUrl: './agenda-cursos-extra.component.html',
  styleUrl: './agenda-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HoraInputComponent, FechaInputComponent]
})
export class AgendaCursosExtraComponent implements OnInit {

  titulo = 'Agenda de Cursos Extra';
  pestana: 'agenda' | 'fijas' | 'paquetes' = 'agenda';

  // Filtros
  inicioSemana: string = '';
  idCurso: any = null;
  idDocente: any = null;

  // Catalogos
  cursos: any[] = [];
  docentes: any[] = [];
  espacios: any[] = [];

  // Agenda: los siete dias de la semana con sus sesiones
  dias: { fecha: string, nombre: string, sesiones: any[] }[] = [];
  cargando: boolean = false;

  // Detalle de una sesion
  sesion: any = null;
  inscritosCurso: any[] = [];
  idInscripcionReservar: any = null;
  editandoSesion: boolean = false;
  sesionEdicion: any = {};
  reservaReagendar: any = null;
  sesionesDestino: any[] = [];
  sesionDestino: any = null;

  // Sesion suelta
  mostrarModalSuelta: boolean = false;
  suelta: any = {};
  inscritosSuelta: any[] = [];

  // Reservas fijas del curso del filtro
  reservasFijas: any[] = [];
  horariosCurso: any[] = [];
  mostrarModalFija: boolean = false;
  fija: any = {};
  fijaTerminar: any = null;
  fechaTerminar: string = '';

  // Paquetes del curso del filtro
  paquetes: any[] = [];
  productosPaquete: any[] = [];
  mostrarModalPaquete: boolean = false;
  paquete: any = {};

  private readonly nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  constructor(
    private cursosExtraService: CursosExtraService,
    private docentesService: DocentesService,
    private horariosCursosExtraService: HorariosCursosExtraService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
    private tarifasCursosExtraService: TarifasCursosExtraService,
    private espaciosLugaresCursosExtraService: EspaciosLugaresCursosExtraService,
    private sesionesCursosExtraService: SesionesCursosExtraService,
    private reservasSesionesCursosExtraService: ReservasSesionesCursosExtraService,
    private reservasFijasCursosExtraService: ReservasFijasCursosExtraService,
    private paquetesEstudiantesCursosExtraService: PaquetesEstudiantesCursosExtraService
  ) { }

  ngOnInit(): void {
    this.inicioSemana = this.lunesDe(this.hoy());
    this.cargarCatalogos();
    this.cargarAgenda();
  }

  // ==================== CATALOGOS ====================

  cargarCatalogos() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => this.cursos = response.body || [],
      error: (error: any) => console.error('Error al cargar los cursos', error)
    });
    this.docentesService.obtenerTodos().subscribe({
      next: (response: any) => this.docentes = (response.body || []).filter((d: any) => d.activo == 1),
      error: (error: any) => console.error('Error al cargar los docentes', error)
    });
    this.espaciosLugaresCursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => this.espacios = response.body || [],
      error: (error: any) => console.error('Error al cargar los espacios', error)
    });
  }

  nombreCurso(id: any): string {
    const curso = this.cursos.find((c: any) => c.id === id);
    return curso ? curso.nombre : '';
  }

  // ==================== AGENDA ====================

  cargarAgenda() {
    const fin = this.sumarDias(this.inicioSemana, 6);
    this.dias = [];
    for (let i = 0; i < 7; i++) {
      this.dias.push({ fecha: this.sumarDias(this.inicioSemana, i), nombre: this.nombresDias[i], sesiones: [] });
    }
    this.cargando = true;
    this.sesionesCursosExtraService.obtenerTodas({
      fecha_desde: this.inicioSemana,
      fecha_hasta: fin,
      id_curso_extra: this.idCurso,
      id_docente: this.idDocente
    }).subscribe({
      next: (response: any) => {
        const sesiones = response.body || [];
        for (const s of sesiones) {
          const dia = this.dias.find((d) => d.fecha === s.fecha);
          if (dia) {
            dia.sesiones.push(s);
          }
        }
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar las sesiones', error);
        this.cargando = false;
      }
    });
  }

  cambiarSemana(semanas: number) {
    this.inicioSemana = this.sumarDias(this.inicioSemana, semanas * 7);
    this.cargarAgenda();
  }

  irAHoy() {
    this.inicioSemana = this.lunesDe(this.hoy());
    this.cargarAgenda();
  }

  /** Al escoger una fecha cualquiera se muestra la semana que la contiene. */
  irAFecha(fecha: string) {
    if (fecha) {
      this.inicioSemana = this.lunesDe(fecha);
      this.cargarAgenda();
    }
  }

  onFiltroChange() {
    this.cargarAgenda();
    if (this.pestana === 'fijas') {
      this.cargarReservasFijas();
    } else if (this.pestana === 'paquetes') {
      this.cargarPaquetes();
    }
  }

  cambiarPestana(pestana: 'agenda' | 'fijas' | 'paquetes') {
    this.pestana = pestana;
    if (pestana === 'fijas') {
      this.cargarReservasFijas();
    } else if (pestana === 'paquetes') {
      this.cargarPaquetes();
    }
  }

  cupoTexto(s: any): string {
    if (s.cupo === null || s.cupo === undefined) {
      return `${s.ocupados} / sin límite`;
    }
    return `${s.ocupados} / ${s.cupo}`;
  }

  sinCupo(s: any): boolean {
    return s.cupo !== null && s.cupo !== undefined && s.ocupados >= s.cupo;
  }

  esHoy(fecha: string): boolean {
    return fecha === this.hoy();
  }

  // ==================== DETALLE DE LA SESION ====================

  /**
   * Abre la sesion. Si es de un horario y todavia no tiene fila (virtual),
   * primero se crea: abrirla es lo que la vuelve real.
   */
  abrirSesion(s: any) {
    this.editandoSesion = false;
    this.reservaReagendar = null;
    this.idInscripcionReservar = null;
    this.idDeSesion(s, (id) => this.recargarSesion(id));
  }

  /** Id de una sesion de la agenda; la crea si es virtual. */
  idDeSesion(s: any, continuar: (id: any) => void) {
    if (s.id) {
      continuar(s.id);
      return;
    }
    this.sesionesCursosExtraService.materializar({
      id_horario_curso_extra: s.id_horario_curso_extra,
      fecha: s.fecha
    }).subscribe({
      next: (respuesta: any) => continuar(respuesta.id),
      error: (error: any) => console.error('Error al abrir la sesión', error)
    });
  }

  recargarSesion(id: any) {
    this.sesionesCursosExtraService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.sesion = body.length > 0 ? body[0] : null;
        if (this.sesion) {
          this.cargarInscritos(this.sesion.id_curso_extra, (lista) => this.inscritosCurso = lista);
        }
      },
      error: (error: any) => console.error('Error al cargar la sesión', error)
    });
  }

  cerrarSesion() {
    this.sesion = null;
    this.cargarAgenda();
  }

  /** Inscritos vigentes que todavia no tienen puesto en la sesion abierta. */
  inscritosSinPuesto(): any[] {
    if (!this.sesion) {
      return [];
    }
    const conPuesto = (this.sesion.reservas || [])
      .filter((r: any) => ['RESERVADA', 'ASISTIO', 'NO_ASISTIO'].includes(r.codigo_estado))
      .map((r: any) => r.id_estudiante_x_curso_extra);
    return this.inscritosCurso.filter((i: any) => !conPuesto.includes(i.id));
  }

  puedeReservar(): boolean {
    return !!this.sesion && this.sesion.codigo_estado === 'PROGRAMADA' &&
      (this.sesion.reglas?.permite_reserva_suelta == 1 || this.sesion.reglas?.reserva_automatica == 1);
  }

  reservar() {
    if (!this.idInscripcionReservar) {
      Swal.fire('Advertencia', 'Selecciona el estudiante', 'warning');
      return;
    }
    this.reservasSesionesCursosExtraService.crear({
      id_sesion_curso_extra: this.sesion.id,
      id_estudiante_x_curso_extra: this.idInscripcionReservar
    }).subscribe({
      next: () => {
        this.toast('Reserva creada');
        this.idInscripcionReservar = null;
        this.recargarSesion(this.sesion.id);
      },
      error: (error: any) => console.error('Error al reservar', error)
    });
  }

  async cancelarReserva(r: any) {
    const resultado = await Swal.fire({
      title: '¿Cancelar la reserva?',
      text: `${r.nombre_estudiante} deja libre su puesto en esta sesión.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.reservasSesionesCursosExtraService.cancelar({ id: r.id }).subscribe({
      next: () => {
        this.toast('Reserva cancelada');
        this.recargarSesion(this.sesion.id);
      },
      error: (error: any) => console.error('Error al cancelar la reserva', error)
    });
  }

  /** Busca sesiones programadas del mismo curso en las tres semanas siguientes. */
  iniciarReagendar(r: any) {
    this.reservaReagendar = r;
    this.sesionDestino = null;
    const desde = this.hoy() > this.sesion.fecha ? this.hoy() : this.sesion.fecha;
    this.sesionesCursosExtraService.obtenerTodas({
      fecha_desde: desde,
      fecha_hasta: this.sumarDias(desde, 21),
      id_curso_extra: this.sesion.id_curso_extra
    }).subscribe({
      next: (response: any) => {
        this.sesionesDestino = (response.body || []).filter((s: any) =>
          s.id !== this.sesion.id && s.codigo_estado === 'PROGRAMADA' && !this.sinCupo(s));
      },
      error: (error: any) => console.error('Error al buscar sesiones', error)
    });
  }

  confirmarReagendar() {
    if (!this.sesionDestino) {
      Swal.fire('Advertencia', 'Selecciona la sesión a la que se mueve', 'warning');
      return;
    }
    // Si el destino todavia es virtual, se crea antes de mover la reserva.
    this.idDeSesion(this.sesionDestino, (idDestino) => {
      this.reservasSesionesCursosExtraService.reagendar({
        id: this.reservaReagendar.id,
        id_sesion_destino: idDestino
      }).subscribe({
        next: () => {
          this.toast('Reserva reagendada');
          this.reservaReagendar = null;
          this.recargarSesion(this.sesion.id);
        },
        error: (error: any) => console.error('Error al reagendar', error)
      });
    });
  }

  iniciarEdicionSesion() {
    this.sesionEdicion = {
      id: this.sesion.id,
      fecha: this.sesion.fecha,
      hora_inicial: (this.sesion.hora_inicial || '').substring(0, 5),
      hora_final: (this.sesion.hora_final || '').substring(0, 5),
      id_espacio_lugar_curso_extra: this.sesion.id_espacio_lugar_curso_extra,
      cupo: this.sesion.cupo,
      observaciones: this.sesion.observaciones || '',
      docentes: (this.sesion.docentes || []).map((d: any) => ({
        id_docente: d.id_docente, minutos: d.minutos, es_titular: d.es_titular
      }))
    };
    this.editandoSesion = true;
  }

  agregarDocenteEdicion() {
    this.sesionEdicion.docentes.push({ id_docente: null, minutos: this.minutosEntre(this.sesionEdicion.hora_inicial, this.sesionEdicion.hora_final), es_titular: 0 });
  }

  quitarDocenteEdicion(indice: number) {
    this.sesionEdicion.docentes.splice(indice, 1);
  }

  guardarSesion() {
    const datos = { ...this.sesionEdicion };
    datos.cupo = datos.cupo === '' || datos.cupo === undefined ? null : datos.cupo;
    this.sesionesCursosExtraService.actualizar(datos).subscribe({
      next: () => {
        this.toast('Sesión actualizada');
        this.editandoSesion = false;
        this.recargarSesion(this.sesion.id);
      },
      error: (error: any) => console.error('Error al actualizar la sesión', error)
    });
  }

  async cancelarSesion() {
    const resultado = await Swal.fire({
      title: 'Cancelar la sesión',
      text: 'Las reservas quedan canceladas y no descuentan del paquete.',
      input: 'text',
      inputLabel: 'Motivo',
      inputPlaceholder: 'Ej: lluvia',
      showCancelButton: true,
      confirmButtonText: 'Cancelar sesión',
      cancelButtonText: 'Volver',
      inputValidator: (valor) => !valor || !valor.trim() ? 'Escribe el motivo' : null
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.sesionesCursosExtraService.cancelar({ id: this.sesion.id, motivo_cancelacion: resultado.value }).subscribe({
      next: () => {
        this.toast('Sesión cancelada');
        this.recargarSesion(this.sesion.id);
      },
      error: (error: any) => console.error('Error al cancelar la sesión', error)
    });
  }

  reabrirSesion() {
    this.sesionesCursosExtraService.reabrir({ id: this.sesion.id }).subscribe({
      next: () => {
        this.toast('Sesión reabierta');
        this.recargarSesion(this.sesion.id);
      },
      error: (error: any) => console.error('Error al reabrir la sesión', error)
    });
  }

  async eliminarSesion() {
    const resultado = await Swal.fire({
      title: '¿Eliminar la sesión?',
      text: 'Se borran también sus reservas. Si es de un horario, vuelve a aparecer en la agenda como sesión del horario; para que no se dicte es mejor cancelarla.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No'
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.sesionesCursosExtraService.eliminar({ id: this.sesion.id }).subscribe({
      next: () => {
        this.toast('Sesión eliminada');
        this.cerrarSesion();
      },
      error: (error: any) => console.error('Error al eliminar la sesión', error)
    });
  }

  // ==================== SESION SUELTA ====================

  abrirModalSuelta(fecha?: string) {
    this.suelta = {
      id_curso_extra: this.idCurso,
      fecha: fecha || this.hoy(),
      hora_inicial: '',
      hora_final: '',
      id_espacio_lugar_curso_extra: null,
      cupo: null,
      id_docente: this.idDocente,
      estudiantes: [] as any[],
      observaciones: ''
    };
    this.inscritosSuelta = [];
    if (this.suelta.id_curso_extra) {
      this.onCursoSueltaChange();
    }
    this.mostrarModalSuelta = true;
  }

  onCursoSueltaChange() {
    this.suelta.estudiantes = [];
    this.inscritosSuelta = [];
    if (this.suelta.id_curso_extra) {
      this.cargarInscritos(this.suelta.id_curso_extra, (lista) => this.inscritosSuelta = lista);
    }
  }

  alternarEstudianteSuelta(id: any) {
    const indice = this.suelta.estudiantes.indexOf(id);
    if (indice >= 0) {
      this.suelta.estudiantes.splice(indice, 1);
    } else {
      this.suelta.estudiantes.push(id);
    }
  }

  crearSuelta() {
    if (!this.suelta.id_curso_extra || !this.suelta.fecha || !this.suelta.hora_inicial || !this.suelta.hora_final) {
      Swal.fire('Advertencia', 'Curso, fecha y horas son obligatorios', 'warning');
      return;
    }
    const datos: any = {
      id_curso_extra: this.suelta.id_curso_extra,
      fecha: this.suelta.fecha,
      hora_inicial: this.suelta.hora_inicial,
      hora_final: this.suelta.hora_final,
      id_espacio_lugar_curso_extra: this.suelta.id_espacio_lugar_curso_extra,
      cupo: this.suelta.cupo === '' ? null : this.suelta.cupo,
      observaciones: this.suelta.observaciones,
      estudiantes: this.suelta.estudiantes,
      docentes: this.suelta.id_docente
        ? [{ id_docente: this.suelta.id_docente, es_titular: 1, minutos: this.minutosEntre(this.suelta.hora_inicial, this.suelta.hora_final) }]
        : []
    };
    this.sesionesCursosExtraService.crear(datos).subscribe({
      next: () => {
        this.toast('Sesión creada');
        this.mostrarModalSuelta = false;
        this.irAFecha(datos.fecha);
      },
      error: (error: any) => console.error('Error al crear la sesión', error)
    });
  }

  // ==================== RESERVAS FIJAS ====================

  cargarReservasFijas() {
    this.reservasFijas = [];
    this.horariosCurso = [];
    if (!this.idCurso) {
      return;
    }
    this.reservasFijasCursosExtraService.obtenerByCurso(this.idCurso).subscribe({
      next: (response: any) => this.reservasFijas = response.body || [],
      error: (error: any) => console.error('Error al cargar las reservas fijas', error)
    });
    this.horariosCursosExtraService.obtenerByCurso(this.idCurso).subscribe({
      next: (response: any) => this.horariosCurso = response.body || [],
      error: (error: any) => console.error('Error al cargar los horarios', error)
    });
    this.cargarInscritos(this.idCurso, (lista) => this.inscritosCurso = lista);
  }

  abrirModalFija() {
    this.fija = { id_estudiante_x_curso_extra: null, id_horario_curso_extra: null, fecha_desde: this.hoy(), fecha_hasta: '' };
    this.mostrarModalFija = true;
  }

  crearFija() {
    if (!this.fija.id_estudiante_x_curso_extra || !this.fija.id_horario_curso_extra || !this.fija.fecha_desde) {
      Swal.fire('Advertencia', 'Estudiante, horario y fecha desde son obligatorios', 'warning');
      return;
    }
    this.reservasFijasCursosExtraService.crear(this.fija).subscribe({
      next: (respuesta: any) => {
        this.mostrarModalFija = false;
        let texto = `Quedó reservado en ${respuesta.reservas_creadas} sesión(es) que ya estaban generadas.`;
        if (respuesta.sin_cupo && respuesta.sin_cupo.length > 0) {
          texto += ` Sin cupo en: ${respuesta.sin_cupo.map((f: string) => this.fechaCorta(f)).join(', ')}.`;
        }
        Swal.fire('Reserva fija creada', texto, 'success');
        this.cargarReservasFijas();
      },
      error: (error: any) => console.error('Error al crear la reserva fija', error)
    });
  }

  /** Abre el modal para escoger el ultimo dia de la reserva fija. */
  terminarFija(f: any) {
    this.fijaTerminar = f;
    this.fechaTerminar = this.hoy();
  }

  confirmarTerminarFija() {
    if (!this.fechaTerminar) {
      Swal.fire('Advertencia', 'Escribe el último día', 'warning');
      return;
    }
    this.reservasFijasCursosExtraService.actualizar({ id: this.fijaTerminar.id, fecha_hasta: this.fechaTerminar, activo: 1 }).subscribe({
      next: () => {
        this.toast('Reserva fija terminada');
        this.fijaTerminar = null;
        this.cargarReservasFijas();
      },
      error: (error: any) => console.error('Error al terminar la reserva fija', error)
    });
  }

  async eliminarFija(f: any) {
    const resultado = await Swal.fire({
      title: '¿Eliminar la reserva fija?',
      text: `${f.nombre_estudiante} - ${f.nombre_dia}. Se liberan sus puestos desde hoy.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No'
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.reservasFijasCursosExtraService.eliminar({ id: f.id }).subscribe({
      next: () => {
        this.toast('Reserva fija eliminada');
        this.cargarReservasFijas();
      },
      error: (error: any) => console.error('Error al eliminar la reserva fija', error)
    });
  }

  vigenteFija(f: any): boolean {
    return f.activo == 1 && (!f.fecha_hasta || f.fecha_hasta >= this.hoy());
  }

  // ==================== PAQUETES ====================

  cargarPaquetes() {
    this.paquetes = [];
    this.productosPaquete = [];
    if (!this.idCurso) {
      return;
    }
    this.paquetesEstudiantesCursosExtraService.obtenerByCurso(this.idCurso).subscribe({
      next: (response: any) => this.paquetes = response.body || [],
      error: (error: any) => console.error('Error al cargar los paquetes', error)
    });
    // Los paquetes que vende el curso salen de su tarifa del año: se ofrecen
    // para llenar sesiones y vigencia de una vez.
    this.tarifasCursosExtraService.obtenerVigente(this.idCurso, new Date().getFullYear()).subscribe({
      next: (response: any) => {
        const tarifa = (response.body || [])[0];
        this.productosPaquete = tarifa && tarifa.detalle
          ? tarifa.detalle.filter((l: any) => l.tipo === 'paquete' && l.numero_sesiones)
          : [];
      },
      error: (error: any) => console.error('Error al cargar la tarifa del curso', error)
    });
    this.cargarInscritos(this.idCurso, (lista) => this.inscritosCurso = lista);
  }

  abrirModalPaquete(p?: any) {
    if (p) {
      this.paquete = {
        id: p.id,
        id_estudiante_x_curso_extra: p.id_estudiante_x_curso_extra,
        nombre_estudiante: p.nombre_estudiante,
        numero_sesiones: p.numero_sesiones,
        fecha_inicio: p.fecha_inicio,
        fecha_vencimiento: p.fecha_vencimiento || '',
        vigencia_dias: null,
        observaciones: p.observaciones || '',
        activo: p.activo == 1,
        usadas: p.usadas,
        id_producto: null
      };
    } else {
      this.paquete = {
        id: null,
        id_estudiante_x_curso_extra: null,
        numero_sesiones: null,
        fecha_inicio: this.hoy(),
        fecha_vencimiento: '',
        vigencia_dias: null,
        observaciones: '',
        activo: true,
        usadas: 0,
        id_producto: null
      };
    }
    this.mostrarModalPaquete = true;
  }

  onProductoPaqueteChange() {
    const producto = this.productosPaquete.find((l: any) => l.id === this.paquete.id_producto);
    if (producto) {
      this.paquete.numero_sesiones = producto.numero_sesiones;
      this.paquete.vigencia_dias = producto.vigencia_dias;
      this.paquete.fecha_vencimiento = producto.vigencia_dias && this.paquete.fecha_inicio
        ? this.sumarDias(this.paquete.fecha_inicio, producto.vigencia_dias - 1)
        : '';
      if (!this.paquete.observaciones) {
        this.paquete.observaciones = producto.nombre_producto;
      }
    }
  }

  onFechaInicioPaqueteChange() {
    if (this.paquete.vigencia_dias && this.paquete.fecha_inicio) {
      this.paquete.fecha_vencimiento = this.sumarDias(this.paquete.fecha_inicio, this.paquete.vigencia_dias - 1);
    }
  }

  guardarPaquete() {
    if (!this.paquete.id_estudiante_x_curso_extra || !this.paquete.numero_sesiones || !this.paquete.fecha_inicio) {
      Swal.fire('Advertencia', 'Estudiante, sesiones y fecha de inicio son obligatorios', 'warning');
      return;
    }
    const datos: any = {
      id: this.paquete.id,
      id_estudiante_x_curso_extra: this.paquete.id_estudiante_x_curso_extra,
      numero_sesiones: this.paquete.numero_sesiones,
      fecha_inicio: this.paquete.fecha_inicio,
      fecha_vencimiento: this.paquete.fecha_vencimiento || null,
      observaciones: this.paquete.observaciones,
      activo: this.paquete.activo ? 1 : 0
    };
    const peticion = this.paquete.id
      ? this.paquetesEstudiantesCursosExtraService.actualizar(datos)
      : this.paquetesEstudiantesCursosExtraService.crear(datos);
    peticion.subscribe({
      next: () => {
        this.toast(this.paquete.id ? 'Paquete actualizado' : 'Paquete creado');
        this.mostrarModalPaquete = false;
        this.cargarPaquetes();
      },
      error: (error: any) => console.error('Error al guardar el paquete', error)
    });
  }

  async eliminarPaquete(p: any) {
    const resultado = await Swal.fire({
      title: '¿Eliminar el paquete?',
      text: `${p.nombre_estudiante}: ${p.numero_sesiones} sesiones desde ${this.fechaCorta(p.fecha_inicio)}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'No'
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.paquetesEstudiantesCursosExtraService.eliminar({ id: p.id }).subscribe({
      next: () => {
        this.toast('Paquete eliminado');
        this.cargarPaquetes();
      },
      error: (error: any) => console.error('Error al eliminar el paquete', error)
    });
  }

  claseEstadoPaquete(estado: string): string {
    const clases: any = { VIGENTE: 'chip-ok', AGOTADO: 'chip-alerta', VENCIDO: 'chip-gris', INACTIVO: 'chip-gris' };
    return clases[estado] || 'chip-gris';
  }

  // ==================== APOYO ====================

  /** Inscritos activos y no retirados del curso, con el nombre ya armado. */
  private cargarInscritos(idCurso: any, alTerminar: (lista: any[]) => void) {
    this.estudiantesXCursosExtraService.obtenerByCurso(idCurso).subscribe({
      next: (response: any) => {
        const lista = (response.body || [])
          .filter((i: any) => i.activo == 1 && !i.fecha_retiro)
          .map((i: any) => ({ ...i, nombre_completo: (i.nombre_completo || '').replace(/\s+/g, ' ').trim() }));
        alTerminar(lista);
      },
      error: (error: any) => console.error('Error al cargar los inscritos', error)
    });
  }

  claseEstadoReserva(codigo: string): string {
    const clases: any = {
      RESERVADA: 'chip-info', ASISTIO: 'chip-ok', NO_ASISTIO: 'chip-alerta',
      CANCELADA: 'chip-gris', REAGENDADA: 'chip-gris'
    };
    return clases[codigo] || 'chip-gris';
  }

  textoPaquete(r: any): string {
    if (r.sesiones_disponibles === null || r.sesiones_disponibles === undefined) {
      return 'Sin paquete';
    }
    return r.sesiones_disponibles === 1 ? '1 sesión disponible' : `${r.sesiones_disponibles} sesiones disponibles`;
  }

  hora(valor: string): string {
    if (!valor) {
      return '';
    }
    const [h, m] = valor.substring(0, 5).split(':').map(Number);
    const periodo = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
  }

  fechaCorta(fecha: string): string {
    if (!fecha) {
      return '';
    }
    const [anio, mes, dia] = fecha.substring(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  tituloSemana(): string {
    return `${this.fechaCorta(this.inicioSemana)} al ${this.fechaCorta(this.sumarDias(this.inicioSemana, 6))}`;
  }

  private minutosEntre(inicio: string, fin: string): number | null {
    if (!inicio || !fin) {
      return null;
    }
    const [hi, mi] = inicio.substring(0, 5).split(':').map(Number);
    const [hf, mf] = fin.substring(0, 5).split(':').map(Number);
    const minutos = (hf * 60 + mf) - (hi * 60 + mi);
    return minutos > 0 ? minutos : null;
  }

  private toast(titulo: string) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: titulo, showConfirmButton: false, timer: 2000 });
  }

  // Las fechas se manejan como texto YYYY-MM-DD en hora local, para que el
  // cambio de zona horaria no mueva el dia.
  private hoy(): string {
    return this.aTexto(new Date());
  }

  private lunesDe(fecha: string): string {
    const d = this.aFecha(fecha);
    const diaSemana = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - (diaSemana - 1));
    return this.aTexto(d);
  }

  private sumarDias(fecha: string, dias: number): string {
    const d = this.aFecha(fecha);
    d.setDate(d.getDate() + dias);
    return this.aTexto(d);
  }

  private aFecha(fecha: string): Date {
    const [anio, mes, dia] = fecha.substring(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  private aTexto(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
