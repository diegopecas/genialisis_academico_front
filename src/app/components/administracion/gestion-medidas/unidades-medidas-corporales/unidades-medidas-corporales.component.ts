import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { UnidadesMedidasCorporalesService } from '../../../../services/unidades-medidas-corporales.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-unidades-medidas-corporales',
  templateUrl: './unidades-medidas-corporales.component.html',
  styleUrl: './unidades-medidas-corporales.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class UnidadesMedidasCorporalesComponent implements OnInit {

  titulo = "Unidades de Medida Corporal";
  public columnasFiltro = ['Nombre', 'Abreviatura'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public puedeCrear = true;
  public puedeEditar = true;
  public puedeEliminar = true;

  constructor(
    private unidadesService: UnidadesMedidasCorporalesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'abreviatura', alias: 'Abreviatura', alinear: 'centrado' }
    ];
  }

  obtenerDatos() {
    this.unidadesService.obtenerTodos().subscribe((response: any) => {
      this.datos = response.body as any[];
    });
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/gestion-medidas/unidades/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la unidad "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.unidadesService.eliminar({ id: registro.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'La unidad ha sido eliminada.', 'success');
          this.obtenerDatos();
        },
        error: () => {
          Swal.fire('Error', 'No se pudo eliminar. Puede tener medidas asociadas.', 'error');
        }
      });
    }
  }
}