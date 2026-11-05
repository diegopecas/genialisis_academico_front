import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TiposNovedadEspacioService } from '../../../services/tipos-novedad-espacio.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado)
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

/** Catálogo de tipos de novedad de los espacios (lluvia, mantenimiento...) */
@Component({
  selector: 'app-tipos-novedad-espacio',
  templateUrl: './tipos-novedad-espacio.component.html',
  styleUrl: './tipos-novedad-espacio.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposNovedadEspacioComponent implements OnInit {

  titulo = 'Tipos de Novedad de Espacio';
  public columnasFiltro = ['Nombre', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposNovedadEspacioService: TiposNovedadEspacioService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTipos();
  }

  obtenerTipos() {
    this.tiposNovedadEspacioService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body || []) as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          novedades_label: Number(item.total_novedades) > 0 ? item.total_novedades + ' novedad(es)' : 'Sin novedades',
          activo_label: Number(item.activo) === 1 ? 'Activo' : 'Inactivo',
          color: Number(item.activo) === 0 ? '#e2e9f3' : '',
        }));
      },
      error: (error: any) => {
        console.error('Error al cargar los tipos de novedad', error);
        Swal.fire('Error', 'No se pudieron cargar los tipos de novedad', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'novedades_label', alias: 'Novedades', alinear: 'centrado' },
      { clave: 'activo_label', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/tipos-novedad-espacio/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarTipo($event.registro);
        break;
    }
  }

  async eliminarTipo(tipo: any) {
    const result = await Swal.fire({
      title: '¿Eliminar el tipo?',
      text: `¿Deseas eliminar el tipo de novedad "${tipo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.tiposNovedadEspacioService.eliminar(tipo.id).subscribe({
      next: () => {
        Swal.fire('Eliminado', 'El tipo de novedad fue eliminado.', 'success');
        this.obtenerTipos();
      },
      error: (error: any) => {
        // El back responde 400 con el detalle cuando hay novedades con el tipo
        Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el tipo de novedad.', 'error');
      }
    });
  }
}
