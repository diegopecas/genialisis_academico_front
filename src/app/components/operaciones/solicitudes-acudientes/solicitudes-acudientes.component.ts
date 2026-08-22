import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { SolicitudesOcurrenciasService } from '../../../services/solicitudes-ocurrencias.service';
import { GruposService } from '../../../services/grupos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitudes-acudientes',
  templateUrl: './solicitudes-acudientes.component.html',
  styleUrl: './solicitudes-acudientes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class SolicitudesAcudientesComponent implements OnInit {

  titulo = "Solicitudes de los Padres";

  // La unidad que se ve es la ocurrencia, no la solicitud: un tratamiento de
  // tres dosis son tres renglones a sus horas, no uno que haya que abrir.
  public ocurrencias = [] as any[];

  public grupos = [] as any[];
  // null significa todos los grupos.
  public idGrupo: any = null;
  public busquedaEstudiante: string = '';
  public fecha: string = '';

  public cargando: boolean = false;

  // Estados de la ocurrencia (catalogo global del modulo).
  readonly ESTADO_PENDIENTE = 1;
  readonly ESTADO_CUMPLIDA = 2;
  readonly ESTADO_NO_CUMPLIDA = 3;

  constructor(
    private ocurrenciasService: SolicitudesOcurrenciasService,
    private gruposService: GruposService
  ) { }

  ngOnInit() {
    this.fecha = this.fechaDeHoy();
    this.cargarGrupos();
    this.cargarAgenda();
  }

  fechaDeHoy(): string {
    const hoy = new Date();
    const mes = ('0' + (hoy.getMonth() + 1)).slice(-2);
    const dia = ('0' + hoy.getDate()).slice(-2);
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  cargarGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = response.body || [];
      },
      error: () => {
        this.grupos = [];
      }
    });
  }

  /**
   * El backend ya devuelve solo lo que le corresponde al usuario: lo suyo
   * mas lo que no tiene responsable, que es de todos. Aqui no hay filtro por
   * responsable porque no hay nada oculto que ir a buscar.
   */
  cargarAgenda() {
    this.cargando = true;
    this.ocurrenciasService.obtenerAgenda(this.fecha).subscribe({
      next: (response: any) => {
        this.ocurrencias = response.body || [];
        this.cargando = false;
      },
      error: () => {
        this.ocurrencias = [];
        this.cargando = false;
      }
    });
  }

  cambiarFecha() {
    this.cargarAgenda();
  }

  /**
   * Las que no tienen hora van primero: son las recomendaciones del dia, que
   * se tienen presentes toda la jornada y no compiten con las horas.
   */
  get sinHora(): any[] {
    return this.filtradas().filter(o => !o.hora_programada);
  }

  get conHora(): any[] {
    return this.filtradas().filter(o => !!o.hora_programada);
  }

  filtradas(): any[] {
    let lista = this.ocurrencias;

    if (this.idGrupo) {
      const grupo = this.grupos.find(g => g.id === this.idGrupo);
      const nombre = grupo ? grupo.nombre : null;
      if (nombre) {
        lista = lista.filter(o => o.grupo_nombre === nombre);
      }
    }

    const texto = (this.busquedaEstudiante || '').trim().toLowerCase();
    if (texto !== '') {
      lista = lista.filter(o => (o.estudiante_nombre || '').toLowerCase().includes(texto));
    }

    return lista;
  }

  /**
   * Una ocurrencia se pasa de hora cuando ya paso su hora y sigue pendiente.
   * Solo se resalta si el tipo exige confirmacion: en los demas el aviso se
   * apaga solo y no hay nadie debiendo nada.
   */
  estaVencida(ocurrencia: any): boolean {
    if (ocurrencia.id_estado !== this.ESTADO_PENDIENTE) return false;
    if (!ocurrencia.hora_programada) return false;
    if (ocurrencia.requiere_confirmacion !== 1) return false;
    if (this.fecha < this.fechaDeHoy()) return true;
    if (this.fecha > this.fechaDeHoy()) return false;

    const ahora = new Date();
    const partes = ocurrencia.hora_programada.split(':');
    const programada = new Date();
    programada.setHours(parseInt(partes[0], 10), parseInt(partes[1], 10), 0, 0);

    return ahora > programada;
  }

  marcarCumplida(ocurrencia: any) {
    this.ocurrenciasService.marcarCumplida({ id: ocurrencia.id }).subscribe({
      next: () => {
        this.cargarAgenda();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo marcar', 'error');
      }
    });
  }

  /**
   * El motivo es obligatorio: es lo que despues explica por que no se dio el
   * remedio, asi que no se deja guardar vacio.
   */
  marcarNoCumplida(ocurrencia: any) {
    Swal.fire({
      title: 'No cumplida',
      input: 'text',
      inputLabel: '¿Por qué no se pudo?',
      inputPlaceholder: 'Ej: no llegó la autorización',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor) => {
        if (!valor || valor.trim() === '') {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.ocurrenciasService.marcarNoCumplida({
        id: ocurrencia.id,
        motivo_no_cumplida: resultado.value
      }).subscribe({
        next: () => {
          this.cargarAgenda();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo marcar', 'error');
        }
      });
    });
  }

  desmarcar(ocurrencia: any) {
    Swal.fire({
      title: '¿Devolver a pendiente?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.ocurrenciasService.desmarcar({ id: ocurrencia.id }).subscribe({
        next: () => {
          this.cargarAgenda();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo actualizar', 'error');
        }
      });
    });
  }

  horaCorta(hora: string): string {
    return hora ? hora.substring(0, 5) : '';
  }
}
