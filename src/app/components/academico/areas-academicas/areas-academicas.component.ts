import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-areas-academicas',
  templateUrl: './areas-academicas.component.html',
  styleUrl: './areas-academicas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class AreasAcademicasComponent implements OnInit {

  titulo = "Gestión de Áreas Académicas";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private areasAcademicasService: AreasAcademicasService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerAreasAcademicas();
  }

  obtenerAreasAcademicas() {
    this.areasAcademicasService.obtenerTodosList().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio areas academicas", body);
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
      {
        clave: 'icono',
        alias: 'Icono',
        alinear: 'centrado',
        tipo: 'imagen',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/areas-academicas/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarAreaAcademica($event.registro);
        break;
    }
  }

  async eliminarAreaAcademica(area: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el área académica ${area.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.areasAcademicasService.eliminar({ id: area.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El área académica ha sido eliminada.',
            'success'
          );
          this.obtenerAreasAcademicas();
        },
        error: (error: any) => {
          console.error("Error al eliminar área académica", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el área académica.',
            'error'
          );
        }
      });
    }
  }
}