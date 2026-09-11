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
      { clave: 'color_html', alias: 'Color', alinear: 'centrado', tipo: 'html' },
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
      this.datos = body.map((tipo: any) => ({
        ...tipo,
        icono_html: this.iconoHtml(tipo.icono, imagenes),
        color_html: this.colorHtml(tipo.color)
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

  /** Muestra del color del tipo; sin color se ve el dorado por defecto del calendario. */
  private colorHtml(color: string | null): string {
    const valor = color || this.colorDefault;
    const etiqueta = color ? color : 'Por defecto';
    return `<span style="display: inline-flex; align-items: center; gap: 6px;"><span style="width: 22px; height: 22px; border-radius: 6px; background: ${valor}; border: 1px solid #ddd;"></span><small class="text-muted">${etiqueta}</small></span>`;
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
