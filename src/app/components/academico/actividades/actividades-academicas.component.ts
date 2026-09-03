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
  public columnasFiltro = ['Tipo de Actividad', 'Título', 'Duración']; // Columnas para filtrar

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
        this.datos = body;
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