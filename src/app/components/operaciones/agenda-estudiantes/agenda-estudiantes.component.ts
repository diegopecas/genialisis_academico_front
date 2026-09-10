import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesService } from '../../../services/estudiantes.service';

/**
 * Agenda de Estudiantes: listado de los estudiantes activos para abrir la
 * agenda del día de cada uno, la misma que ve el papá en su portal.
 */
@Component({
  selector: 'app-agenda-estudiantes',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './agenda-estudiantes.component.html',
  styleUrl: './agenda-estudiantes.component.scss'
})
export class AgendaEstudiantesComponent implements OnInit {

  titulo = 'Agenda de Estudiantes';

  estudiantes: any[] = [];

  titulosTabla = [
    { alias: '#', clave: 'indice' },
    { alias: 'Nombre', clave: 'nombre' },
    { alias: 'Grupo', clave: 'grupo' }
  ];

  columnasFiltro: (string | { columna: string, tipoFiltro: 'fecha' | 'normal' })[] = [
    'Grupo'
  ];

  accionesTabla = [
    { id: 'agenda', label: 'Ver agenda', icono: '/assets/images/agenda-estudiantes.png' }
  ];

  constructor(
    private estudiantesService: EstudiantesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarEstudiantes();
  }

  /**
   * Estudiantes activos en un grupo activo. El id de la fila es el del
   * estudiante (no el de estudiantes_x_grupos), que es el que pide la agenda.
   */
  cargarEstudiantes(): void {
    this.estudiantesService.obtenerActivos().subscribe({
      next: (res: any) => {
        const datos = (res.body as any[]) || [];
        this.estudiantes = datos.map((e: any, i: number) => ({
          id: e.id_estudiante,
          indice: i + 1,
          nombre: [e.primer_nombre, e.segundo_nombre, e.primer_apellido, e.segundo_apellido]
            .filter((parte: string) => !!parte)
            .join(' '),
          grupo: e.nombre_grupo
        }));
      },
      error: (error) => {
        console.error('Error al cargar estudiantes:', error);
        this.estudiantes = [];
      }
    });
  }

  onAccionTabla(evento: any): void {
    const { accion, id } = evento;

    if (accion === 'agenda') {
      this.router.navigate(['/operaciones/agenda-estudiantes/agenda', id]);
    }
  }
}
