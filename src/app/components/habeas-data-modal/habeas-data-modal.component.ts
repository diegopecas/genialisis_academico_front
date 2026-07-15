import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutorizacionesHabeasDataService } from '../../services/autorizaciones-habeas-data.service';

@Component({
  selector: 'app-habeas-data-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './habeas-data-modal.component.html',
  styleUrl: './habeas-data-modal.component.scss',
})
export class HabeasDataModalComponent implements OnInit {
  /** Token nuevo, con el pasaporte hd_ok ya firmado. */
  @Output() autorizado = new EventEmitter<string>();

  public plantilla: any = null;
  public cargando = true;
  public aceptado = false;
  public guardando = false;
  public scrollCompleto = false;
  public errorRegistro = '';

  constructor(private autorizacionesService: AutorizacionesHabeasDataService) {}

  ngOnInit(): void {
    this.cargarPlantilla();
  }

  /**
   * Este componente solo se monta cuando el backend ya confirmó que la
   * política existe y es exigible. No hay estado de error ni salida:
   * el único camino es aceptar.
   */
  cargarPlantilla(): void {
    this.cargando = true;

    this.autorizacionesService.obtenerPlantilla().subscribe({
      next: (response: any) => {
        this.plantilla = response.body?.contenido ?? null;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar plantilla:', error);
        this.cargando = false;
        this.errorRegistro = 'No se pudo cargar la política. Intenta de nuevo.';
      },
    });
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const threshold = 50;
    const position = element.scrollTop + element.clientHeight;
    const height = element.scrollHeight;

    if (position >= height - threshold) {
      this.scrollCompleto = true;
    }
  }

  aceptarPolitica(): void {
    if (!this.aceptado || !this.scrollCompleto || this.guardando) return;

    this.guardando = true;
    this.errorRegistro = '';

    this.autorizacionesService.registrar().subscribe({
      next: (respuesta) => {
        this.guardando = false;
        this.autorizado.emit(respuesta.token);
      },
      error: (error: any) => {
        this.guardando = false;
        this.errorRegistro = 'No se pudo registrar la autorización. Intenta de nuevo.';
        console.error('Error al registrar autorización:', error);
      },
    });
  }
}