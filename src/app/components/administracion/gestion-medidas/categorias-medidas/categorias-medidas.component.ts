import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { CategoriasMedidasService } from '../../../../services/categorias-medidas.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categorias-medidas',
  templateUrl: './categorias-medidas.component.html',
  styleUrl: './categorias-medidas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CategoriasMedidasComponent implements OnInit {

  titulo = "Categorías de Medidas";
  public columnasFiltro = ['Nombre', 'Descripción'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public puedeCrear = true;
  public puedeEditar = true;
  public puedeEliminar = true;

  constructor(
    private categoriasMedidasService: CategoriasMedidasService,
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
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'icono', alias: 'Icono', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' }
    ];
  }

  obtenerDatos() {
    this.categoriasMedidasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((c: any) => ({
        ...c,
        estado: c.activo == 1 ? 'Activo' : 'Inactivo',
        color: c.activo == 0 ? '#e2e9f3' : ''
      }));
    });
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/gestion-medidas/categorias/editar/' + $event.registro.id]);
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
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.categoriasMedidasService.eliminar({ id: registro.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'La categoría ha sido eliminada.', 'success');
          this.obtenerDatos();
        },
        error: (error: any) => {
          Swal.fire('Error', 'No se pudo eliminar. Puede tener medidas asociadas.', 'error');
        }
      });
    }
  }
}