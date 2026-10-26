import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { HoraInputComponent } from '../../../common/hora-input/hora-input.component';
import { FechaInputComponent } from '../../../common/fecha-input/fecha-input.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import { DocentesService } from '../../../services/docentes.service';
import { EstudiantesXCursosExtraService } from '../../../services/estudiantes-x-cursos-extra.service';
import { EspaciosLugaresCursosExtraService } from '../../../services/espacios-lugares-cursos-extra.service';
import { SesionesCursosExtraService } from '../../../services/sesiones-cursos-extra.service';
import { ReservasSesionesCursosExtraService } from '../../../services/reservas-sesiones-cursos-extra.service';

/**
 * Clases del Dia: la pantalla del profesor para registrar las clases de los
 * cursos extra.
 *
 * Muestra las sesiones de una fecha (por defecto hoy). Al abrir una, se marca
 * quien asistio y quien no, se puede agregar a un inscrito que llego sin
 * reserva, se ajustan los profesores y sus minutos y se da por dictada. Con
 * ese registro quedan a la vez la asistencia, las horas del profesor y el
 * consumo del paquete. Tambien se puede cancelar la clase (por ejemplo por
 * lluvia) o crear una clase que no estaba en ningun horario.
 */
@Component({
  selector: 'app-clases-dia-cursos-extra',
  templateUrl: './clases-dia-cursos-extra.component.html',
  styleUrl: './clases-dia-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HoraInputComponent, FechaInputComponent]
})
export class ClasesDiaCursosExtraComponent implements OnInit {

  titulo = 'Clases del Día';

  fecha: string = '';
  idCurso: any = null;
  soloMias: boolean = false;
  idMiDocente: any = null;

  cursos: any[] = [];
  docentes: any[] = [];
  espacios: any[] = [];
  sesiones: any[] = [];
  cargando: boolean = false;

  // Toma de asistencia de la sesion abierta
  sesion: any = null;
  marcas: { [idReserva: string]: string } = {};
  docentesSesion: any[] = [];
  observaciones: string = '';
  inscritosCurso: any[] = [];
  idInscripcionAgregar: any = null;

  // Clase nueva (sesion suelta)
  mostrarModalNueva: boolean = false;
  nueva: any = {};
  inscritosNueva: any[] = [];

  constructor(
    private cursosExtraService: CursosExtraService,
    private docentesService: DocentesService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
    private espaciosLugaresCursosExtraService: EspaciosLugaresCursosExtraService,
    private sesionesCursosExtraService: SesionesCursosExtraService,
    private reservasSesionesCursosExtraService: ReservasSesionesCursosExtraService
  ) { }

  ngOnInit(): void {
    this.fecha = this.hoy();
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
    // Si el usuario es docente arranca viendo solo sus clases.
    this.sesionesCursosExtraService.obtenerMiDocente().subscribe({
      next: (response: any) => {
        this.idMiDocente = response.body ? response.body.id_docente : null;
        this.soloMias = !!this.idMiDocente;
        this.cargarSesiones();
      },
      error: (error: any) => {
        console.error('Error al consultar el docente del usuario', error);
        this.cargarSesiones();
      }
    });
  }

  // ==================== LISTADO ====================

  cargarSesiones() {
    if (!this.fecha) {
      return;
    }
    this.cargando = true;
    this.sesionesCursosExtraService.obtenerTodas({
      fecha_desde: this.fecha,
      fecha_hasta: this.fecha,
      id_curso_extra: this.idCurso,
      id_docente: this.soloMias ? this.idMiDocente : null
    }).subscribe({
      next: (response: any) => {
        this.sesiones = response.body || [];
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar las clases', error);
        this.cargando = false;
      }
    });
  }

  cambiarDia(dias: number) {
    this.fecha = this.sumarDias(this.fecha, dias);
    this.cargarSesiones();
  }

  // ==================== TOMA DE ASISTENCIA ====================

  /**
   * Abre la clase. Si es de un horario y todavia no tiene fila (virtual),
   * primero se crea con sus reservas: abrirla es lo que la vuelve real.
   */
  abrirSesion(s: any) {
    this.idInscripcionAgregar = null;
    if (s.id) {
      this.recargarSesion(s.id, true);
      return;
    }
    this.sesionesCursosExtraService.materializar({
      id_horario_curso_extra: s.id_horario_curso_extra,
      fecha: s.fecha
    }).subscribe({
      next: (respuesta: any) => this.recargarSesion(respuesta.id, true),
      error: (error: any) => console.error('Error al abrir la clase', error)
    });
  }

  /**
   * Carga la sesion. Con $reiniciar se toman de nuevo las marcas, los
   * profesores y las observaciones guardados; sin el, se conservan las
   * marcas que el profesor ya hizo (por ejemplo al agregar un estudiante).
   */
  recargarSesion(id: any, reiniciar: boolean) {
    this.sesionesCursosExtraService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        const sesion = body.length > 0 ? body[0] : null;
        if (!sesion) {
          return;
        }
        const marcasPrevias: { [idReserva: string]: string } = reiniciar ? {} : this.marcas;
        this.sesion = sesion;
        this.marcas = {};
        for (const r of this.reservasConPuesto()) {
          if (marcasPrevias[r.id]) {
            this.marcas[r.id] = marcasPrevias[r.id];
          } else if (r.codigo_estado === 'ASISTIO' || r.codigo_estado === 'NO_ASISTIO') {
            this.marcas[r.id] = r.codigo_estado;
          }
        }
        if (reiniciar) {
          this.docentesSesion = (sesion.docentes || []).map((d: any) => ({
            id_docente: d.id_docente, minutos: d.minutos, es_titular: d.es_titular
          }));
          if (this.docentesSesion.length === 0 && this.idMiDocente) {
            this.docentesSesion.push({ id_docente: this.idMiDocente, minutos: this.minutosEntre(sesion.hora_inicial, sesion.hora_final), es_titular: 1 });
          }
          this.observaciones = sesion.observaciones || '';
        }
        this.cargarInscritos(sesion.id_curso_extra, (lista) => this.inscritosCurso = lista);
      },
      error: (error: any) => console.error('Error al cargar la clase', error)
    });
  }

  cerrarSesion() {
    this.sesion = null;
    this.cargarSesiones();
  }

  /** Reservas que ocupan puesto: las que se marcan. */
  reservasConPuesto(): any[] {
    if (!this.sesion) {
      return [];
    }
    return (this.sesion.reservas || []).filter((r: any) => ['RESERVADA', 'ASISTIO', 'NO_ASISTIO'].includes(r.codigo_estado));
  }

  /** Canceladas y reagendadas: se muestran aparte, sin marcar. */
  reservasLiberadas(): any[] {
    if (!this.sesion) {
      return [];
    }
    return (this.sesion.reservas || []).filter((r: any) => ['CANCELADA', 'REAGENDADA'].includes(r.codigo_estado));
  }

  marcar(r: any, codigo: string) {
    this.marcas[r.id] = codigo;
  }

  marcarTodos(codigo: string) {
    for (const r of this.reservasConPuesto()) {
      this.marcas[r.id] = codigo;
    }
  }

  sinMarcar(): number {
    return this.reservasConPuesto().filter((r: any) => !this.marcas[r.id]).length;
  }

  inscritosSinPuesto(): any[] {
    const conPuesto = this.reservasConPuesto().map((r: any) => r.id_estudiante_x_curso_extra);
    return this.inscritosCurso.filter((i: any) => !conPuesto.includes(i.id));
  }

  /** Inscrito que llego sin reserva. Queda reservado y marcado como asistio. */
  agregarEstudiante() {
    if (!this.idInscripcionAgregar) {
      Swal.fire('Advertencia', 'Selecciona el estudiante', 'warning');
      return;
    }
    this.reservasSesionesCursosExtraService.crear({
      id_sesion_curso_extra: this.sesion.id,
      id_estudiante_x_curso_extra: this.idInscripcionAgregar,
      en_clase: 1
    }).subscribe({
      next: (respuesta: any) => {
        if (respuesta && respuesta.id) {
          this.marcas[respuesta.id] = 'ASISTIO';
        }
        this.idInscripcionAgregar = null;
        this.recargarSesion(this.sesion.id, false);
      },
      error: (error: any) => console.error('Error al agregar el estudiante', error)
    });
  }

  agregarDocente() {
    this.docentesSesion.push({ id_docente: null, minutos: this.minutosEntre(this.sesion.hora_inicial, this.sesion.hora_final), es_titular: 0 });
  }

  quitarDocente(indice: number) {
    this.docentesSesion.splice(indice, 1);
  }

  async darPorDictada() {
    const faltan = this.sinMarcar();
    if (faltan > 0) {
      const resultado = await Swal.fire({
        title: `Faltan ${faltan} por marcar`,
        text: 'Los que no marques quedan como no asistió.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Volver'
      });
      if (!resultado.isConfirmed) {
        return;
      }
    }
    if (this.docentesSesion.some((d: any) => !d.id_docente)) {
      Swal.fire('Advertencia', 'Selecciona el profesor en cada fila o quita la fila vacía', 'warning');
      return;
    }

    const reservas = Object.keys(this.marcas).map((id) => ({ id: id, codigo_estado: this.marcas[id] }));
    this.sesionesCursosExtraService.registrarAsistencia({
      id: this.sesion.id,
      reservas: reservas,
      docentes: this.docentesSesion,
      observaciones: this.observaciones
    }).subscribe({
      next: (respuesta: any) => {
        if (respuesta && respuesta.sin_paquete > 0) {
          Swal.fire('Clase registrada',
            `${respuesta.sin_paquete} estudiante(s) tomaron la clase sin un paquete vigente del que descontar.`, 'info');
        } else {
          this.toast('Clase registrada');
        }
        this.cerrarSesion();
      },
      error: (error: any) => console.error('Error al registrar la asistencia', error)
    });
  }

  async cancelarClase() {
    const resultado = await Swal.fire({
      title: 'Cancelar la clase',
      text: 'Las reservas quedan canceladas y no descuentan del paquete.',
      input: 'text',
      inputLabel: 'Motivo',
      inputPlaceholder: 'Ej: lluvia',
      showCancelButton: true,
      confirmButtonText: 'Cancelar clase',
      cancelButtonText: 'Volver',
      inputValidator: (valor) => !valor || !valor.trim() ? 'Escribe el motivo' : null
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.sesionesCursosExtraService.cancelar({ id: this.sesion.id, motivo_cancelacion: resultado.value }).subscribe({
      next: () => {
        this.toast('Clase cancelada');
        this.cerrarSesion();
      },
      error: (error: any) => console.error('Error al cancelar la clase', error)
    });
  }

  reabrirClase() {
    this.sesionesCursosExtraService.reabrir({ id: this.sesion.id }).subscribe({
      next: () => {
        this.toast('Clase reabierta');
        this.recargarSesion(this.sesion.id, true);
      },
      error: (error: any) => console.error('Error al reabrir la clase', error)
    });
  }

  // ==================== CLASE NUEVA ====================

  abrirModalNueva() {
    this.nueva = {
      id_curso_extra: this.idCurso,
      hora_inicial: '',
      hora_final: '',
      id_espacio_lugar_curso_extra: null,
      id_docente: this.idMiDocente,
      estudiantes: [] as any[]
    };
    this.inscritosNueva = [];
    if (this.nueva.id_curso_extra) {
      this.onCursoNuevaChange();
    }
    this.mostrarModalNueva = true;
  }

  onCursoNuevaChange() {
    this.nueva.estudiantes = [];
    this.inscritosNueva = [];
    if (this.nueva.id_curso_extra) {
      this.cargarInscritos(this.nueva.id_curso_extra, (lista) => this.inscritosNueva = lista);
    }
  }

  alternarEstudianteNueva(id: any) {
    const indice = this.nueva.estudiantes.indexOf(id);
    if (indice >= 0) {
      this.nueva.estudiantes.splice(indice, 1);
    } else {
      this.nueva.estudiantes.push(id);
    }
  }

  crearNueva() {
    if (!this.nueva.id_curso_extra || !this.nueva.hora_inicial || !this.nueva.hora_final) {
      Swal.fire('Advertencia', 'Curso y horas son obligatorios', 'warning');
      return;
    }
    this.sesionesCursosExtraService.crear({
      id_curso_extra: this.nueva.id_curso_extra,
      fecha: this.fecha,
      hora_inicial: this.nueva.hora_inicial,
      hora_final: this.nueva.hora_final,
      id_espacio_lugar_curso_extra: this.nueva.id_espacio_lugar_curso_extra,
      estudiantes: this.nueva.estudiantes,
      docentes: this.nueva.id_docente
        ? [{ id_docente: this.nueva.id_docente, es_titular: 1, minutos: this.minutosEntre(this.nueva.hora_inicial, this.nueva.hora_final) }]
        : []
    }).subscribe({
      next: (respuesta: any) => {
        this.mostrarModalNueva = false;
        this.cargarSesiones();
        if (respuesta && respuesta.id) {
          this.recargarSesion(respuesta.id, true);
        }
      },
      error: (error: any) => console.error('Error al crear la clase', error)
    });
  }

  // ==================== APOYO ====================

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

  cupoTexto(s: any): string {
    if (s.cupo === null || s.cupo === undefined) {
      return `${s.ocupados} inscritos`;
    }
    return `${s.ocupados} / ${s.cupo}`;
  }

  textoPaquete(r: any): string {
    if (r.sesiones_disponibles === null || r.sesiones_disponibles === undefined) {
      return 'Sin paquete';
    }
    if (r.sesiones_disponibles === 0) {
      return 'Paquete agotado';
    }
    return r.sesiones_disponibles === 1 ? '1 sesión disponible' : `${r.sesiones_disponibles} sesiones disponibles`;
  }

  alertaPaquete(r: any): boolean {
    return r.sesiones_disponibles === null || r.sesiones_disponibles === undefined || r.sesiones_disponibles === 0;
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

  fechaLarga(fecha: string): string {
    if (!fecha) {
      return '';
    }
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
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

  private hoy(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private sumarDias(fecha: string, dias: number): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
