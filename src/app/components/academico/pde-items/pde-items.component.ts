import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { PdeItemsService } from '../../../services/pde-items.service';
import { PdeRangosEdadService } from '../../../services/pde-rangos-edad.service';
import { EsferasDesarrolloService } from '../../../services/esferas-desarrollo.service';

@Component({
  selector: 'app-pde-items',
  templateUrl: './pde-items.component.html',
  styleUrl: './pde-items.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class PdeItemsComponent implements OnInit {

  titulo = "Ítems del Perfil de Desarrollo";
  public columnasFiltro = ['Descripción', 'Esfera', 'Subárea', 'Rango'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  public rangos: any[] = [];
  public esferas: any[] = [];
  public filtroRango: string = '';
  public filtroEsfera: string = '';
  public filtroSubarea: string = '';

  private todos: any[] = [];

  constructor(
    private pdeItemsService: PdeItemsService,
    private pdeRangosEdadService: PdeRangosEdadService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarCatalogos();
    this.obtenerItems();
  }

  cargarCatalogos() {
    this.pdeRangosEdadService.obtenerTodosList().subscribe({
      next: (response: any) => { this.rangos = response.body as any[]; },
      error: (error: any) => { console.error("Error al cargar rangos", error); }
    });

    this.esferasDesarrolloService.obtenerTodos().subscribe({
      next: (response: any) => { this.esferas = response.body as any[]; },
      error: (error: any) => { console.error("Error al cargar esferas", error); }
    });
  }

  obtenerItems() {
    this.pdeItemsService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.todos = response.body as any[];
        this.aplicarFiltros();
      },
      error: (error: any) => {
        console.error("Error al obtener ítems", error);
        Swal.fire('Error', 'No se pudieron cargar los ítems', 'error');
      }
    });
  }

  aplicarFiltros() {
    this.datos = this.todos.filter(item => {
      const okRango = this.filtroRango === '' || item.id_rango_edad === this.filtroRango;
      const okEsfera = this.filtroEsfera === '' || item.id_esfera === this.filtroEsfera;
      const okSubarea = this.filtroSubarea === '' || (item.subarea || '') === this.filtroSubarea;
      return okRango && okEsfera && okSubarea;
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_rango', alias: 'Rango', alinear: 'izquierda' },
      { clave: 'nombre_esfera', alias: 'Esfera', alinear: 'izquierda' },
      { clave: 'subarea', alias: 'Subárea', alinear: 'izquierda' },
      { clave: 'numero_item', alias: 'N°', alinear: 'centrado' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'puntaje_maximo', alias: 'Puntaje máx.', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/pde-items/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarItem($event.registro);
        break;
    }
  }

  async eliminarItem(item: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el ítem "${item.descripcion}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.pdeItemsService.eliminar({ id: item.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El ítem ha sido eliminado.', 'success');
          this.obtenerItems();
        },
        error: (error: any) => {
          console.error("Error al eliminar ítem", error);
          const mensaje = error?.error?.error || 'No se pudo eliminar el ítem.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
