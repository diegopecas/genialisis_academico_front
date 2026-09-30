import { Injectable } from '@angular/core';
import { GaleriaModoConfig, MODOS_CATALOGO } from '../components/operaciones/galeria-consulta/galeria-modos.types';

/**
 * Decide qué modo se muestra hoy.
 * - Shuffle determinístico por año: el orden de los 30 modos cambia cada año pero es consistente
 *   dentro del mismo año (todos los papás ven el mismo modo el mismo día).
 * - El día del año determina el índice dentro del shuffle.
 */
@Injectable({ providedIn: 'root' })
export class GaleriaModosService {

  /**
   * Devuelve el modo que corresponde a la fecha indicada (por defecto, hoy).
   */
  obtenerModoDelDia(fecha: Date = new Date()): GaleriaModoConfig {
    const anio = fecha.getFullYear();
    const dayOfYear = this.calcularDayOfYear(fecha);
    const ordenAnual = this.shuffleDeterministico(MODOS_CATALOGO, anio);
    const indice = (dayOfYear - 1) % ordenAnual.length;
    return ordenAnual[indice];
  }

  /**
   * Día del año (1-366). Enero 1 = 1.
   */
  private calcularDayOfYear(fecha: Date): number {
    const inicioAnio = new Date(fecha.getFullYear(), 0, 0);
    const diff = fecha.getTime() - inicioAnio.getTime();
    const unDia = 1000 * 60 * 60 * 24;
    return Math.floor(diff / unDia);
  }

  /**
   * Fisher-Yates shuffle con semilla. La semilla es el año, así el orden
   * es consistente todo el año pero rota cada año nuevo.
   */
  private shuffleDeterministico<T>(array: T[], semilla: number): T[] {
    const copia = [...array];
    let estado = semilla;

    // PRNG simple basado en LCG (Linear Congruential Generator)
    const rand = () => {
      estado = (estado * 1103515245 + 12345) & 0x7fffffff;
      return estado / 0x7fffffff;
    };

    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    return copia;
  }
}
