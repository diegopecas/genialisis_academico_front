import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { HeaderComponent } from '../../../../common/header/header.component';
import { PdeAplicacionesService } from '../../../../services/pde-aplicaciones.service';
import { PdeAplicacionesEsferasService } from '../../../../services/pde-aplicaciones-esferas.service';

@Component({
  selector: 'app-historial-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './historial-perfil.component.html',
  styleUrl: './historial-perfil.component.scss'
})
export class HistorialPerfilComponent implements OnInit, OnDestroy {

  titulo = 'Historial - Perfil de Desarrollo';

  public idEstudiante = '';
  public nombreEstudiante = '';
  public aplicaciones: any[] = [];
  public esferasPorAplicacion: { [idAplicacion: string]: any[] } = {};
  public expandida: string = '';
  public cargando = true;

  private subscriptions: Subscription[] = [];

  constructor(
    private pdeAplicacionesService: PdeAplicacionesService,
    private pdeAplicacionesEsferasService: PdeAplicacionesEsferasService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.idEstudiante = this.route.snapshot.params['idEstudiante'];
    this.cargarAplicaciones();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  cargarAplicaciones(): void {
    this.cargando = true;
    const sub = this.pdeAplicacionesService.obtenerByEstudiante(this.idEstudiante).subscribe({
      next: (res: any) => {
        this.aplicaciones = res.body as any[];
        if (this.aplicaciones.length > 0) {
          this.nombreEstudiante = this.aplicaciones[0].nombre_estudiante;
        }
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el historial', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  toggleDetalle(aplicacion: any): void {
    if (this.expandida === aplicacion.id) {
      this.expandida = '';
      return;
    }

    this.expandida = aplicacion.id;

    if (this.esferasPorAplicacion[aplicacion.id]) { return; }

    const sub = this.pdeAplicacionesEsferasService.obtenerByAplicacion(aplicacion.id).subscribe({
      next: (res: any) => {
        this.esferasPorAplicacion[aplicacion.id] = res.body as any[];
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el detalle por esferas', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  continuar(aplicacion: any): void {
    this.router.navigate(['/operaciones/perfil-desarrollo/aplicar', this.idEstudiante], {
      queryParams: { retomar: aplicacion.id }
    });
  }

  async anular(aplicacion: any): Promise<void> {
    const resultado = await Swal.fire({
      title: '¿Anular la aplicación?',
      text: `Se anulará la aplicación del ${aplicacion.fecha_aplicacion}. No se borra, queda inactiva.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    });

    if (!resultado.isConfirmed) { return; }

    const sub = this.pdeAplicacionesService.anular(aplicacion.id).subscribe({
      next: () => {
        Swal.fire('Anulada', 'La aplicación fue anulada.', 'success');
        this.cargarAplicaciones();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo anular la aplicación', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  volver(): void {
    this.router.navigate(['/operaciones/perfil-desarrollo']);
  }

  etiquetaEstado(estado: string): string {
    return { 'iniciada': 'Iniciada', 'en_proceso': 'En proceso', 'finalizada': 'Finalizada' }[estado] || estado;
  }

  claseEstado(estado: string): string {
    return { 'iniciada': 'bg-info', 'en_proceso': 'bg-warning text-dark', 'finalizada': 'bg-success' }[estado] || 'bg-secondary';
  }

  claseIndice(indice: any): string {
    if (indice === null || indice === undefined) { return 'idx-neutro'; }
    const valor = Number(indice);
    if (valor >= 95) { return 'idx-verde'; }
    if (valor >= 80) { return 'idx-amarillo'; }
    return 'idx-rojo';
  }

  redondear(valor: any): string {
    if (valor === null || valor === undefined || valor === '') { return '-'; }
    return `${Math.round(Number(valor))}`;
  }
}
