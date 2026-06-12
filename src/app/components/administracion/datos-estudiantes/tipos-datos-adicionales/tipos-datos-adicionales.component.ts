import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { TiposDatosAdicionalesService } from '../../../../services/tipos-datos-adicionales.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tipos-datos-adicionales',
  templateUrl: './tipos-datos-adicionales.component.html',
  styleUrl: './tipos-datos-adicionales.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposDatosAdicionalesComponent implements OnInit {

  titulo = "Categorías de Datos Adicionales";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposDatosAdicionalesService: TiposDatosAdicionalesService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.tiposDatosAdicionalesService.obtenerTodos().subscribe((response: any) => {
      this.datos = response.body as any[];
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'icono', alias: 'Icono', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-estudiantes/tipos-datos-adicionales/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la categoría "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposDatosAdicionalesService.eliminar(registro.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'La categoría ha sido eliminada.', 'success');
          this.obtenerDatos();
        },
        error: () => {
          Swal.fire('Error', 'No se pudo eliminar. Puede tener datos adicionales asociados.', 'error');
        }
      });
    }
  }
}