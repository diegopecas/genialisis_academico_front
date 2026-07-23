import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EntesControlService } from '../../../services/entes-control.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-entes-control',
  templateUrl: './entes-control.component.html',
  styleUrl: './entes-control.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class EntesControlComponent implements OnInit {

  titulo = "Gestión de Entes de Control";
  public columnasFiltro = ['Ente de Control', 'Identificación'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private entesControlService: EntesControlService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerEntesControl();
  }

  obtenerEntesControl() {
    this.entesControlService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre_ente',
        alias: 'Ente de Control',
        alinear: 'izquierda',
      },
      {
        clave: 'numero_identificacion',
        alias: 'Identificación',
        alinear: 'centrado',
      },
      {
        clave: 'correo_electronico',
        alias: 'Correo',
        alinear: 'izquierda',
      },
      {
        clave: 'telefono',
        alias: 'Teléfono',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/entes-control/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarEnteControl($event.registro);
        break;
    }
  }

  async eliminarEnteControl(ente: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el ente de control ${ente.nombre_ente}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.entesControlService.eliminar(ente.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El ente de control ha sido eliminado.',
            'success'
          );
          this.obtenerEntesControl();
        },
        error: (error: any) => {
          console.error("Error al eliminar ente de control", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el ente de control.',
            'error'
          );
        }
      });
    }
  }
}