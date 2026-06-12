import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProductosService } from '../../../services/productos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ProductosLimpiezaService } from '../../../services/productos-limpieza.service';

@Component({
  selector: 'app-productos-limpieza',
  templateUrl: './productos-limpieza.component.html',
  styleUrl: './productos-limpieza.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProductosLimpiezaComponent implements OnInit {

  titulo = "Gestión de Productos de Limpieza";
  public columnasFiltro = ['Producto', 'Tipo'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private productosLimpiezaService: ProductosLimpiezaService,
    private productosService: ProductosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProductosLimpieza();
  }

  obtenerProductosLimpieza() {
    this.productosLimpiezaService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("productos limpieza", body);
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
        clave: 'nombre_producto',
        alias: 'Producto',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_limpieza',  
        alias: 'Tipo',              
        alinear: 'izquierda',
      },
      {
        clave: 'concentracion',
        alias: 'Concentración',
        alinear: 'izquierda',
      },
      {
        clave: 'modo_uso',
        alias: 'Modo de Uso',
        alinear: 'izquierda',
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/productos-limpieza/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProductoLimpieza($event.registro);
        break;
    }
  }

  async eliminarProductoLimpieza(producto: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el producto de limpieza ${producto.nombre_producto}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosLimpiezaService.eliminar(producto.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El producto de limpieza ha sido eliminado.', 'success');
          this.obtenerProductosLimpieza();
        },
        error: (error: any) => {
          console.error("Error al eliminar producto de limpieza", error);
          Swal.fire('Error', 'No se pudo eliminar el producto de limpieza.', 'error');
        }
      });
    }
  }
}