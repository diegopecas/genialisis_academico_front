import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { InformesItemsService } from '../../../../services/informes-items.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

/**
 * Ítems propios del informe: las filas que no salen de la malla curricular,
 * como participación familiar o las secciones informativas.
 */
@Component({
  selector: 'app-informes-items',
  templateUrl: './informes-items.component.html',
  styleUrl: './informes-items.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class InformesItemsComponent implements OnInit {

  titulo = "Ítems del Informe";
  public columnasFiltro = ['Sección', 'Texto'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private informesItemsService: InformesItemsService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerItems();
  }

  obtenerItems() {
    this.informesItemsService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        console.log("consumo servicio informes items", body);
        this.datos = body.map((i: any) => ({
          ...i,
          activo_texto: i.activo == 1 ? 'Activo' : 'Inactivo'
        }));
      },
      error: (error: any) => {
        console.error("Error al obtener los ítems del informe", error);
      }
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
        clave: 'nombre_seccion',
        alias: 'Sección',
        alinear: 'izquierda',
      },
      {
        clave: 'texto',
        alias: 'Texto',
        alinear: 'izquierda',
      },
      {
        clave: 'activo_texto',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/informes/items/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarItem($event.registro);
        break;
    }
  }

  async eliminarItem(item: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar este ítem del informe?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.informesItemsService.eliminar({ id: item.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El ítem ha sido eliminado.', 'success');
          this.obtenerItems();
        },
        error: (error: any) => {
          console.error("Error al eliminar el ítem", error);
          Swal.fire('Error', 'No se pudo eliminar el ítem.', 'error');
        }
      });
    }
  }
}
