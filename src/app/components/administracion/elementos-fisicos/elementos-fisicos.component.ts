import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ElementosFisicosService } from '../../../services/elementos-fisicos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-elementos-fisicos',
  templateUrl: './elementos-fisicos.component.html',
  styleUrl: './elementos-fisicos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ElementosFisicosComponent implements OnInit {

  titulo = "Gestión de Elementos Físicos";
  public columnasFiltro = ['Nombre', 'Material', 'Descripción'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private elementosFisicosService: ElementosFisicosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerElementosFisicos();
  }

  obtenerElementosFisicos() {
    this.elementosFisicosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
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
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'material',
        alias: 'Material',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/elementos-fisicos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarElementoFisico($event.registro);
        break;
    }
  }

  async eliminarElementoFisico(elemento: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el elemento físico ${elemento.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.elementosFisicosService.eliminar(elemento.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El elemento físico ha sido eliminado.', 'success');
          this.obtenerElementosFisicos();
        },
        error: (error: any) => {
          console.error("Error al eliminar elemento físico", error);
          Swal.fire('Error', 'No se pudo eliminar el elemento físico.', 'error');
        }
      });
    }
  }
}