import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ElementosInventarioService } from '../../../services/elementos-inventario.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-elementos-inventario',
  templateUrl: './elementos-inventario.component.html',
  styleUrl: './elementos-inventario.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ElementosInventarioComponent implements OnInit {

  titulo = "Elementos del Inventario Diario";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private elementosInventarioService: ElementosInventarioService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.elementosInventarioService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body as any[]) || [];
      this.datos = body.map((d: any) => ({
        ...d,
        estado: d.activo == 1 ? 'Activo' : 'Inactivo'
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'icono', alias: 'Icono', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/operaciones/elementos-inventario/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el elemento "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.elementosInventarioService.eliminar(registro.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El elemento ha sido eliminado.', 'success');
          this.obtenerDatos();
        },
        error: (error: any) => {
          // El backend no deja borrar un elemento que ya tenga registros de
          // inventario, para no dejar el histórico con filas sin nombre.
          const mensaje = error?.error?.error || 'No se pudo eliminar el elemento.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
