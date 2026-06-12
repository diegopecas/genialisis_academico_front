import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-listar-productos-servicios',
  templateUrl: './listar-productos-servicios.component.html',
  styleUrl: './listar-productos-servicios.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ListarProductosServiciosComponent implements OnInit {

  titulo = "Gestión de Productos y Servicios";
  public columnasFiltro = ['Nombre', 'Clasificación', 'Categoría', 'Periodicidad', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private productosServiciosService: ProductosServiciosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProductosServicios();
  }

  obtenerProductosServicios() {
    this.productosServiciosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio productos-servicios", body);
      this.datos = body;
      this.datos.forEach((p: any) => {
        p.color = p.disponible === 0 ? "#e2e9f3" : "";
        p.estado = p.disponible === 0 ? "No Disponible" : "Disponible";
        p.valor_formateado = p.valor_sugerido ? `$${Number(p.valor_sugerido).toLocaleString('es-CO')}` : '';
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
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_clasificacion',
        alias: 'Clasificación',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_categoria',
        alias: 'Categoría',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_periodicidad',
        alias: 'Periodicidad',
        alinear: 'izquierda',
      },
      {
        clave: 'valor_formateado',
        alias: 'Valor Sugerido',
        alinear: 'derecha',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/productos-servicios/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProductoServicio($event.registro);
        break;
    }
  }

  async eliminarProductoServicio(producto: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el producto/servicio ${producto.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosServiciosService.eliminar({ id: producto.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El producto/servicio ha sido eliminado.',
            'success'
          );
          this.obtenerProductosServicios();
        },
        error: (error: any) => {
          console.error("Error al eliminar producto/servicio", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el producto/servicio.',
            'error'
          );
        }
      });
    }
  }
}