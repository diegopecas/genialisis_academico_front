import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProductosService } from '../../../services/productos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ProductosMobiliarioService } from '../../../services/productos-mobiliario.service';

@Component({
  selector: 'app-productos-mobiliario',
  templateUrl: './productos-mobiliario.component.html',
  styleUrl: './productos-mobiliario.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProductosMobiliarioComponent implements OnInit {

  titulo = "Gestión de Productos de Mobiliario";
  public columnasFiltro = ['Producto', 'Tipo', 'Limpieza', 'Desinfección'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private productosMobiliarioService: ProductosMobiliarioService,
    private productosService: ProductosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProductosMobiliario();
  }

  obtenerProductosMobiliario() {
    this.productosMobiliarioService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("elementos fisicos", body);
      this.datos = body;
      this.datos.forEach((e: any) => {
        e.requiere_limpieza_texto = e.requiere_limpieza ? 'Sí' : 'No';
        e.requiere_desinfeccion_texto = e.requiere_desinfeccion ? 'Sí' : 'No';
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
        clave: 'tipo_mobiliario',  
        alias: 'Tipo',              
        alinear: 'izquierda',
      },
      {
        clave: 'numero_serie',
        alias: 'Número Serie',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_adquisicion',
        alias: 'Fecha Adquisición',
        alinear: 'centrado',
      },
      {
        clave: 'requiere_limpieza_texto',
        alias: 'Limpieza',
        alinear: 'centrado',
      },
      {
        clave: 'requiere_desinfeccion_texto',
        alias: 'Desinfección',
        alinear: 'centrado',
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/productos-mobiliario/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarElementoFisico($event.registro);
        break;
    }
  }

  async eliminarElementoFisico(elemento: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el elemento físico ${elemento.numero_serie}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosMobiliarioService.eliminar(elemento.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El elemento físico ha sido eliminado.', 'success');
          this.obtenerProductosMobiliario();
        },
        error: (error: any) => {
          console.error("Error al eliminar elemento físico", error);
          Swal.fire('Error', 'No se pudo eliminar el elemento físico.', 'error');
        }
      });
    }
  }
}