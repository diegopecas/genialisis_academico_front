import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';

/**
 * Calificación de una actividad. Misma forma que en la agenda: el backend
 * manda el cualitativo cuando existe y el cuantitativo de respaldo. El icono
 * es una clase de Font Awesome ("fa-medal"), no un emoji.
 */
interface CalificacionActividad {
  parametro: string;
  cualitativo: string;
  cuantitativo: number | null;
  icono: string;
}

/** Actividad tal como la manda GET tareas-x-sprints/estudiante/:id. */
interface ActividadEstudiante {
  id: string;
  fecha_ejecucion: string;
  titulo: string;
  descripcion: string | null;
  minutos_duracion: number | null;
  tipo_actividad: string | null;
  icono_tipo_actividad: string | null;
  area: string | null;
  color_area: string | null;
  grupo: string | null;
  docente: string | null;
  observacion_grupo: string | null;
  observacion_estudiante: string | null;
  calificaciones: CalificacionActividad[];
}

/** Actividades de un mismo día, para pintarlas bajo su fecha. */
interface DiaActividades {
  fecha: string;
  texto: string;
  actividades: ActividadEstudiante[];
}

/**
 * Pestaña Actividades de la vista 360: las actividades que hizo el niño en
 * un rango de fechas, con sus calificaciones y observaciones.
 *
 * Es el mismo dato de las actividades de la agenda, pero de varios días.
 * Las del sprint de informe no salen: van en el informe del corte.
 *
 * No importa nada de la agenda a propósito: la pestaña vive en la vista 360
 * de los dos portales y así el mismo archivo sirve en ambos.
 *
 * Abre en el día de hoy. Si llega fechaInicial (el "Ver más" de una
 * actividad en la agenda), abre en ese día. Cuando el rango trae varios
 * días, solo el primero (el más reciente) queda abierto.
 *
 * El buscador filtra en el navegador sobre lo que ya trajo el rango de
 * fechas: no vuelve a consultar el backend.
 */
@Component({
  selector: 'app-estudiante-actividades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-actividades.component.html',
  styleUrl: './estudiante-actividades.component.scss'
})
export class EstudianteActividadesComponent implements OnChanges {
  @Input() idEstudiante: string = '0';
  /** Día con el que abre, en Y-m-d. Vacío: hoy. */
  @Input() fechaInicial: string = '';

  desde: string = '';
  hasta: string = '';
  hoy: string = this.hoyLocal();

  /** Lo que trajo el backend para el rango, sin filtrar. */
  private actividades: ActividadEstudiante[] = [];
  /** Lo filtrado por el buscador, agrupado por día. */
  dias: DiaActividades[] = [];
  total = 0;
  totalVisibles = 0;
  busqueda: string = '';
  /** Días desplegados. Al traer o filtrar, solo el primero. */
  private diasAbiertos = new Set<string>();
  cargando = false;
  error = '';

  constructor(private tareasXSprintsService: TareasXSprintsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fechaInicial'] || (changes['idEstudiante'] && !this.desde)) {
      if (this.fechaInicial) {
        this.desde = this.fechaInicial;
        this.hasta = this.fechaInicial;
      } else {
        this.ponerHoy();
      }
    }

    if (this.idEstudiante && this.idEstudiante !== '0') {
      this.consultar();
    }
  }

  ponerHoy(): void {
    this.hoy = this.hoyLocal();
    this.desde = this.hoy;
    this.hasta = this.hoy;
  }

  verHoy(): void {
    this.ponerHoy();
    this.consultar();
  }

  /** Del primer día del mes hasta hoy. */
  ponerMesActual(): void {
    this.hoy = this.hoyLocal();
    this.desde = this.hoy.substring(0, 8) + '01';
    this.hasta = this.hoy;
  }

  verMesActual(): void {
    this.ponerMesActual();
    this.consultar();
  }

  cambiarRango(): void {
    if (!this.desde || !this.hasta) return;

    // Si se cruzan, se corre la otra punta en lugar de mostrar un error.
    if (this.desde > this.hasta) {
      this.hasta = this.desde;
    }

    this.consultar();
  }

  consultar(): void {
    this.cargando = true;
    this.error = '';

    this.tareasXSprintsService.obtenerActividadesEstudiante(this.idEstudiante, this.desde, this.hasta).subscribe({
      next: (response: any) => {
        this.actividades = (response.body?.actividades as ActividadEstudiante[]) || [];
        this.total = this.actividades.length;
        this.aplicarBusqueda();
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar las actividades del estudiante:', error);
        this.actividades = [];
        this.dias = [];
        this.total = 0;
        this.totalVisibles = 0;
        this.error = error?.error?.error || 'No se pudieron cargar las actividades. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda = valor;
    this.aplicarBusqueda();
  }

  limpiarBusqueda(): void {
    this.cambiarBusqueda('');
  }

  /**
   * Busca en todo lo que se ve de la actividad: título, descripción (sin
   * las etiquetas HTML), área, tipo, docente, grupo, observaciones y
   * calificaciones. Sin tildes ni mayúsculas, para que "musica" encuentre
   * "Música". Si hay varias palabras, tienen que estar todas.
   */
  private aplicarBusqueda(): void {
    const palabras = this.normalizar(this.busqueda).split(/\s+/).filter(p => p !== '');

    const visibles = palabras.length === 0
      ? this.actividades
      : this.actividades.filter(a => {
          const texto = this.textoBuscable(a);
          return palabras.every(p => texto.includes(p));
        });

    this.totalVisibles = visibles.length;
    this.dias = this.agruparPorDia(visibles);
    this.diasAbiertos = new Set(this.dias.length > 0 ? [this.dias[0].fecha] : []);
  }

  estaAbierto(dia: DiaActividades): boolean {
    return this.diasAbiertos.has(dia.fecha);
  }

  alternarDia(dia: DiaActividades): void {
    if (this.diasAbiertos.has(dia.fecha)) {
      this.diasAbiertos.delete(dia.fecha);
    } else {
      this.diasAbiertos.add(dia.fecha);
    }
  }

  private textoBuscable(a: ActividadEstudiante): string {
    const calificaciones = (a.calificaciones || [])
      .map(c => `${c.parametro} ${this.valorCalificacion(c)}`)
      .join(' ');

    return this.normalizar([
      a.titulo,
      this.sinHtml(a.descripcion),
      a.area,
      a.tipo_actividad,
      a.docente,
      a.grupo,
      a.observacion_estudiante,
      a.observacion_grupo,
      calificaciones,
    ].join(' '));
  }

  /** Quita etiquetas y entidades (&nbsp;, &aacute;) sin pintar el HTML. */
  private sinHtml(html: string | null): string {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /** El backend las manda de la más reciente a la más antigua. */
  private agruparPorDia(actividades: ActividadEstudiante[]): DiaActividades[] {
    const dias: DiaActividades[] = [];

    for (const actividad of actividades) {
      const fecha = (actividad.fecha_ejecucion || '').substring(0, 10);
      let dia = dias.find(d => d.fecha === fecha);
      if (!dia) {
        dia = { fecha: fecha, texto: this.fechaLegible(fecha), actividades: [] };
        dias.push(dia);
      }
      dia.actividades.push(actividad);
    }

    return dias;
  }

  /** Hoy en Y-m-d con la hora del dispositivo, no en UTC. */
  private hoyLocal(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  /** "miércoles, 19 de agosto de 2026". La primera letra la sube el CSS. */
  private fechaLegible(fecha: string): string {
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  /** Se muestra el cualitativo ("Excelente" dice más que un 5). */
  valorCalificacion(c: CalificacionActividad): string {
    return c.cualitativo || (c.cuantitativo !== null ? String(c.cuantitativo) : '');
  }

  trackByParametro(index: number, c: CalificacionActividad): string {
    return c.parametro;
  }

  hora(actividad: ActividadEstudiante): string {
    return (actividad.fecha_ejecucion || '').substring(11, 16);
  }

  trackByFecha(index: number, dia: DiaActividades): string {
    return dia.fecha;
  }

  trackById(index: number, actividad: ActividadEstudiante): string {
    return actividad.id;
  }
}
