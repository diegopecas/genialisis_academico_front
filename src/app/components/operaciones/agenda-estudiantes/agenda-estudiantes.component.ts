import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { AsistenciaEstudiantesService } from '../../../services/asistencia-estudiantes.service';
import { AgendaEstudianteComponent } from './agenda-estudiante/agenda-estudiante.component';
import { AgendaFechaComponent } from './agenda-estudiante/componentes/agenda-fecha/agenda-fecha.component';
import { hoyLocal } from './agenda-estudiante/mi-agenda.fechas';

/** Grupo con sus estudiantes, para pintar la lista por secciones. */
interface GrupoLista {
  nombre: string;
  color: string;
  estudiantes: any[];
}

/**
 * Agenda de Estudiantes: los estudiantes que asistieron en un día y, al
 * lado, la agenda de ese día del que se escoja. Es la misma agenda que ve
 * el papá en su portal, en solo consulta.
 *
 * La fecha de arriba manda sobre la lista y sobre la agenda. En escritorio
 * la lista y la agenda van lado a lado; en móvil se ve una a la vez y desde
 * la agenda se pasa al estudiante anterior o siguiente sin devolverse.
 *
 * No es un CRUD: la lista es un panel de navegación junto a la agenda, por
 * eso no usa el componente de tablas.
 */
@Component({
  selector: 'app-agenda-estudiantes',
  standalone: true,
  imports: [CommonModule, HeaderComponent, AgendaEstudianteComponent, AgendaFechaComponent],
  templateUrl: './agenda-estudiantes.component.html',
  styleUrl: './agenda-estudiantes.component.scss'
})
export class AgendaEstudiantesComponent implements OnInit {

  titulo = 'Agenda de Estudiantes';

  /** Fecha escogida arriba, en Y-m-d. */
  fecha: string = '';
  /**
   * Fecha que recibe la agenda. Se le pasa solo cuando llegó la lista de
   * ese día, para no consultar la agenda de un niño que ese día no vino.
   */
  fechaAgenda: string = '';

  /** Estudiantes con asistencia en la fecha, tal como llegan del backend. */
  estudiantes: any[] = [];
  /** Los que quedan después del buscador y del filtro de grupo. */
  estudiantesFiltrados: any[] = [];
  gruposVisibles: GrupoLista[] = [];
  /** Nombres de grupo para el filtro. */
  grupos: string[] = [];

  busqueda: string = '';
  grupoFiltro: string = '';

  /** id_estudiante del que se está viendo la agenda. */
  seleccionado: string | null = null;
  /** Se incrementa para que la agenda vuelva a consultar (botón refrescar). */
  version: number = 0;

  cargando = false;
  isMobile = false;
  /** En móvil se ve una cosa a la vez. */
  vistaMovil: 'lista' | 'agenda' = 'lista';

  /**
   * Listas ya consultadas mientras se está en la pantalla, por fecha,
   * incluido hoy. Para traer lo nuevo está el botón de refrescar.
   */
  private listasConsultadas = new Map<string, any[]>();

  constructor(private asistenciaEstudiantesService: AsistenciaEstudiantesService) { }

  ngOnInit(): void {
    this.revisarDispositivo();
    this.fecha = hoyLocal();
    this.cargarLista();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.revisarDispositivo();
  }

  private revisarDispositivo(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  // ---------------------------------------------------------------------
  // Fecha y lista
  // ---------------------------------------------------------------------

  cambiarFecha(fecha: string): void {
    if (!fecha || fecha === this.fecha) return;
    this.fecha = fecha;
    this.cargarLista();
  }

  /** Refresca la lista del día y la agenda abierta. */
  refrescar(): void {
    this.cargarLista(true);
  }

  /**
   * @param forzar Ignora lo guardado y consulta el backend.
   */
  cargarLista(forzar: boolean = false): void {
    const fecha = this.fecha;
    const guardada = forzar ? undefined : this.listasConsultadas.get(fecha);

    if (guardada) {
      this.aplicarLista(guardada, false);
      return;
    }

    this.cargando = true;

    this.asistenciaEstudiantesService.obtenerEstudiantesPorFecha(fecha).subscribe({
      next: (res: any) => {
        const datos = Array.isArray(res) ? res : (res?.body || []);
        const lista = (datos as any[]).map(e => ({
          ...e,
          nombre_completo: this.nombreCompleto(e)
        }));

        this.listasConsultadas.set(fecha, lista);

        // Si mientras llegaba se cambió de día, esta ya no es la que se mira.
        if (fecha !== this.fecha) return;

        this.cargando = false;
        this.aplicarLista(lista, forzar);
      },
      error: (error) => {
        console.error('Error al cargar los estudiantes del día:', error);
        if (fecha !== this.fecha) return;

        this.cargando = false;
        this.aplicarLista([], false);
      }
    });
  }

  /**
   * Pinta la lista del día. Si el estudiante abierto también vino ese día se
   * sigue mostrando su agenda, ahora de la nueva fecha; si no, se cierra.
   *
   * @param refrescarAgenda La agenda abierta debe consultarse de nuevo.
   */
  private aplicarLista(lista: any[], refrescarAgenda: boolean): void {
    this.estudiantes = lista;
    this.grupos = Array.from(new Set(lista.map(e => e.nombre_grupo).filter((g: string) => !!g)));
    if (this.grupoFiltro && !this.grupos.includes(this.grupoFiltro)) {
      this.grupoFiltro = '';
    }
    this.aplicarFiltros();

    const sigue = !!this.seleccionado && lista.some(e => e.id_estudiante === this.seleccionado);
    if (!sigue) {
      this.seleccionado = null;
      this.vistaMovil = 'lista';
      this.fechaAgenda = this.fecha;
      return;
    }

    this.fechaAgenda = this.fecha;
    if (refrescarAgenda) {
      this.version++;
    }
  }

  // ---------------------------------------------------------------------
  // Buscador y filtro de grupo
  // ---------------------------------------------------------------------

  cambiarBusqueda(valor: string): void {
    this.busqueda = valor;
    this.aplicarFiltros();
  }

  cambiarGrupo(valor: string): void {
    this.grupoFiltro = valor;
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const texto = this.normalizar(this.busqueda);

    this.estudiantesFiltrados = this.estudiantes.filter(e =>
      (!this.grupoFiltro || e.nombre_grupo === this.grupoFiltro)
      && (texto === '' || this.normalizar(e.nombre_completo + ' ' + (e.nombre_grupo || '')).includes(texto))
    );

    // El backend ya los manda ordenados por grupo y nombre: basta partir
    // la lista donde cambia el grupo.
    const grupos: GrupoLista[] = [];
    for (const e of this.estudiantesFiltrados) {
      const nombre = e.nombre_grupo || 'Sin grupo';
      let grupo = grupos.find(g => g.nombre === nombre);
      if (!grupo) {
        grupo = { nombre: nombre, color: e.color || '', estudiantes: [] };
        grupos.push(grupo);
      }
      grupo.estudiantes.push(e);
    }
    this.gruposVisibles = grupos;
  }

  /** Quita tildes y pasa a minúsculas para que "maria" encuentre "María". */
  private normalizar(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private nombreCompleto(e: any): string {
    return [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido]
      .filter((parte: string) => !!parte)
      .join(' ');
  }

  // ---------------------------------------------------------------------
  // Selección
  // ---------------------------------------------------------------------

  seleccionar(estudiante: any): void {
    this.seleccionado = estudiante.id_estudiante;
    this.fechaAgenda = this.fecha;

    if (this.isMobile) {
      this.vistaMovil = 'agenda';
      window.scrollTo({ top: 0 });
    }
  }

  volverALista(): void {
    this.vistaMovil = 'lista';
  }

  /** Posición del abierto dentro de lo filtrado (0 si no está). */
  posicion(): number {
    return this.estudiantesFiltrados.findIndex(e => e.id_estudiante === this.seleccionado) + 1;
  }

  puedeIrAnterior(): boolean {
    return this.posicion() > 1;
  }

  puedeIrSiguiente(): boolean {
    const posicion = this.posicion();
    return posicion > 0 && posicion < this.estudiantesFiltrados.length;
  }

  irAnterior(): void {
    if (!this.puedeIrAnterior()) return;
    this.seleccionar(this.estudiantesFiltrados[this.posicion() - 2]);
  }

  irSiguiente(): void {
    if (!this.puedeIrSiguiente()) return;
    this.seleccionar(this.estudiantesFiltrados[this.posicion()]);
  }

  trackById(index: number, estudiante: any): string {
    return estudiante.id_estudiante;
  }
}
