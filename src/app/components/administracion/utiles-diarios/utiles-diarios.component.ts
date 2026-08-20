import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { UtilesDiariosService } from '../../../services/utiles-diarios.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-utiles-diarios',
  templateUrl: './utiles-diarios.component.html',
  styleUrl: './utiles-diarios.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class UtilesDiariosComponent implements OnInit {

  titulo = "Útiles y Accesorios Diarios";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private utilesDiariosService: UtilesDiariosService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.utilesDiariosService.obtenerTodos().subscribe((response: any) => {
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
        this.router.navigate(['administracion/operaciones/utiles-diarios/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el útil "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.utilesDiariosService.eliminar(registro.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El útil ha sido eliminado.', 'success');
          this.obtenerDatos();
        },
        error: (error: any) => {
          // El backend no deja borrar un útil que ya tenga registros de
          // registros, para no dejar el histórico con filas sin nombre.
          const mensaje = error?.error?.error || 'No se pudo eliminar el útil.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
