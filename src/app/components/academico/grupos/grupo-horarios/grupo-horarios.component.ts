import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorariosService } from '../../../../services/horarios.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-grupo-horarios',
  templateUrl: './grupo-horarios.component.html',
  styleUrl: './grupo-horarios.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GrupoHorariosComponent implements OnInit, OnChanges {

  /** Grupo al que pertenecen los horarios */
  @Input() idGrupo: any = null;
  /** Áreas académicas asociadas al grupo (las devuelve area-academica-x-grupo) */
  @Input() areasAsociadas: any[] = [];
  /** Si es false solo se puede consultar */
  @Input() editable: boolean = true;

  public diasSemana: any[] = [];
  public horariosGrupo: any[] = [];
  public horasDelDia: string[] = [];
  public areasSeleccionadasFiltro: { [key: string]: boolean } = {};

  // ---- Modo agregar por arrastre ----
  public modoAgregar: boolean = false;
  // Vista activa en movil: 'lista' o 'calendario'
  public vistaMovil: string = 'lista';
  // Leyenda de filtros plegada en movil
  public filtrosAbiertos: boolean = false;
  public areaParaPintar: any = null;
  public franjasPendientes: any[] = [];
  // Ids de franjas guardadas marcadas para eliminar
  public franjasAEliminar: string[] = [];
  public guardando: boolean = false;

  // Arrastre en curso
  private arrastrando: boolean = false;
  private arrastreDia: any = null;
  private arrastreIndiceInicio: number = -1;
  public arrastreIndiceFin: number = -1;

  // ---- Modal de edición de una franja existente ----
  public mostrarModalHorario: boolean = false;
  public horarioErrorSolapamiento: string = '';
  public horarioModal = {
    id: null,
    id_area_academica: null,
    id_dia_semana: null,
    hora_inicial: '',
    hora_final: '',
    total_minutos: 0,
    total_clases: 1
  } as any;

  // Rango de la grilla en minutos desde medianoche
  private readonly minutosPorBloque: number = 30;

  constructor(
    private horariosService: HorariosService,
    private diasSemanaService: DiasSemanaService
  ) { }

  ngOnInit(): void {
    this.cargarDiasSemana();
    if (this.idGrupo) {
      this.cargarHorarios(this.idGrupo);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idGrupo'] && this.idGrupo) {
      this.cargarHorarios(this.idGrupo);
    }
    if (changes['areasAsociadas']) {
      this.inicializarFiltroAreas();
    }
  }

  // ========== Carga de datos ==========

  cargarDiasSemana(): void {
    this.diasSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body as any[];
      },
      error: (error: any) => {
        console.error("Error al cargar días de la semana", error);
      }
    });
  }

  cargarHorarios(id_grupo: any): void {
    this.horariosService.obtenerByGrupo(id_grupo).subscribe({
      next: (response: any) => {
        this.horariosGrupo = response.body as any[];
        this.calcularHorasDelDia();
        this.inicializarFiltroAreas();
      },
      error: (error: any) => {
        console.error("Error al cargar horarios", error);
      }
    });
  }

  inicializarFiltroAreas(): void {
    (this.areasAsociadas || []).forEach(area => {
      if (this.areasSeleccionadasFiltro[area.id_area_academica] === undefined) {
        this.areasSeleccionadasFiltro[area.id_area_academica] = true;
      }
    });
  }

  toggleAreaFiltro(idArea: string): void {
    this.areasSeleccionadasFiltro[idArea] = !this.areasSeleccionadasFiltro[idArea];
  }

  toggleFiltros(): void {
    this.filtrosAbiertos = !this.filtrosAbiertos;
  }

  /** Cambia entre la lista por dia y la grilla en movil */
  cambiarVistaMovil(vista: string): void {
    this.vistaMovil = vista;
    if (vista === 'lista') {
      this.modoAgregar = false;
    }
  }

  get areasFiltradasActivas(): number {
    return (this.areasAsociadas || []).filter(a => this.areasSeleccionadasFiltro[a.id_area_academica]).length;
  }

  // ========== Resumen ==========

  get horariosFiltrados(): any[] {
    return this.horariosGrupo.filter(h => this.areasSeleccionadasFiltro[h.id_area_academica]);
  }

  get diasActivos(): number {
    const diasUnicos = new Set(this.horariosFiltrados.map(h => h.id_dia_semana));
    return diasUnicos.size;
  }

  get horasSemanales(): number {
    const totalMinutos = this.horariosFiltrados.reduce((total, h) => total + Number(h.total_minutos), 0);
    return Math.round(totalMinutos / 60 * 10) / 10;
  }

  // Vista móvil: horarios agrupados por día
  get horariosAgrupadosPorDia(): any[] {
    const grupos: any[] = [];
    this.diasSemana.forEach(dia => {
      const horariosDia = this.horariosFiltrados
        .filter(h => h.id_dia_semana == dia.id)
        .sort((a, b) => (a.hora_inicial || '').localeCompare(b.hora_inicial || ''));
      if (horariosDia.length > 0) {
        grupos.push({ dia: dia, horarios: horariosDia });
      }
    });
    return grupos;
  }

  // ========== Grilla ==========

  /**
   * Arma las filas de la grilla en bloques de 30 minutos, cubriendo los horarios
   * existentes, las franjas pendientes y un margen mínimo de 07:00 a 16:00.
   */
  calcularHorasDelDia(): void {
    let minutoMinimo = 7 * 60;
    let minutoMaximo = 16 * 60;

    const todos = [...this.horariosGrupo, ...this.franjasPendientes];
    todos.forEach(horario => {
      const inicio = this.aMinutos(horario.hora_inicial);
      const fin = this.aMinutos(horario.hora_final);
      if (inicio < minutoMinimo) minutoMinimo = inicio;
      if (fin > minutoMaximo) minutoMaximo = fin;
    });

    const inicioRedondeado = Math.floor(minutoMinimo / this.minutosPorBloque) * this.minutosPorBloque;
    const finRedondeado = Math.ceil(minutoMaximo / this.minutosPorBloque) * this.minutosPorBloque;

    const horas: string[] = [];
    for (let minutos = inicioRedondeado; minutos < finRedondeado; minutos += this.minutosPorBloque) {
      horas.push(this.aTexto(minutos));
    }
    this.horasDelDia = horas;
  }

  /** Convierte 'HH:mm' o 'HH:mm:ss' a minutos desde medianoche */
  private aMinutos(hora: string): number {
    if (!hora) return 0;
    const partes = hora.split(':').map(Number);
    return (partes[0] * 60) + (partes[1] || 0);
  }

  /** Convierte minutos desde medianoche a 'HH:mm' */
  private aTexto(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  /**
   * Devuelve el horario existente que ocupa esa celda, con banderas de
   * inicio/fin para pintar el bloque continuo.
   */
  getHorarioInfo(idDia: any, hora: string): any | null {
    const minutosCelda = this.aMinutos(hora);

    const horario = this.horariosFiltrados.find(h => {
      if (h.id_dia_semana != idDia) return false;
      const inicio = this.aMinutos(h.hora_inicial);
      const fin = this.aMinutos(h.hora_final);
      return minutosCelda >= inicio && minutosCelda < fin;
    });

    if (!horario) return null;

    const inicioFormato = (horario.hora_inicial || '').substring(0, 5);
    const finFormato = (horario.hora_final || '').substring(0, 5);
    const esInicio = hora === inicioFormato;
    const esFin = (minutosCelda + this.minutosPorBloque) >= this.aMinutos(horario.hora_final);

    return {
      ...horario,
      esInicio: esInicio,
      esFin: esFin,
      esIntermedio: !esInicio && !esFin,
      duracionCompleta: `${inicioFormato} - ${finFormato}`
    };
  }

  getClaseHorario(idDia: any, hora: string): string {
    return this.getHorarioInfo(idDia, hora) ? 'tiene-horario' : 'sin-horario';
  }

  obtenerColorArea(id_area: string): string {
    const horario = this.horariosGrupo.find(h => h.id_area_academica === id_area);
    if (horario && horario.area_academica_color) {
      return horario.area_academica_color;
    }
    const area = (this.areasAsociadas || []).find(a => a.id_area_academica === id_area);
    return area?.color || '#FFFFFF';
  }

  obtenerNombreArea(id_area: string): string {
    const area = (this.areasAsociadas || []).find(a => a.id_area_academica === id_area);
    return area?.nombre_area_academica || '';
  }

  // ========== Modo agregar (arrastre) ==========

  activarModoAgregar(): void {
    if ((this.areasAsociadas || []).length === 0) return;
    this.modoAgregar = true;
    this.vistaMovil = 'calendario';
    if (!this.areaParaPintar) {
      this.areaParaPintar = this.areasAsociadas[0].id_area_academica;
    }
  }

  cancelarModoAgregar(): void {
    this.modoAgregar = false;
    this.arrastrando = false;
    this.arrastreDia = null;
    this.arrastreIndiceInicio = -1;
    this.arrastreIndiceFin = -1;
    this.franjasPendientes = [];
    this.franjasAEliminar = [];
    this.calcularHorasDelDia();
  }

  get hayCambiosPendientes(): boolean {
    return this.franjasPendientes.length > 0 || this.franjasAEliminar.length > 0;
  }

  /** Marca o desmarca una franja guardada para eliminar */
  toggleEliminarFranja(horario: any): void {
    const indice = this.franjasAEliminar.indexOf(horario.id);
    if (indice >= 0) {
      this.franjasAEliminar.splice(indice, 1);
    } else {
      this.franjasAEliminar.push(horario.id);
    }
  }

  estaMarcadaParaEliminar(id: any): boolean {
    return this.franjasAEliminar.indexOf(id) >= 0;
  }

  /** Marca la celda como parte de la selección que se está arrastrando */
  esCeldaEnArrastre(idDia: any, indice: number): boolean {
    if (!this.arrastrando || this.arrastreDia != idDia) return false;
    const desde = Math.min(this.arrastreIndiceInicio, this.arrastreIndiceFin);
    const hasta = Math.max(this.arrastreIndiceInicio, this.arrastreIndiceFin);
    return indice >= desde && indice <= hasta;
  }

  iniciarArrastre(idDia: any, indice: number, evento: Event): void {
    if (!this.modoAgregar || !this.areaParaPintar) return;
    evento.preventDefault();
    this.arrastrando = true;
    this.arrastreDia = idDia;
    this.arrastreIndiceInicio = indice;
    this.arrastreIndiceFin = indice;
  }

  extenderArrastre(idDia: any, indice: number): void {
    if (!this.arrastrando || this.arrastreDia != idDia) return;
    this.arrastreIndiceFin = indice;
  }

  /** Sigue el dedo sobre la grilla y traduce la posición a celda */
  moverArrastreTactil(evento: TouchEvent): void {
    if (!this.arrastrando) return;
    evento.preventDefault();
    const toque = evento.touches[0];
    const elemento = document.elementFromPoint(toque.clientX, toque.clientY) as HTMLElement;
    if (!elemento) return;
    const celda = elemento.closest('[data-dia][data-indice]') as HTMLElement;
    if (!celda) return;
    const dia = celda.getAttribute('data-dia');
    const indice = Number(celda.getAttribute('data-indice'));
    this.extenderArrastre(dia, indice);
  }

  terminarArrastre(): void {
    if (!this.arrastrando) return;

    const desde = Math.min(this.arrastreIndiceInicio, this.arrastreIndiceFin);
    const hasta = Math.max(this.arrastreIndiceInicio, this.arrastreIndiceFin);
    const idDia = this.arrastreDia;

    this.arrastrando = false;
    this.arrastreDia = null;
    this.arrastreIndiceInicio = -1;
    this.arrastreIndiceFin = -1;

    if (desde < 0 || hasta < 0 || !idDia) return;

    const horaInicial = this.horasDelDia[desde];
    const horaFinal = this.aTexto(this.aMinutos(this.horasDelDia[hasta]) + this.minutosPorBloque);

    this.agregarFranjaPendiente(idDia, horaInicial, horaFinal);
  }

  /** Crea la franja pendiente si no se cruza con nada */
  private agregarFranjaPendiente(idDia: any, horaInicial: string, horaFinal: string): void {
    const conflicto = this.buscarConflicto(idDia, horaInicial, horaFinal, null);
    if (conflicto) {
      Swal.fire('Horario solapado', conflicto, 'warning');
      return;
    }

    this.franjasPendientes.push({
      id_dia_semana: idDia,
      id_area_academica: this.areaParaPintar,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      total_minutos: this.aMinutos(horaFinal) - this.aMinutos(horaInicial),
      total_clases: 1
    });
    this.calcularHorasDelDia();
  }

  quitarFranjaPendiente(indice: number): void {
    this.franjasPendientes.splice(indice, 1);
    this.calcularHorasDelDia();
  }

  /** Recalcula los minutos cuando se edita la hora de una franja pendiente */
  recalcularFranjaPendiente(franja: any): void {
    franja.total_minutos = this.aMinutos(franja.hora_final) - this.aMinutos(franja.hora_inicial);
  }

  /** Devuelve la franja pendiente que ocupa esa celda (para el preview) */
  getFranjaPendiente(idDia: any, hora: string): any | null {
    const minutosCelda = this.aMinutos(hora);
    const franja = this.franjasPendientes.find(f => {
      if (f.id_dia_semana != idDia) return false;
      return minutosCelda >= this.aMinutos(f.hora_inicial) && minutosCelda < this.aMinutos(f.hora_final);
    });
    if (!franja) return null;
    return {
      ...franja,
      esInicio: hora === franja.hora_inicial
    };
  }

  nombreDia(idDia: any): string {
    const dia = this.diasSemana.find(d => d.id == idDia);
    return dia?.nombre || '';
  }

  /**
   * Valida contra los horarios guardados y contra las franjas pendientes.
   * Devuelve el mensaje del cruce o null si no hay conflicto.
   */
  private buscarConflicto(idDia: any, horaInicial: string, horaFinal: string, idHorarioIgnorar: any): string | null {
    const inicioNuevo = this.aMinutos(horaInicial);
    const finNuevo = this.aMinutos(horaFinal);

    const existente = this.horariosGrupo.find((h: any) => {
      if (idHorarioIgnorar && String(h.id) === String(idHorarioIgnorar)) return false;
      if (this.estaMarcadaParaEliminar(h.id)) return false;
      if (String(h.id_dia_semana) !== String(idDia)) return false;
      return inicioNuevo < this.aMinutos(h.hora_final) && this.aMinutos(h.hora_inicial) < finNuevo;
    });

    if (existente) {
      const nombre = this.obtenerNombreArea(existente.id_area_academica) || 'otra área';
      return `Se cruza con ${nombre} (${(existente.hora_inicial || '').substring(0, 5)} - ${(existente.hora_final || '').substring(0, 5)}).`;
    }

    const pendiente = this.franjasPendientes.find((f: any) => {
      if (String(f.id_dia_semana) !== String(idDia)) return false;
      return inicioNuevo < this.aMinutos(f.hora_final) && this.aMinutos(f.hora_inicial) < finNuevo;
    });

    if (pendiente) {
      const nombre = this.obtenerNombreArea(pendiente.id_area_academica) || 'otra área';
      return `Se cruza con una franja sin guardar de ${nombre} (${pendiente.hora_inicial} - ${pendiente.hora_final}).`;
    }

    return null;
  }

  /** Envía las franjas nuevas y las marcadas para eliminar en una sola petición */
  guardarFranjas(): void {
    if (!this.hayCambiosPendientes) return;

    const sinClases = this.franjasPendientes.find(f => !f.total_clases || f.total_clases < 1);
    if (sinClases) {
      Swal.fire('Advertencia', 'El total de clases debe ser mayor a cero en todas las franjas', 'warning');
      return;
    }

    this.guardando = true;

    const data = {
      id_grupo: this.idGrupo,
      horarios: this.franjasPendientes.map(f => ({
        id_area_academica: f.id_area_academica,
        id_dia_semana: f.id_dia_semana,
        hora_inicial: f.hora_inicial,
        hora_final: f.hora_final,
        total_minutos: f.total_minutos,
        total_clases: f.total_clases
      })),
      eliminar: [...this.franjasAEliminar]
    };

    this.horariosService.crearLote(data).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;

        const creadas = respuesta?.total ?? this.franjasPendientes.length;
        const borradas = respuesta?.eliminados ?? this.franjasAEliminar.length;
        const partes: string[] = [];
        if (creadas > 0) partes.push(`${creadas} nueva(s)`);
        if (borradas > 0) partes.push(`${borradas} eliminada(s)`);

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: partes.join(' · '),
          showConfirmButton: false,
          timer: 2000
        });

        this.franjasPendientes = [];
        this.franjasAEliminar = [];
        this.modoAgregar = false;
        this.cargarHorarios(this.idGrupo);
      },
      error: (error: any) => {
        this.guardando = false;
        console.error("Error al guardar los cambios de horarios", error);
        Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
      }
    });
  }

  // ========== Edición de una franja existente ==========

  abrirModalHorario(idAreaAcademica?: any, idDiaSemana?: any, hora?: string): void {
    let horaInicial = '';
    let horaFinal = '';

    if (hora) {
      horaInicial = hora;
      horaFinal = this.aTexto(this.aMinutos(hora) + this.minutosPorBloque);
    }

    this.horarioModal = {
      id: null,
      id_area_academica: idAreaAcademica || null,
      id_dia_semana: idDiaSemana || null,
      hora_inicial: horaInicial,
      hora_final: horaFinal,
      total_minutos: horaInicial && horaFinal ? this.minutosPorBloque : 0,
      total_clases: 1
    };
    this.horarioErrorSolapamiento = '';
    this.mostrarModalHorario = true;
  }

  cerrarModalHorario(): void {
    this.mostrarModalHorario = false;
    this.horarioErrorSolapamiento = '';
  }

  calcularMinutos(): void {
    this.horarioErrorSolapamiento = '';

    if (this.horarioModal.hora_inicial && this.horarioModal.hora_final) {
      const diferencia = this.aMinutos(this.horarioModal.hora_final) - this.aMinutos(this.horarioModal.hora_inicial);
      this.horarioModal.total_minutos = diferencia > 0 ? diferencia : 0;

      if (this.horarioModal.id_area_academica && this.horarioModal.id_dia_semana && diferencia > 0) {
        this.horarioErrorSolapamiento = this.buscarConflicto(
          this.horarioModal.id_dia_semana,
          this.horarioModal.hora_inicial,
          this.horarioModal.hora_final,
          this.horarioModal.id
        ) || '';
      }
    }
  }

  guardarHorario(): void {
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

    if (this.horarioModal.total_minutos <= 0 || this.horarioErrorSolapamiento) {
      return;
    }

    const data = {
      id_grupo: this.idGrupo,
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
        next: () => {
          Swal.fire('Éxito', 'Horario actualizado correctamente', 'success');
          this.cargarHorarios(this.idGrupo);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al actualizar horario", error);
          Swal.fire('Error', 'No se pudo actualizar el horario', 'error');
        }
      });
    } else {
      this.horariosService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Horario creado correctamente', 'success');
          this.cargarHorarios(this.idGrupo);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al crear horario", error);
          Swal.fire('Error', 'No se pudo crear el horario', 'error');
        }
      });
    }
  }

  editarHorario(horario: any): void {
    this.horarioModal = {
      id: horario.id,
      id_area_academica: horario.id_area_academica,
      id_dia_semana: horario.id_dia_semana,
      hora_inicial: (horario.hora_inicial || '').substring(0, 5),
      hora_final: (horario.hora_final || '').substring(0, 5),
      total_minutos: horario.total_minutos,
      total_clases: horario.total_clases || 1
    };
    this.horarioErrorSolapamiento = '';
    this.mostrarModalHorario = true;
  }

  async eliminarHorario(horario: any): Promise<void> {
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
        next: () => {
          Swal.fire('Éxito', 'Horario eliminado correctamente', 'success');
          this.cargarHorarios(this.idGrupo);
        },
        error: (error: any) => {
          console.error("Error al eliminar horario", error);
          Swal.fire('Error', 'No se pudo eliminar el horario', 'error');
        }
      });
    }
  }

  mostrarDetalleHorario(horarioInfo: any): void {
    const area = this.obtenerNombreArea(horarioInfo.id_area_academica);

    Swal.fire({
      title: 'Detalle de Horario',
      html: `
        <div class="text-start">
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Horario:</strong> ${horarioInfo.duracionCompleta}</p>
          <p><strong>Duración:</strong> ${horarioInfo.total_minutos} minutos</p>
          <p><strong>Clases:</strong> ${horarioInfo.total_clases}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      showCancelButton: this.editable,
      cancelButtonText: 'Editar',
      cancelButtonColor: '#3085d6'
    }).then((result) => {
      if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
        this.editarHorario(horarioInfo);
      }
    });
  }

  // Adaptador para la vista móvil
  mostrarDetalleHorarioMovil(horario: any): void {
    const horaIni = (horario.hora_inicial || '').substring(0, 5);
    const horaFin = (horario.hora_final || '').substring(0, 5);
    this.mostrarDetalleHorario({
      ...horario,
      duracionCompleta: horaIni + ' - ' + horaFin,
      esInicio: true
    });
  }
}