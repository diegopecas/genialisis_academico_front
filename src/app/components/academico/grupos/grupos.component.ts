import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { GruposService } from '../../../services/grupos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-grupos',
  templateUrl: './grupos.component.html',
  styleUrl: './grupos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class GruposComponent implements OnInit {

  titulo = "Gestión de Grupos";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private gruposService: GruposService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerGrupos();
  }

  obtenerGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio grupos", body);
      this.datos = body.map((grupo: any) => {
        // Retornar objeto sin el campo 'color' para evitar que pinte la fila
        return {
          id: grupo.id,
          nombre: grupo.nombre,
          icono: grupo.icono,
          calificable: grupo.calificable,
          orden: grupo.orden
        };
      });
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
      {
        clave: 'calificable',
        alias: 'Calificable',
        alinear: 'centrado',
        tipo: 'booleano',
      },
      {
        clave: 'orden',
        alias: 'Orden',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/grupos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarGrupo($event.registro);
        break;
    }
  }

  async eliminarGrupo(grupo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el grupo ${grupo.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.gruposService.eliminar({ id: grupo.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El grupo ha sido eliminado.',
            'success'
          );
          this.obtenerGrupos();
        },
        error: (error: any) => {
          console.error("Error al eliminar grupo", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el grupo.',
            'error'
          );
        }
      });
    }
  }
}