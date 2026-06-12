import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { ItemsMenuService } from '../../../../services/items-menu.service';

@Component({
  selector: 'app-items-menu',
  templateUrl: './items-menu.component.html',
  styleUrls: ['./items-menu.component.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ItemsMenuComponent implements OnInit {

  titulo = "Ítems de Menú";
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private itemsMenuService: ItemsMenuService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerItems();
  }

  obtenerItems() {
    this.itemsMenuService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];

      this.datos = body.map((item: any) => {
        // Color según si es opcional
        item.color = item.es_opcional ? "#fff3cd" : "#d4edda";

        // Badge para opcional
        item.opcional_badge = item.es_opcional ?
          '<span class="badge bg-warning">Sí</span>' :
          '<span class="badge bg-success">No</span>';

        // Mostrar ingredientes
        if (item.ingredientes_nombres) {
          // Truncar si son muchos ingredientes
          let ingredientes = item.ingredientes_nombres;
          if (ingredientes.length > 50) {
            ingredientes = ingredientes.substring(0, 50) + '...';
          }
          item.ingredientes_display = `<small class="text-muted">${ingredientes}</small>`;
        } else {
          item.ingredientes_display = '<small class="text-muted">Sin ingredientes</small>';
        }

        return item;
      });

      console.log("Items de menú:", this.datos);
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
        alias: 'Nombre del Ítem',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_porcion',
        alias: 'Porción',
        alinear: 'centrado',
      },
      {
        clave: 'ingredientes_display',
        alias: 'Ingredientes',
        alinear: 'izquierda',
        tipo: 'html'
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    const item = $event.registro;

    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['administracion/items-menu/consultar/' + item.id]);
        break;
      case 'editar':
        this.router.navigate(['administracion/items-menu/editar/' + item.id]);
        break;
      case 'eliminar':
        this.eliminarItem(item);
        break;
    }
  }

  async eliminarItem(item: any) {
    const result = await Swal.fire({
      title: '¿Eliminar ítem?',
      html: `
        <p>¿Está seguro de eliminar el ítem <strong>${item.nombre}</strong>?</p>
        ${item.total_ingredientes > 0 ?
          `<p class="text-warning">Este ítem tiene ${item.total_ingredientes} ingrediente(s) asociado(s)</p>` : ''}
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.itemsMenuService.eliminar(item.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El ítem ha sido eliminado', 'success');
          this.obtenerItems();
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          const mensaje = error.error?.error || 'No se pudo eliminar el ítem';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}