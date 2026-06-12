import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AreasFisicasService } from '../../../services/areas-fisicas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-areas-fisicas',
  templateUrl: './areas-fisicas.component.html',
  styleUrl: './areas-fisicas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class AreasFisicasComponent implements OnInit {

  titulo = "Gestión de Áreas Físicas";
  public columnasFiltro = ['Nombre', 'Ubicación', 'Capacidad'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private areasFisicasService: AreasFisicasService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerAreasFisicas();
  }

  obtenerAreasFisicas() {
    this.areasFisicasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("áreas físicas", body);
      this.datos = body;
      this.datos.forEach((e: any) => {
        e.estado_texto = e.activo ? 'Activo' : 'Inactivo';
        e.mobiliario_texto = e.total_mobiliario > 0 
          ? `${e.total_mobiliario} tipos (${e.total_unidades || 0} unidades)` 
          : 'Sin mobiliario';
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
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
      {
        clave: 'ubicacion',
        alias: 'Ubicación',
        alinear: 'izquierda',
      },
      {
        clave: 'capacidad',
        alias: 'Capacidad',
        alinear: 'centrado',
      },
      {
        clave: 'mobiliario_texto',
        alias: 'Mobiliario',
        alinear: 'centrado',
      },
      {
        clave: 'estado_texto',
        alias: 'Estado',
        alinear: 'centrado',
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/areas-fisicas/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarAreaFisica($event.registro);
        break;
    }
  }

  async eliminarAreaFisica(area: any) {
    // Verificar si tiene mobiliario
    if (area.total_mobiliario > 0) {
      Swal.fire(
        'No se puede eliminar',
        `El área "${area.nombre}" tiene mobiliario asignado. Debe eliminar primero las asignaciones.`,
        'warning'
      );
      return;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el área física "${area.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.areasFisicasService.eliminar(area.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El área física ha sido eliminada.', 'success');
          this.obtenerAreasFisicas();
        },
        error: (error: any) => {
          console.error("Error al eliminar área física", error);
          const mensaje = error.error?.error || 'No se pudo eliminar el área física.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}