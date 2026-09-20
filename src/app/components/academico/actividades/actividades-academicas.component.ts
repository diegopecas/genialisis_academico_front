import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component'; 
import { TablasComponent } from '../../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { ActividadesAcademicasService } from '../../../services/actividades-academicas.service';

@Component({
  selector: 'app-actividades-academicas',
  templateUrl: './actividades-academicas.component.html',
  styleUrls: ['./actividades-academicas.component.scss'], 
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ActividadesAcademicasComponent implements OnInit {
  titulo = "Gestión de Actividades Académicas";

  public titulos: any[] = [];
  public datos: any[] = [];
  public columnasFiltro = ['Tipo de Actividad', 'Título', 'Duración', 'Tipo', 'Área(s)', 'Grupo(s) / Curso(s)']; // Columnas para filtrar

  public acciones = [
    { id: 'duplicar', label: 'Duplicar Actividad', icono: '/assets/images/duplicar_actividad.png' }
  ];

  constructor(
    private router: Router,
    private actividadesAcademicasService: ActividadesAcademicasService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTodos();
  }

  obtenerTodos(): void {
    this.actividadesAcademicasService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Consumo servicio actividades académicas", body);
        this.datos = body.map((item: any) => ({
          ...item,
          // Una actividad sin indicadores no tiene area ni curso: se muestra
          // un guion para que no parezca un error de carga.
          nombres_areas: item.nombres_areas || '-',
          nombres_grupos: item.nombres_grupos || '-',
          nombres_destinos: this.armarDestinos(item),
          tipo_malla: this.armarTipoMalla(item),
          tipo_malla_clase: this.armarClaseTipoMalla(item),
        }));
      },
      error: (error: any) => {
        console.error("Error al obtener actividades académicas", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las actividades académicas.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  eliminar(idActividad: any, tituloActividad: string): void {
    console.log("Eliminar actividad ID:", idActividad);
  
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la actividad: "${tituloActividad}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const body = { id: idActividad };
        this.actividadesAcademicasService.eliminar(body).subscribe({
          next: (response: any) => {
            console.log("Eliminar response", response);
            const data = response.id;
            if (data) {
              Swal.fire({
                title: 'Actividad eliminada con éxito',
                icon: "info",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              }).then(() => {
                this.obtenerTodos(); // Refresh the list
              });
            } else {
              Swal.fire({
                title: 'Error al eliminar la actividad',
                text: response.error || 'No se pudo eliminar la actividad. Intente más tarde.',
                icon: "error",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              });
              console.log("Error al eliminar actividad: No ID in response or error flag.", response);
            }
          },
          error: (err: any) => {
            console.error("Error en servicio eliminar actividad", err);
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al intentar eliminar la actividad.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else {
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  /**
   * Tipo de malla de la actividad, segun las areas a las que sirve:
   * Regular, Extracurricular o Mixta si toca las dos.
   *
   * Se calcula con el conteo de areas de cada clase y no con la lista de
   * cursos: el curso es un dato derivado del area y cambia cada vez que se
   * crea uno nuevo, sin que nadie haya tocado la actividad.
   */
  /**
   * Junta grupos del jardin y cursos extracurriculares en una sola columna.
   * Los logros extracurriculares no tienen grado, asi que para ellos la lista
   * de grupos siempre viene vacia y quien trabaja la actividad es el curso.
   */
  armarDestinos(item: any): string {
    const grupos = item.nombres_grupos && item.nombres_grupos !== '-' ? item.nombres_grupos : '';
    const cursos = item.nombres_cursos || '';

    if (grupos && cursos) {
      return grupos + ', ' + cursos;
    }
    return grupos || cursos || '-';
  }

  armarTipoMalla(item: any): string {
    const extra = Number(item.total_areas_extra) || 0;
    const regulares = Number(item.total_areas_regulares) || 0;

    if (extra > 0 && regulares > 0) {
      return 'Mixta';
    }
    if (extra > 0) {
      return 'Extracurricular';
    }
    if (regulares > 0) {
      return 'Regular';
    }
    // Sin indicadores asociados no se puede saber a que malla pertenece.
    return 'Sin asociar';
  }

  armarClaseTipoMalla(item: any): string {
    switch (this.armarTipoMalla(item)) {
      case 'Extracurricular': return 'bg-info text-white';
      case 'Mixta': return 'bg-primary text-white';
      case 'Regular': return 'bg-secondary text-white';
      default: return 'bg-light text-dark';
    }
  }

  crearTitulos(): void {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'titulo',
        alias: 'Título de la Actividad',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_actividad',
        alias: 'Tipo de Actividad',
        alinear: 'centrado',
      },
      {
        clave: 'minutos_duracion',
        alias: 'Duración (min)',
        alinear: 'centrado',
      },
      {
        clave: 'tipo_malla',
        alias: 'Tipo',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'tipo_malla_clase',
      },
      {
        clave: 'nombres_areas',
        alias: 'Área(s)',
        alinear: 'izquierda',
      },
      {
        clave: 'nombres_destinos',
        alias: 'Grupo(s) / Curso(s)',
        alinear: 'izquierda',
      },

      {
        clave: 'materiales',
        alias: 'Materiales',
        alinear: 'izquierda',
      }
    ];
  }

  seleccionar(event: any): void {
    console.log("Seleccionar evento:", event);
    if (event.accion === 'editar') {
      this.router.navigate(['/academico/actividades/gestion/editar/' + event.id]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro.titulo || 'Actividad sin título'); 
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['/academico/actividades/gestion/consultar/' + event.id]);
    }
    if (event.accion === 'duplicar') {
      this.duplicar(event.id, event.registro.titulo || 'Actividad sin título');
    }
  }

  /**
   * La copia la arma el backend en una transaccion (actividad + materiales +
   * indicadores). Al terminar se abre directamente en edicion, que es donde el
   * usuario va a cambiarle grupo, area e indicadores.
   */
  duplicar(idActividad: any, tituloActividad: string): void {
    Swal.fire({
      title: '¿Duplicar esta actividad?',
      text: `Se creará una copia de "${tituloActividad}" con sus materiales e indicadores de logro. Los sprints asociados no se copian.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F5A623',
      reverseButtons: true
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }

      const body = { id: idActividad };
      this.actividadesAcademicasService.duplicar(body).subscribe({
        next: (response: any) => {
          console.log("Duplicar response", response);
          const idNuevo = response.id;

          if (!idNuevo) {
            Swal.fire({
              title: 'Error al duplicar la actividad',
              text: response.error || 'No se pudo duplicar la actividad. Intente más tarde.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            return;
          }

          Swal.fire({
            title: 'Actividad duplicada',
            text: `Se creó "${response.titulo}". Ahora puedes ajustarle lo que necesites.`,
            icon: 'success',
            confirmButtonText: 'Editar la copia',
            confirmButtonColor: '#F5A623'
          }).then(() => {
            this.router.navigate(['/academico/actividades/gestion/editar/' + idNuevo]);
          });
        },
        error: (err: any) => {
          console.error("Error en servicio duplicar actividad", err);
          Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error al intentar duplicar la actividad.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    });
  }
}