import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TiposCursosExtracurricularesService } from '../../../services/tipos-cursos-extracurriculares.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tipos-cursos-extracurriculares',
  templateUrl: './tipos-cursos-extracurriculares.component.html',
  styleUrl: './tipos-cursos-extracurriculares.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TiposCursosExtracurricularesComponent implements OnInit {

  titulo = "Tipos de Curso Extracurricular";
  public columnasFiltro = ['Nombre', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private tiposCursosExtracurricularesService: TiposCursosExtracurricularesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTipos();
  }

  obtenerTipos() {
    this.tiposCursosExtracurricularesService.obtenerTodos().subscribe({
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
        console.error("Error al cargar tipos de curso extracurricular", error);
        Swal.fire('Error', 'No se pudieron cargar los tipos de curso', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'cursos_label', alias: 'Cursos', alinear: 'centrado' },
      { clave: 'orden', alias: 'Orden', alinear: 'centrado' },
      { clave: 'activo_label', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/tipos-cursos-extracurriculares/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarTipo($event.registro);
        break;
    }
  }

  async eliminarTipo(tipo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el tipo de curso "${tipo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tiposCursosExtracurricularesService.eliminar(tipo.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El tipo de curso ha sido eliminado.', 'success');
          this.obtenerTipos();
        },
        error: (error: any) => {
          console.error("Error al eliminar tipo de curso", error);
          // El backend responde 400 con el detalle cuando hay cursos usando el tipo.
          const mensaje = error?.error?.error
            ? error.error.error
            : 'No se pudo eliminar el tipo de curso.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
