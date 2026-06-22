import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { SprintsService } from '../../../services/sprints.service';
import { TareasXSprintsService } from '../../../services/tareas-x-sprints.service';

@Component({
  selector: 'app-sprints',
  templateUrl: './sprints.component.html',
  styleUrls: ['./sprints.component.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class SprintsComponent implements OnInit {
  titulo = "Gestión de Sprints Académicos";

  public titulos: any[] = [];
  public datos: any[] = [];
  public columnasFiltro = ['Año', 'Sprint', 'Corte Académico', 'Estado'];
  public acciones = [
    { id: 'configurar', label: 'Configurar Sprint', icono: '/assets/images/configurar_sprint.png' },
    { id: 'finalizar', label: 'Finalizar Sprint', icono: '/assets/images/finalizar.png' }
  ];

  constructor(
    private router: Router,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTodos();
  }

  obtenerTodos(): void {
    // Usar el nuevo método optimizado
    this.sprintsService.obtenerTodosConEstadisticas().subscribe({
      next: (response: any) => {
        const sprints = response.body as any[];
        console.log("Sprints con estadísticas obtenidos:", sprints);

        // Procesar los datos para agregar formato y clases CSS
        sprints.forEach(sprint => {
          // Formatear fechas
          sprint.fecha_inicial_formato = this.formatearFecha(sprint.fecha_inicial);
          sprint.fecha_final_formato = this.formatearFecha(sprint.fecha_final);

          // Las clases ya vienen del backend, pero asegurémonos que estén
          if (!sprint.estado_clase) {
            sprint.estado_clase = this.obtenerClaseEstado(sprint.estado_sprint);
          }

          if (!sprint.progreso_clase) {
            sprint.progreso_clase = this.obtenerClaseProgreso(sprint.porcentaje_completado);
          }

          // Crear iconos HTML para los campos booleanos
          sprint.actual_icon = sprint.actual === 1
            ? '<i class="fas fa-star text-warning" title="Sprint Actual"></i>'
            : '<i class="fas fa-circle text-muted" style="font-size: 0.5rem;" title="No es el sprint actual"></i>';

          sprint.es_evaluacion_icon = sprint.es_evaluacion === 1
            ? '<i class="fas fa-clipboard-check text-info" title="Sprint de Evaluación"></i>'
            : '<i class="fas fa-circle text-muted" style="font-size: 0.5rem;" title="Sprint Regular"></i>';
        });

        this.datos = sprints;
      },
      error: (error: any) => {
        console.error("Error al obtener sprints", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los sprints.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  eliminar(idSprint: any, nombreSprint: string): void {
    console.log("Eliminar sprint ID:", idSprint);

    // Primero verificar si el sprint tiene tareas asociadas
    const sprint = this.datos.find(s => s.id === idSprint);

    if (sprint && sprint.total_tareas > 0) {
      Swal.fire({
        title: 'No se puede eliminar',
        text: `El sprint "${nombreSprint}" tiene ${sprint.total_tareas} tarea(s) asociada(s). Debe eliminar primero todas las tareas.`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
    } else {
      // Si no tiene tareas, proceder con la confirmación de eliminación
      Swal.fire({
        title: '¿Estás seguro?',
        text: `Se eliminará el sprint: "${nombreSprint}". Esta acción no se puede deshacer.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          const body = { id: idSprint };
          this.sprintsService.eliminar(body).subscribe({
            next: (response: any) => {
              console.log("Eliminar response", response);
              if (response.id) {
                Swal.fire({
                  title: 'Sprint eliminado con éxito',
                  icon: "success",
                  showCancelButton: false,
                  focusConfirm: true,
                  confirmButtonText: "Aceptar"
                }).then(() => {
                  this.obtenerTodos();
                });
              } else {
                Swal.fire({
                  title: 'Error al eliminar el sprint',
                  text: response.error || 'No se pudo eliminar el sprint. Intente más tarde.',
                  icon: "error",
                  showCancelButton: false,
                  focusConfirm: true,
                  confirmButtonText: "Aceptar"
                });
              }
            },
            error: (err: any) => {
              console.error("Error en servicio eliminar sprint", err);
              Swal.fire({
                title: 'Error',
                text: 'Ocurrió un error al intentar eliminar el sprint.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
              });
            }
          });
        }
      });
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
        clave: 'anio',
        alias: 'Año',
        alinear: 'centrado',
      },
      {
        clave: 'numero_sprint',
        alias: 'Sprint #',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_sprint',
        alias: 'Nombre del Sprint',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_corte_academico',
        alias: 'Corte Académico',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_inicial_formato',
        alias: 'Fecha Inicial',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_final_formato',
        alias: 'Fecha Final',
        alinear: 'centrado',
      },
      {
        clave: 'total_dias_habiles',
        alias: 'Días Hábiles',
        alinear: 'centrado',
      },
      {
        clave: 'total_tareas',
        alias: 'Total Tareas',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'badge-info'
      },
      {
        clave: 'porcentaje_completado',
        alias: '% Completado',
        alinear: 'centrado',
        tipo: 'progreso',
        claseCSS: 'progreso_clase' // Referencia dinámica a la clase de progreso
      },
      {
        clave: 'estado_sprint',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'estado_clase' // Referencia dinámica a la clase
      },
      {
        clave: 'actual_icon',
        alias: 'Actual',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'es_evaluacion_icon',
        alias: 'Evaluación',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  seleccionar(event: any): void {
    console.log("Seleccionar evento:", event);
    if (event.accion === 'editar') {
      this.router.navigate(['/academico/sprints/editar/' + event.id]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro.nombre_sprint || 'Sprint sin nombre');
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['/academico/sprints/consultar/' + event.id]);
    }
    if (event.accion === 'configurar') {
      this.router.navigate(['/academico/sprints/configurar/' + event.id]);
    }
    if (event.accion === 'finalizar') {
      this.finalizarSprint(event.id, event.registro);
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha + 'T00:00:00');
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('es-CO', opciones);
  }

  obtenerClaseEstado(estado: string): string {
    switch (estado) {
      case 'En ejecución':
        return 'badge-actual';
      case 'Ejecutado':
        return 'badge-success';
      case 'Pendiente':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  obtenerClaseProgreso(porcentaje: number): string {
    if (porcentaje >= 80) {
      return 'bg-success';
    } else if (porcentaje >= 50) {
      return 'bg-warning';
    } else if (porcentaje > 0) {
      return 'bg-danger';
    } else {
      return 'bg-secondary';
    }
  }
  // Agregar el método finalizarSprint:
  finalizarSprint(id: string, sprint: any): void {

    if (sprint.actual !== 1) {
      Swal.fire({
        title: '¿Desea finalizar este sprint?',
        text: 'Este no es el sprint actual. ¿Está seguro de finalizarlo?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, finalizar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.procesarFinalizacion(id, sprint);
        }
      });
    } else {
      this.procesarFinalizacion(id, sprint);
    }
  }

  private procesarFinalizacion(id: string, sprint: any): void {
    const tareasPendientes = sprint.tareas_pendientes || 0;

    Swal.fire({
      title: '¿Finalizar Sprint?',
      html: `
      <div class="text-start">
        <p><strong>Sprint:</strong> ${sprint.nombre_sprint}</p>
        <p><strong>Período:</strong> ${sprint.fecha_inicial_formato} - ${sprint.fecha_final_formato}</p>
        <hr>
        <p><strong>Resumen de tareas:</strong></p>
        <ul>
          <li>Total: ${sprint.total_tareas}</li>
          <li>Ejecutadas: ${sprint.tareas_ejecutadas}</li>
          <li class="text-warning">Pendientes: ${tareasPendientes}</li>
        </ul>
        ${tareasPendientes > 0 ?
          `<div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Las ${tareasPendientes} tareas pendientes serán canceladas automáticamente.
          </div>` :
          '<div class="alert alert-info mt-3">No hay tareas pendientes para cancelar.</div>'
        }
        <p class="mt-3"><strong>Esta acción:</strong></p>
        <ul>
          <li>Quitará el estado "actual" del sprint</li>
          <li>Cancelará todas las tareas pendientes</li>
          <li>Agregará una observación de cancelación por finalización</li>
        </ul>
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar sprint',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#6c757d',
      width: '600px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.sprintsService.finalizarSprint(id.toString()).subscribe({
          next: (response: any) => {
            Swal.fire({
              title: 'Sprint Finalizado',
              html: `
              <p>El sprint ha sido finalizado correctamente.</p>
              ${response.tareas_canceladas > 0 ?
                  `<p class="text-info mt-2">Se cancelaron ${response.tareas_canceladas} tareas pendientes.</p>` :
                  ''
                }
            `,
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#F5A623'
            }).then(() => {
              this.obtenerTodos();
            });
          },
          error: (error: any) => {
            console.error('Error finalizando sprint:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo finalizar el sprint. Por favor, intente nuevamente.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }
}