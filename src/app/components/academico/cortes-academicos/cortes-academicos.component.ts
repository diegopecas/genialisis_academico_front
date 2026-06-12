import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CortesAcademicosService } from '../../../services/cortes-academicos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cortes-academicos',
  templateUrl: './cortes-academicos.component.html',
  styleUrl: './cortes-academicos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CortesAcademicosComponent implements OnInit {

  titulo = "Gestión de Cortes Académicos";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private cortesAcademicosService: CortesAcademicosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerCortesAcademicos();
  }

  obtenerCortesAcademicos() {
    this.cortesAcademicosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio cortes académicos", body);
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
        clave: 'fecha_inicio',
        alias: 'Fecha Inicio',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_fin',
        alias: 'Fecha Fin',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/cortes-academicos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarCorteAcademico($event.registro);
        break;
    }
  }

  async eliminarCorteAcademico(corte: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el corte académico ${corte.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.cortesAcademicosService.eliminar({ id: corte.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El corte académico ha sido eliminado.',
            'success'
          );
          this.obtenerCortesAcademicos();
        },
        error: (error: any) => {
          console.error("Error al eliminar corte académico", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el corte académico.',
            'error'
          );
        }
      });
    }
  }
}