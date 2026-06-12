import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { GradosService } from '../../../services/grados.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-grados',
  templateUrl: './grados.component.html',
  styleUrl: './grados.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class GradosComponent implements OnInit {

  titulo = "Gestión de Grados";
  public columnasFiltro = ['Nombre', 'Descripción'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private gradosService: GradosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerGrados();
  }

  obtenerGrados() {
    this.gradosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio grados", body);
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'orden',
        alias: 'Orden',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/grados/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarGrado($event.registro);
        break;
    }
  }

  async eliminarGrado(grado: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el grado ${grado.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.gradosService.eliminar(grado.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El grado ha sido eliminado.',
            'success'
          );
          this.obtenerGrados();
        },
        error: (error: any) => {
          console.error("Error al eliminar grado", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el grado.',
            'error'
          );
        }
      });
    }
  }
}