import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CalificacionContextService {

  private horariosGrupo: any[] = [];
  private idGrupoActual: string = '';

  setHorariosGrupo(idGrupo: string, horarios: any[]): void {
    this.idGrupoActual = idGrupo;
    this.horariosGrupo = horarios;
  }

  getHorariosGrupo(idGrupo: string): any[] {
    if (this.idGrupoActual === idGrupo) {
      return this.horariosGrupo;
    }
    return [];
  }

  getHorariosAreaDia(idGrupo: string, idArea: string, idDiaSemana: number): any[] {
    return this.getHorariosGrupo(idGrupo)
      .filter((h: any) => h.id_area_academica == idArea && h.id_dia_semana == idDiaSemana)
      .sort((a: any, b: any) => {
        const mA = this.horaAMinutos(a.hora_inicial);
        const mB = this.horaAMinutos(b.hora_inicial);
        return mA - mB;
      });
  }

  getBloqueActual(idGrupo: string, idArea: string): any | null {
    const jsDay = new Date().getDay();
    const diaSemana = jsDay === 0 ? 7 : jsDay;
    const bloques = this.getHorariosAreaDia(idGrupo, idArea, diaSemana);
    if (bloques.length === 0) return null;

    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    // Buscar bloque que contenga la hora actual
    const bloqueActual = bloques.find((b: any) => {
      const ini = this.horaAMinutos(b.hora_inicial);
      const fin = this.horaAMinutos(b.hora_final);
      return minutosAhora >= ini && minutosAhora < fin;
    });
    if (bloqueActual) return bloqueActual;

    // Si no hay bloque actual, buscar el más cercano (futuro o pasado más reciente)
    let masCercano = bloques[0];
    let menorDiferencia = Infinity;
    for (const b of bloques) {
      const ini = this.horaAMinutos(b.hora_inicial);
      const diff = Math.abs(minutosAhora - ini);
      if (diff < menorDiferencia) {
        menorDiferencia = diff;
        masCercano = b;
      }
    }
    return masCercano;
  }

  private horaAMinutos(hora: string): number {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
  }
}