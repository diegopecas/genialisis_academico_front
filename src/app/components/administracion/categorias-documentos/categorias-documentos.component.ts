import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CategoriasDocumentosService } from '../../../services/categorias-documentos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-categorias-documentos',
  templateUrl: './categorias-documentos.component.html',
  styleUrl: './categorias-documentos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CategoriasDocumentosComponent implements OnInit {

  titulo = "Categorías de Documentos";
  public columnasFiltro = ['Nombre', 'Código', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private categoriasDocumentosService: CategoriasDocumentosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerCategorias();
  }

  obtenerCategorias() {
    this.categoriasDocumentosService.obtenerTodas().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          icono_label: item.icono ? item.icono : 'Sin ícono',
          activo_label: item.activo ? 'Activo' : 'Inactivo',
          color: item.activo === 0 ? "#e2e9f3" : "",
        }));
      },
      error: (error: any) => {
        console.error("Error al cargar categorías de documentos", error);
        Swal.fire('Error', 'No se pudieron cargar las categorías', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'codigo', alias: 'Código', alinear: 'izquierda' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'icono_label', alias: 'Ícono', alinear: 'izquierda' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
      { clave: 'activo_label', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/categorias-documentos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarCategoria($event.registro);
        break;
    }
  }

  async eliminarCategoria(categoria: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la categoría "${categoria.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.categoriasDocumentosService.eliminar(categoria.id).subscribe({
        next: () => {
          Swal.fire('Eliminada', 'La categoría ha sido eliminada.', 'success');
          this.obtenerCategorias();
        },
        error: (error: any) => {
          console.error("Error al eliminar categoría", error);
          // El backend responde 400 con el detalle cuando hay tipos de
          // documento usando la categoría.
          const mensaje = error?.error?.error
            ? error.error.error
            : 'No se pudo eliminar la categoría.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
