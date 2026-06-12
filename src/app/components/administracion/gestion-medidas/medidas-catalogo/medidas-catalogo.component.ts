import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { MedidasService } from '../../../../services/medidas.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-medidas-catalogo',
  templateUrl: './medidas-catalogo.component.html',
  styleUrl: './medidas-catalogo.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class MedidasCatalogoComponent implements OnInit {

  titulo = "Catálogo de Medidas";
  public columnasFiltro = ['Nombre', 'Categoría', 'Unidad', 'Tipo'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public puedeCrear = true;
  public puedeEditar = true;
  public puedeEliminar = true;

  constructor(
    private medidasService: MedidasService,
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
      { clave: 'categoria_nombre', alias: 'Categoría', alinear: 'izquierda' },
      { clave: 'unidad_nombre', alias: 'Unidad', alinear: 'centrado' },
      { clave: 'tipo_valor', alias: 'Tipo', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' }
    ];
  }

  obtenerDatos() {
    this.medidasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((m: any) => ({
        ...m,
        categoria_nombre: m.categoria_nombre || 'Sin categoría',
        unidad_nombre: m.unidad_abreviatura ? `${m.unidad_nombre} (${m.unidad_abreviatura})` : 'Sin unidad',
        tipo_valor: m.tipo_valor || 'numerico'
      }));
    });
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/gestion-medidas/medidas/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la medida "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.medidasService.eliminar({ id: registro.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'La medida ha sido eliminada.', 'success');
          this.obtenerDatos();
        },
        error: () => {
          Swal.fire('Error', 'No se pudo eliminar. Puede tener registros de estudiantes asociados.', 'error');
        }
      });
    }
  }
}