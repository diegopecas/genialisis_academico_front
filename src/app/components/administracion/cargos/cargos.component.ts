import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CargosService } from '../../../services/cargos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cargos',
  templateUrl: './cargos.component.html',
  styleUrl: './cargos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CargosComponent implements OnInit {

  titulo = "Gestión de Cargos";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private cargosService: CargosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerCargos();
  }

  obtenerCargos() {
    this.cargosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio cargos", body);
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/cargos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarCargo($event.registro);
        break;
    }
  }

  async eliminarCargo(cargo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el cargo ${cargo.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.cargosService.eliminar(cargo.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El cargo ha sido eliminado.',
            'success'
          );
          this.obtenerCargos();
        },
        error: (error: any) => {
          console.error("Error al eliminar cargo", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el cargo.',
            'error'
          );
        }
      });
    }
  }
}