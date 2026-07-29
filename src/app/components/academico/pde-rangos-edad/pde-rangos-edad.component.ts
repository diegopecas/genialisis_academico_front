import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { PdeRangosEdadService } from '../../../services/pde-rangos-edad.service';

@Component({
  selector: 'app-pde-rangos-edad',
  templateUrl: './pde-rangos-edad.component.html',
  styleUrl: './pde-rangos-edad.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class PdeRangosEdadComponent implements OnInit {

  titulo = "Rangos de Edad - Perfil de Desarrollo";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private pdeRangosEdadService: PdeRangosEdadService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerRangos();
  }

  obtenerRangos() {
    this.pdeRangosEdadService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.datos = response.body as any[];
      },
      error: (error: any) => {
        console.error("Error al obtener rangos de edad", error);
        Swal.fire('Error', 'No se pudieron cargar los rangos de edad', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'edad_meses_inicio', alias: 'Desde (meses)', alinear: 'centrado' },
      { clave: 'edad_meses_fin', alias: 'Hasta (meses)', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/pde-rangos-edad/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarRango($event.registro);
        break;
    }
  }

  async eliminarRango(rango: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el rango ${rango.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.pdeRangosEdadService.eliminar({ id: rango.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El rango ha sido eliminado.', 'success');
          this.obtenerRangos();
        },
        error: (error: any) => {
          console.error("Error al eliminar rango", error);
          const mensaje = error?.error?.error || 'No se pudo eliminar el rango.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
