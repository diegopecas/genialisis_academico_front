import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { LugaresCursosExtraService } from '../../../services/lugares-cursos-extra.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lugares-cursos-extra',
  templateUrl: './lugares-cursos-extra.component.html',
  styleUrl: './lugares-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class LugaresCursosExtraComponent implements OnInit {

  titulo = "Lugares de Cursos Extracurriculares";
  public columnasFiltro = ['Nombre', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private lugaresCursosExtraService: LugaresCursosExtraService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerLugares();
  }

  obtenerLugares() {
    this.lugaresCursosExtraService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          cursos_label: item.total_cursos > 0 ? item.total_cursos + ' curso(s)' : 'Sin cursos',
          activo_label: item.activo ? 'Activo' : 'Inactivo',
          color: item.activo === 0 ? "#e2e9f3" : "",
        }));
      },
      error: (error: any) => {
        console.error("Error al cargar lugares de cursos extracurriculares", error);
        Swal.fire('Error', 'No se pudieron cargar los lugares', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'direccion', alias: 'Dirección', alinear: 'izquierda' },
      { clave: 'telefono', alias: 'Teléfono', alinear: 'izquierda' },
      { clave: 'contacto', alias: 'Contacto', alinear: 'izquierda' },
      { clave: 'cursos_label', alias: 'Cursos', alinear: 'centrado' },
      { clave: 'activo_label', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/lugares-cursos-extra/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarLugar($event.registro);
        break;
    }
  }

  async eliminarLugar(lugar: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el lugar "${lugar.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.lugaresCursosExtraService.eliminar(lugar.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El lugar ha sido eliminado.', 'success');
          this.obtenerLugares();
        },
        error: (error: any) => {
          console.error("Error al eliminar lugar", error);
          // El backend responde 400 con el detalle cuando hay cursos usando el lugar.
          const mensaje = error?.error?.error
            ? error.error.error
            : 'No se pudo eliminar el lugar.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
