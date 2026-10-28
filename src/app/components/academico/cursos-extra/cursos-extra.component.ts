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
  public sincronizando: boolean = false;

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
          // Sin fechas el curso es permanente
          fecha_inicio: curso.fecha_inicio || 'Permanente',
          fecha_fin: curso.fecha_fin || '-',
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

  // Manda al portal web los cursos activos con sus planes y horarios
  async sincronizarPortal() {
    const confirmacion = await Swal.fire({
      title: 'Sincronizar con el portal web',
      text: 'Se mandan al portal los cursos activos con los planes de su tarifa vigente y sus horarios. Las páginas del portal quedan con estos precios.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d4af37',
      confirmButtonText: 'Sincronizar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) {
      return;
    }

    this.sincronizando = true;
    this.cursosExtraService.sincronizarPortal().subscribe({
      next: (resumen: any) => {
        this.sincronizando = false;
        Swal.fire({
          title: 'Portal sincronizado',
          html: this.armarResumen(resumen),
          icon: 'success',
          confirmButtonColor: '#d4af37'
        });
      },
      error: (error: any) => {
        this.sincronizando = false;
        console.error('Error al sincronizar con el portal', error);
        Swal.fire('No se sincronizó', error?.error?.error || 'No se pudo sincronizar con el portal web.', 'error');
      }
    });
  }

  private armarResumen(r: any): string {
    const lista = (nombres: string[]) => nombres.map(n => this.escapar(n)).join(', ');
    let html = `<div style="text-align:left">`
      + `<p><b>Programas:</b> ${r.programas_actualizados || 0} actualizados, ${(r.programas_nuevos || []).length} nuevos, ${r.programas_desactivados || 0} desactivados</p>`
      + `<p><b>Planes:</b> ${r.planes_actualizados || 0} actualizados, ${(r.planes_nuevos || []).length} nuevos, ${r.planes_desactivados || 0} desactivados</p>`
      + `<p><b>Horarios:</b> ${r.horarios_actualizados || 0} actualizados, ${r.horarios_nuevos || 0} nuevos, ${r.horarios_desactivados || 0} desactivados</p>`;
    if ((r.programas_nuevos || []).length > 0) {
      html += `<p><b>Programas nuevos</b> (quedan sin publicar en el portal): ${lista(r.programas_nuevos)}</p>`;
    }
    if ((r.planes_nuevos || []).length > 0) {
      html += `<p><b>Planes nuevos:</b> ${lista(r.planes_nuevos)}</p>`;
    }
    return html + `</div>`;
  }

  private escapar(texto: string): string {
    return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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