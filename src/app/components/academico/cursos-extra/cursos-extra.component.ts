import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cursos-extra',
  templateUrl: './cursos-extra.component.html',
  styleUrl: './cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CursosExtraComponent implements OnInit {

  titulo = "Cursos Extracurriculares";
  public columnasFiltro = ['Nombre', 'Tipo', 'Área', 'Lugar', 'Activo'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private cursosExtraService: CursosExtraService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerCursos();
  }

  obtenerCursos() {
    this.cursosExtraService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((curso: any) => {
        return {
          id: curso.id,
          nombre: curso.nombre,
          // Los tres son opcionales en el curso: se muestra un guion cuando faltan
          // para que la columna no quede en blanco y parezca un error.
          nombre_tipo_curso: curso.nombre_tipo_curso || '-',
          nombre_area_academica: curso.nombre_area_academica || '-',
          nombre_lugar: curso.nombre_lugar || '-',
          fecha_inicio: curso.fecha_inicio,
          fecha_fin: curso.fecha_fin,
          cupo_label: this.armarCupo(curso),
          activo: curso.activo,
          anio: curso.anio,
          color: curso.activo === 0 ? "#e2e9f3" : "",
        };
      });
    });
  }

  /* El cupo se muestra junto con el minimo y el sobrecupo, que son los datos
     que decidien si el curso se puede abrir y si admite mas inscritos. */
  armarCupo(curso: any): string {
    if (!curso.cupo_maximo) {
      return curso.permite_sobrecupo ? 'Sin límite' : '-';
    }

    let texto = String(curso.cupo_maximo);
    if (curso.cupo_minimo) {
      texto = curso.cupo_minimo + ' - ' + texto;
    }
    if (curso.permite_sobrecupo) {
      texto += ' (+)';
    }
    return texto;
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_curso',
        alias: 'Tipo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_area_academica',
        alias: 'Área',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_lugar',
        alias: 'Lugar',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_inicio',
        alias: 'Inicio',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_fin',
        alias: 'Fin',
        alinear: 'centrado',
      },
      {
        clave: 'cupo_label',
        alias: 'Cupo',
        alinear: 'centrado',
      },
      {
        clave: 'activo',
        alias: 'Activo',
        alinear: 'centrado',
        tipo: 'booleano',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/cursos-extra/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarCurso($event.registro);
        break;
    }
  }

  async eliminarCurso(curso: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el curso ${curso.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.cursosExtraService.eliminar({ id: curso.id }).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El curso ha sido eliminado.', 'success');
          this.obtenerCursos();
        },
        error: (error: any) => {
          console.error("Error al eliminar curso", error);
          Swal.fire('Error', 'No se pudo eliminar el curso. Verifique que no tenga estudiantes inscritos.', 'error');
        }
      });
    }
  }
}