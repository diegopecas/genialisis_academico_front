import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { ProductosAcademicoService } from '../../../services/productos-academico.service';

@Component({
  selector: 'app-productos-academico',
  templateUrl: './productos-academico.component.html',
  styleUrl: './productos-academico.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProductosAcademicoComponent implements OnInit {

  titulo = "Gestión de Productos Académicos";
  public columnasFiltro = ['Producto', 'Tipo', 'Grados', 'Consumible'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private productosAcademicoService: ProductosAcademicoService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProductosAcademico();
  }

  obtenerProductosAcademico() {
    this.productosAcademicoService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;

      this.datos.forEach((producto: any) => {
        producto.consumible_texto = producto.es_consumible ? 'Sí' : 'No';

        // Grados vienen separados por | desde el backend
        if (producto.grados) {
          const gradosArray = producto.grados.split('|');
          if (gradosArray.length > 3) {
            producto.grados_texto = `${gradosArray.slice(0, 3).join(', ')} (+${gradosArray.length - 3})`;
          } else {
            producto.grados_texto = gradosArray.join(', ');
          }
        } else {
          producto.grados_texto = 'Sin grados asignados';
        }
      });
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
        clave: 'nombre_producto',
        alias: 'Producto',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_academico',
        alias: 'Tipo',
        alinear: 'izquierda',
      },
      {
        clave: 'grados_texto',
        alias: 'Grados',
        alinear: 'izquierda',
      },
      {
        clave: 'consumible_texto',
        alias: 'Consumible',
        alinear: 'centrado',
      }
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/productos-academico/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProductoAcademico($event.registro);
        break;
      case 'consultar':
        this.router.navigate(['administracion/productos-academico/consultar/' + $event.registro.id]);
        break;
    }
  }

  async eliminarProductoAcademico(producto: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `¿Desea eliminar el producto académico <strong>${producto.nombre_producto}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosAcademicoService.eliminar(producto.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El producto académico ha sido eliminado.', 'success');
          this.obtenerProductosAcademico();
        },
        error: (error: any) => {
          console.error("Error al eliminar producto académico", error);
          Swal.fire('Error', 'No se pudo eliminar el producto académico.', 'error');
        }
      });
    }
  }
}