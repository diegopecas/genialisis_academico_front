import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProductosService } from '../../../services/productos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ProductosAlimentacionService } from '../../../services/productos-alimentacion.service';

@Component({
  selector: 'app-productos-alimentacion',
  templateUrl: './productos-alimentacion.component.html',
  styleUrl: './productos-alimentacion.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProductosAlimentacionComponent implements OnInit {

  titulo = "Gestión de Productos de Alimentación";
  public columnasFiltro = ['Producto', 'Tipo', 'Clasificaciones', 'Días Vida Útil'];
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private productosAlimentacionService: ProductosAlimentacionService,
    private productosService: ProductosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProductosAlimentacion();
  }

  obtenerProductosAlimentacion() {
    this.productosAlimentacionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("productos alimentación", body);
      this.datos = body;
      
      // Procesar los datos que ya vienen con las clasificaciones desde el backend
      this.datos.forEach((producto: any) => {
        producto.dias_vida_util_texto = producto.dias_vida_util ? `${producto.dias_vida_util} días` : 'No definido';
        
        // Las clasificaciones ya vienen del backend separadas por |
        if (producto.clasificaciones) {
          const clasificacionesArray = producto.clasificaciones.split('|');
          
          // Formatear las clasificaciones para mostrar
          if (clasificacionesArray.length > 2) {
            producto.clasificaciones_texto = `${clasificacionesArray.slice(0, 2).join(', ')} (+${clasificacionesArray.length - 2})`;
          } else {
            producto.clasificaciones_texto = clasificacionesArray.join(', ');
          }
          producto.clasificaciones_badges = clasificacionesArray;
        } else {
          producto.clasificaciones_texto = 'Sin clasificación';
          producto.clasificaciones_badges = [];
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
        clave: 'tipo_alimentacion',  
        alias: 'Tipo',              
        alinear: 'izquierda',
      },
      {
        clave: 'clasificaciones_texto',
        alias: 'Clasificaciones',
        alinear: 'izquierda',
        // Opcional: Puedes agregar un renderizador personalizado si tu componente de tabla lo soporta
        // para mostrar las clasificaciones como badges
        customRenderer: true
      },
      {
        clave: 'dias_vida_util_texto',
        alias: 'Días Vida Útil',
        alinear: 'centrado',
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/productos-alimentacion/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProductoAlimentacion($event.registro);
        break;
      case 'consultar':
        this.router.navigate(['administracion/productos-alimentacion/consultar/' + $event.registro.id]);
        break;
    }
  }

  async eliminarProductoAlimentacion(producto: any) {
    // Mostrar las clasificaciones en el mensaje de confirmación si las tiene
    let mensajeAdicional = '';
    if (producto.clasificaciones_badges && producto.clasificaciones_badges.length > 0) {
      mensajeAdicional = `\n\nClasificaciones asociadas: ${producto.clasificaciones_badges.join(', ')}`;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      html: `¿Desea eliminar el producto de alimentación <strong>${producto.nombre_producto}</strong>?${mensajeAdicional}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosAlimentacionService.eliminar(producto.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El producto de alimentación ha sido eliminado.', 'success');
          this.obtenerProductosAlimentacion();
        },
        error: (error: any) => {
          console.error("Error al eliminar producto de alimentación", error);
          Swal.fire('Error', 'No se pudo eliminar el producto de alimentación.', 'error');
        }
      });
    }
  }
}