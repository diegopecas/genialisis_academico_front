import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { HorariosService } from '../../../services/horarios.service';
import { DiasSemanaService } from '../../../services/dias-semana.service';
import { GruposService } from '../../../services/grupos.service';
import { CalificacionContextService } from '../../../services/calificacion-context.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-selector-areas',
  templateUrl: './selector-areas.component.html',
  styleUrl: './selector-areas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent]
})
export class SelectorAreasComponent implements OnInit {

  public titulo = "Registro de calificaciones";
  public grupo: any = null;
  public areasAcademicas: any[] = [];
  public areaDestacada: any = null;
  public areasHoyResto: any[] = [];
  public areasFueraDia: any[] = [];
  public horariosGrupo: any[] = [];
  public verTodas: boolean = false;
  public diaActual: number = 0;
  public nombreDia: string = '';

  // Modal horario
  public mostrarModalHorario: boolean = false;
  public diasSemana: any[] = [];
  public horasDelDia: string[] = [];
  public indiceDiaMovil: number = 0;
  public diasConHorario: any[] = [];

  private idGrupo: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private areasAcademicasService: AreasAcademicasService,
    private horariosService: HorariosService,
    private diasSemanaService: DiasSemanaService,
    private gruposService: GruposService,
    private calificacionContext: CalificacionContextService
  ) {}

  ngOnInit(): void {
    this.diaActual = this.obtenerDiaSemanaDB();
    this.nombreDia = this.obtenerNombreDia(this.diaActual);

    this.route.params.subscribe(params => {
      this.idGrupo = +params['idGrupo'];
      this.cargarDatos();
    });

    this.cargarDiasSemana();
  }

  private cargarDatos(): void {
    forkJoin({
      grupo: this.gruposService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerAreasAcademicasGrupo(this.idGrupo),
      horarios: this.horariosService.obtenerByGrupo(this.idGrupo)
    }).subscribe(({ grupo, areas, horarios }: any) => {
      const grupos = grupo.body || [];
      this.grupo = grupos.find((g: any) => g.id == this.idGrupo) || null;

      this.areasAcademicas = areas.body || [];
      this.horariosGrupo = horarios.body || [];

      // Guardar horarios en el context para compartir con otros componentes
      this.calificacionContext.setHorariosGrupo(this.idGrupo, this.horariosGrupo);

      this.clasificarAreas();
      this.calcularHorasDelDia();
    });
  }

  private cargarDiasSemana(): void {
    this.diasSemanaService.obtenerTodos().subscribe((response: any) => {
      this.diasSemana = response.body || [];
    });
  }

  private clasificarAreas(): void {
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    // Horarios del día actual
    const horariosHoy = this.horariosGrupo.filter((h: any) => h.id_dia_semana == this.diaActual);
    const idsAreasHoy = [...new Set(horariosHoy.map((h: any) => h.id_area_academica))];

    // Áreas del día con su bloque más cercano
    const areasHoyConDistancia: any[] = [];
    for (const idArea of idsAreasHoy) {
      const area = this.areasAcademicas.find((a: any) => a.id_area_academica == idArea);
      if (!area) continue;

      const bloquesArea = horariosHoy.filter((h: any) => h.id_area_academica == idArea);
      let menorDistancia = Infinity;
      let bloqueMasCercano: any = null;

      for (const bloque of bloquesArea) {
        const ini = this.horaAMinutos(bloque.hora_inicial);
        const fin = this.horaAMinutos(bloque.hora_final);

        if (minutosAhora >= ini && minutosAhora < fin) {
          menorDistancia = 0;
          bloqueMasCercano = bloque;
          break;
        }

        const distancia = Math.min(Math.abs(minutosAhora - ini), Math.abs(minutosAhora - fin));
        if (distancia < menorDistancia) {
          menorDistancia = distancia;
          bloqueMasCercano = bloque;
        }
      }

      areasHoyConDistancia.push({
        ...area,
        distancia: menorDistancia,
        bloqueCercano: bloqueMasCercano,
        horarioTexto: bloqueMasCercano
          ? bloqueMasCercano.hora_inicial.substring(0, 5) + ' - ' + bloqueMasCercano.hora_final.substring(0, 5)
          : ''
      });
    }

    // Ordenar por distancia
    areasHoyConDistancia.sort((a: any, b: any) => a.distancia - b.distancia);

    if (areasHoyConDistancia.length > 0) {
      const distanciaMinima = areasHoyConDistancia[0].distancia;

      // Todas las áreas con la misma distancia mínima son "destacadas"
      const destacadas = areasHoyConDistancia.filter((a: any) => a.distancia === distanciaMinima);

      this.areaDestacada = destacadas[0];
      this.areasHoyResto = areasHoyConDistancia.slice(1);
    } else {
      this.areaDestacada = null;
      this.areasHoyResto = [];
    }

    // Áreas fuera del día
    this.areasFueraDia = this.areasAcademicas.filter(
      (a: any) => !idsAreasHoy.includes(a.id_area_academica)
    );
  }

  obtenerHorarioTextoArea(area: any): string {
    if (area.horarioTexto) return area.horarioTexto;

    const bloques = this.horariosGrupo.filter(
      (h: any) => h.id_area_academica == area.id_area_academica && h.id_dia_semana == this.diaActual
    );
    if (bloques.length === 0) return '';
    bloques.sort((a: any, b: any) => this.horaAMinutos(a.hora_inicial) - this.horaAMinutos(b.hora_inicial));
    return bloques[0].hora_inicial.substring(0, 5) + ' - ' + bloques[0].hora_final.substring(0, 5);
  }

  private horaAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }

  private obtenerDiaSemanaDB(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  private obtenerNombreDia(dia: number): string {
    const dias: { [key: number]: string } = {
      1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
      5: 'Viernes', 6: 'Sábado', 7: 'Domingo'
    };
    return dias[dia] || '';
  }

  toggleVerTodas(): void {
    this.verTodas = !this.verTodas;
  }

  seleccionarArea(area: any): void {
    this.router.navigate(['/calificacion/grupo', this.idGrupo, 'area', area.id_area_academica]);
  }

  irAGini(): void {
    this.router.navigate(['/clases-ia/gini-ingles', this.idGrupo], {
      queryParams: { grupo: this.grupo?.nombre }
    });
  }

  // ========== Modal de horario (solo lectura) ==========

  abrirModalHorarioVista(): void {
    this.calcularDiasConHorario();
    this.mostrarModalHorario = true;
  }

  cerrarModalHorarioVista(): void {
    this.mostrarModalHorario = false;
  }

  calcularHorasDelDia(): void {
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
      horas.push(`${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    this.horasDelDia = horas;
  }

  getHorarioInfo(idDia: any, hora: string): any | null {
    const [horaNum, minutosNum] = hora.split(':').map(Number);
    const minutosHoraActual = horaNum * 60 + minutosNum;

    const horario = this.horariosGrupo.find(h => {
      if (h.id_dia_semana != idDia) return false;
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
        esInicio,
        esFin: esUltimaCelda,
        duracionCompleta: `${horaInicioFormato} - ${horaFinFormato}`,
        esIntermedio: !esInicio && !esUltimaCelda
      };
    }

    return null;
  }

  obtenerColorArea(id_area: number): string {
    const area = this.areasAcademicas.find(a => a.id_area_academica === id_area);
    return area?.color || '#FFFFFF';
  }

  obtenerNombreArea(id_area: number): string {
    const area = this.areasAcademicas.find(a => a.id_area_academica === id_area);
    return area?.nombre_area_academica || '';
  }

  getClaseHorario(idDia: any, hora: string): string {
    return this.getHorarioInfo(idDia, hora) ? 'tiene-horario' : 'sin-horario';
  }

  esDiaActual(idDia: number): boolean {
    return idDia === this.diaActual;
  }

  // ========== Vista móvil ==========

  calcularDiasConHorario(): void {
    const idsUnicos = [...new Set(this.horariosGrupo.map((h: any) => h.id_dia_semana))];
    this.diasConHorario = this.diasSemana
      .filter(d => idsUnicos.includes(d.id))
      .sort((a: any, b: any) => a.id - b.id);

    const idxHoy = this.diasConHorario.findIndex(d => d.id === this.diaActual);
    this.indiceDiaMovil = idxHoy >= 0 ? idxHoy : 0;
  }

  obtenerHorariosDia(idDia: number): any[] {
    return this.horariosGrupo
      .filter((h: any) => h.id_dia_semana == idDia)
      .sort((a: any, b: any) => this.horaAMinutos(a.hora_inicial) - this.horaAMinutos(b.hora_inicial));
  }

  diaMovilAnterior(): void {
    if (this.indiceDiaMovil > 0) this.indiceDiaMovil--;
  }

  diaMovilSiguiente(): void {
    if (this.indiceDiaMovil < this.diasConHorario.length - 1) this.indiceDiaMovil++;
  }
}