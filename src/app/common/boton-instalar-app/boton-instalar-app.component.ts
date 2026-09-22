import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { InstalarAppService, ModoInstalacion } from '../../services/instalar-app.service';

@Component({
  selector: 'app-boton-instalar-app',
  templateUrl: './boton-instalar-app.component.html',
  styleUrl: './boton-instalar-app.component.scss',
  standalone: true,
  imports: [CommonModule],
})
export class BotonInstalarAppComponent implements OnInit, OnDestroy {
  public modo: ModoInstalacion = 'oculto';
  public instalando: boolean = false;

  private suscripcion?: Subscription;

  constructor(private instalarAppService: InstalarAppService) {}

  ngOnInit(): void {
    this.suscripcion = this.instalarAppService.modo$.subscribe((modo) => {
      this.modo = modo;
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  async instalar(): Promise<void> {
    if (this.modo === 'ios') {
      this.mostrarInstruccionesIOS();
      return;
    }

    if (this.modo === 'manual') {
      this.mostrarInstruccionesAndroid();
      return;
    }

    this.instalando = true;
    try {
      const resultado = await this.instalarAppService.instalar();
      if (resultado === 'sin-aviso') {
        this.mostrarInstruccionesAndroid();
      }
    } catch (error) {
      console.error('Error al instalar la aplicación:', error);
      this.mostrarInstruccionesAndroid();
    } finally {
      this.instalando = false;
    }
  }

  private mostrarInstruccionesAndroid(): void {
    Swal.fire({
      title: 'Instalar Genialisis',
      html: this.armarPasos([
        'Toca el menú <strong>⋮</strong> del navegador (arriba a la derecha).',
        'Elige <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.',
        'Confirma y busca el ícono de Genialisis en tu pantalla de inicio.',
      ]),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  private mostrarInstruccionesIOS(): void {
    Swal.fire({
      title: 'Instalar Genialisis',
      html: this.armarPasos([
        'Abre esta página en <strong>Safari</strong>.',
        'Toca el botón <strong>Compartir</strong> (el cuadro con la flecha hacia arriba).',
        'Elige <strong>Agregar a inicio</strong> y confirma con <strong>Agregar</strong>.',
      ]),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  private armarPasos(pasos: string[]): string {
    const items = pasos
      .map((paso) => `<li style="margin-bottom: 10px;">${paso}</li>`)
      .join('');
    return `
      <ol style="text-align: left; font-size: 15px; color: #2D2D2D; line-height: 1.6; padding-left: 20px; margin: 0;">
        ${items}
      </ol>
    `;
  }
}
