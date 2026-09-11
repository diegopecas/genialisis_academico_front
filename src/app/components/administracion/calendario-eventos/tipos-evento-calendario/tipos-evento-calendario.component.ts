import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { TiposEventoCalendarioService } from '../../../../services/tipos-evento-calendario.service';

@Component({
  selector: 'app-tipos-evento-calendario',
  templateUrl: './tipos-evento-calendario.component.html',
  styleUrl: './tipos-evento-calendario.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposEventoCalendarioComponent implements OnInit {

  titulo = "Tipos de Evento";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public puedeCrear = true;
  public puedeEditar = true;
  public puedeEliminar = true;

  // Color con el que se pinta en el calendario un tipo que no tiene color asignado
  private readonly colorDefault = '#D4A437';

  constructor(
    private tiposEventoCalendarioService: TiposEventoCalendarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'icono_html', alias: 'Icono', alinear: 'centrado', tipo: 'html' },
      { clave: 'color_muestra', alias: 'Color', alinear: 'centrado', tipo: 'icono' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' }
    ];
  }

  obtenerDatos() {
    forkJoin({
      tipos: this.tiposEventoCalendarioService.obtenerTodos(),
      catalogo: this.tiposEventoCalendarioService.obtenerCatalogoIconos()
    }).subscribe(({ tipos, catalogo }: any) => {
      const imagenes = (catalogo?.imagenes ?? []) as any[];
      const body = (tipos.body ?? []) as any[];
      // El componente de tablas pinta toda la fila cuando el registro trae 'color',
      // por eso el color del tipo viaja solo en los campos de la muestra de la columna Color.
      // La columna tipo 'icono' de la tabla lee <clave>_class, <clave>_color, <clave>_texto y <clave>_title.
      this.datos = body.map(({ color, ...tipo }: any) => ({
        ...tipo,
        icono_html: this.iconoHtml(tipo.icono, imagenes),
        color_muestra: color || this.colorDefault,
        color_muestra_class: 'fas fa-square fa-2x align-middle',
        color_muestra_color: color || this.colorDefault,
        color_muestra_texto: color || 'Por defecto',
        color_muestra_title: color || 'Sin color asignado'
      }));
    });
  }

  /**
   * La tabla guarda solo el nombre del archivo; la ruta se toma del catálogo.
   * Si el icono no está en el catálogo se muestra el nombre del archivo para detectarlo.
   */
  private iconoHtml(icono: string, imagenes: any[]): string {
    if (!icono) {
      return '';
    }
    const imagen = imagenes.find((img: any) => img.ruta.split('/').pop() === icono);
    return imagen
      ? `<img src="${imagen.ruta}" alt="${imagen.nombre}" width="40" height="40" style="object-fit: contain;">`
      : `<small class="text-muted">${icono}</small>`;
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/calendario-eventos/tipos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el tipo de evento "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposEventoCalendarioService.eliminar({ id: registro.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El tipo de evento ha sido eliminado.', 'success');
          this.obtenerDatos();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el tipo de evento.', 'error');
        }
      });
    }
  }
}
