// ========== proveedores.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProveedoresService } from '../../../services/proveedores.service';
import { TiposProveedorService } from '../../../services/tipos-proveedor.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProveedoresComponent implements OnInit {

  titulo = "Gestión de Proveedores";
  public columnasFiltro = ['Nombre/Razón Social', 'Documento', 'Tipo Proveedor', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public tiposProveedor = [] as any[];

  public acciones = [
    { id: 'productos', label: 'Productos', icono: '/assets/images/productos.png' },
  ] as any[];

  constructor(
    private proveedoresService: ProveedoresService,
    private tiposProveedorService: TiposProveedorService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTiposProveedor();
    this.obtenerProveedores();
  }

  obtenerProveedores() {
    this.proveedoresService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio proveedores", body);
      this.datos = body;
      this.datos.forEach((p: any) => {
        // Si tiene razón social, usar eso, si no, construir el nombre completo
        if (p.razon_social) {
          p.nombre_mostrar = p.razon_social;
        } else {
          p.nombre_mostrar = `${p.primer_nombre || ''} ${p.segundo_nombre || ''} ${p.primer_apellido || ''} ${p.segundo_apellido || ''}`.trim();
        }
        p.color = p.activo === 0 ? "#e2e9f3" : "";
        p.estado = p.activo === 0 ? "Inactivo" : "Activo";
        p.documento_completo = `${p.tipo_identificacion}: ${p.numero_identificacion}`;
      });
    });
  }

  obtenerTiposProveedor() {
    this.tiposProveedorService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio tipos proveedor", body);
      this.tiposProveedor = body;
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
        clave: 'nombre_mostrar',
        alias: 'Nombre/Razón Social',
        alinear: 'izquierda',
      },
      {
        clave: 'documento_completo',
        alias: 'Documento',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_proveedor',
        alias: 'Tipo Proveedor',
        alinear: 'izquierda',
      },
      {
        clave: 'telefono',
        alias: 'Teléfono',
        alinear: 'izquierda',
      },
      {
        clave: 'correo_electronico',
        alias: 'Email',
        alinear: 'izquierda',
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
      case 'productos':
        this.verProductos($event.registro.id);
        break;
      case 'editar':
        this.router.navigate(['administracion/proveedores/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProveedor($event.registro);
        break;
    }
  }

  async eliminarProveedor(proveedor: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar al proveedor ${proveedor.nombre_mostrar}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.proveedoresService.eliminar(proveedor.id).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminado',
            'El proveedor ha sido eliminado.',
            'success'
          );
          this.obtenerProveedores();
        },
        error: (error: any) => {
          console.error("Error al eliminar proveedor", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar el proveedor.',
            'error'
          );
        }
      });
    }
  }

  verProductos(id: any) {
    // TODO: Implementar cuando exista el componente de productos por proveedor
    console.log("Ver productos del proveedor", id);
    Swal.fire({
      title: 'En desarrollo',
      text: 'La funcionalidad de productos por proveedor está en desarrollo',
      icon: 'info',
      confirmButtonText: 'Aceptar'
    });
  }
}