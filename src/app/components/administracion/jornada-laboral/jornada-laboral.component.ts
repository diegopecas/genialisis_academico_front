import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { JornadaLaboralService } from '../../../services/jornada-laboral.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-jornada-laboral',
  templateUrl: './jornada-laboral.component.html',
  styleUrl: './jornada-laboral.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class JornadaLaboralComponent implements OnInit {

  titulo = "Jornada Laboral";

  // Siempre son los siete dias. Los que el jardin nunca ha configurado
  // llegan con las horas de respaldo y configurado en 0.
  public dias = [] as any[];

  public cargando: boolean = false;
  public guardando: boolean = false;

  // Bloques de 15 minutos de toda la jornada posible. Se usa un select y no
  // un input de hora porque el del navegador muestra formato militar.
  public opcionesHora = [] as { valor: string, etiqueta: string }[];

  constructor(private jornadaService: JornadaLaboralService) { }

  ngOnInit() {
    this.armarOpcionesHora();
    this.cargar();
  }

  armarOpcionesHora() {
    this.opcionesHora = [];

    for (let m = 0; m < 24 * 60; m += 15) {
      const valor = ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
      this.opcionesHora.push({ valor: valor, etiqueta: this.formatoHora12(valor) });
    }
  }

  cargar() {
    this.cargando = true;
    this.jornadaService.obtenerTodos().subscribe({
      next: (response: any) => {
        const filas = (response.body as any[]) || [];

        // Las horas llegan como HH:MM:SS y el select maneja HH:MM.
        this.dias = filas.map(fila => ({
          ...fila,
          hora_entrada: this.horaCorta(fila.hora_entrada),
          hora_salida: this.horaCorta(fila.hora_salida),
          atiende: Number(fila.atiende)
        }));

        this.cargando = false;
      },
      error: () => {
        this.dias = [];
        this.cargando = false;
      }
    });
  }

  guardar(dia: any) {
    if (dia.atiende === 1 && dia.hora_salida <= dia.hora_entrada) {
      Swal.fire('Horario inválido', 'La hora de salida debe ser posterior a la de entrada', 'warning');
      return;
    }

    this.guardando = true;

    this.jornadaService.actualizar({
      id: dia.id,
      id_dia_semana: dia.id_dia_semana,
      hora_entrada: dia.hora_entrada,
      hora_salida: dia.hora_salida,
      atiende: dia.atiende
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.cargar();
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar', 'error');
      }
    });
  }

  /**
   * Guarda los siete de corrido. Es lo normal: el jardin ajusta su semana
   * completa de una sola vez.
   */
  guardarTodos() {
    const invalido = this.dias.find(d => d.atiende === 1 && d.hora_salida <= d.hora_entrada);

    if (invalido) {
      Swal.fire('Horario inválido', `En ${invalido.dia_nombre} la hora de salida debe ser posterior a la de entrada`, 'warning');
      return;
    }

    this.guardando = true;
    let pendientes = this.dias.length;
    let huboError = false;

    this.dias.forEach(dia => {
      this.jornadaService.actualizar({
        id: dia.id,
        id_dia_semana: dia.id_dia_semana,
        hora_entrada: dia.hora_entrada,
        hora_salida: dia.hora_salida,
        atiende: dia.atiende
      }).subscribe({
        next: () => {
          pendientes--;
          if (pendientes === 0) this.terminarGuardado(huboError);
        },
        error: () => {
          huboError = true;
          pendientes--;
          if (pendientes === 0) this.terminarGuardado(huboError);
        }
      });
    });
  }

  private terminarGuardado(huboError: boolean) {
    this.guardando = false;

    if (huboError) {
      Swal.fire('Error', 'Algunos días no se pudieron guardar', 'error');
    } else {
      Swal.fire('Guardado', 'La jornada quedó actualizada', 'success');
    }

    this.cargar();
  }

  cambioAtiende(dia: any) {
    dia.atiende = dia.atiende === 1 ? 0 : 1;
  }

  horaCorta(hora: string): string {
    return hora ? hora.substring(0, 5) : '';
  }

  formatoHora12(hora: string): string {
    if (!hora) return '';

    const partes = hora.substring(0, 5).split(':');
    const h = parseInt(partes[0], 10);
    const meridiano = h < 12 ? 'a. m.' : 'p. m.';
    let h12 = h % 12;

    if (h12 === 0) {
      h12 = 12;
    }

    return `${h12}:${partes[1]} ${meridiano}`;
  }
}
