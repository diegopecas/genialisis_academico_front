import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TareasEstudiantesService } from '../../../services/tareas-estudiantes.service';

/**
 * Listado de Tareas Estudiantes. Cada tarea queda en borrador hasta
 * publicarla; publicar avisa a los acudientes.
 */
@Component({
  selector: 'app-tareas-estudiantes',
  templateUrl: './tareas-estudiantes.component.html',
  styleUrl: './tareas-estudiantes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class TareasEstudiantesComponent implements OnInit {

  titulo = 'Tareas Estudiantes';
  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [
    'Estado', 'Área', 'Dirigida a'
  ];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [
    { id: 'calificar', label: 'Calificar y preguntas', icono: '/assets/images/tarea-calificar.png' },
    { id: 'publicar', label: 'Publicar', icono: '/assets/images/tarea-publicar.png' },
  ];

  constructor(
    private tareasService: TareasEstudiantesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTareas();
  }

  obtenerTareas() {
    this.tareasService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.datos = body.map((tarea: any) => ({
        ...tarea,
        estado_texto: tarea.publicada == 1 ? 'Publicada' : 'Borrador',
        area_texto: tarea.area_nombre || 'Sin área',
        avance_texto: `${tarea.total_calificadas}/${tarea.total_estudiantes}`,
        // Los borradores se resaltan para que no se queden sin publicar
        color: tarea.publicada == 1 ? '' : '#fff8e1',
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'fecha_asignacion', alias: 'Asignación', alinear: 'centrado' },
      { clave: 'fecha_entrega', alias: 'Entrega', alinear: 'centrado' },
      { clave: 'titulo', alias: 'Título', alinear: 'izquierda' },
      { clave: 'area_texto', alias: 'Área', alinear: 'izquierda' },
      { clave: 'criterio_texto', alias: 'Dirigida a', alinear: 'izquierda' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'total_estudiantes', alias: 'Estudiantes', alinear: 'centrado' },
      { clave: 'total_enviadas', alias: 'Enviadas', alinear: 'centrado' },
      { clave: 'avance_texto', alias: 'Calificadas', alinear: 'centrado' },
      { clave: 'total_preguntas', alias: 'Preguntas', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['estudiantes/tareas/editar/' + $event.registro.id]);
        break;
      case 'calificar':
        this.router.navigate(['estudiantes/tareas/calificar/' + $event.registro.id]);
        break;
      case 'publicar':
        this.publicar($event.registro);
        break;
      case 'eliminar':
        this.eliminar($event.registro);
        break;
    }
  }

  async publicar(tarea: any) {
    if (tarea.publicada == 1) {
      Swal.fire('Ya está publicada', 'Si la editas, los acudientes reciben un aviso nuevo.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: '¿Publicar la tarea?',
      text: `Los acudientes de ${tarea.total_estudiantes} estudiante(s) recibirán el aviso de "${tarea.titulo}".`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, publicar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.tareasService.publicar({ id: tarea.id }).subscribe({
      next: () => {
        Swal.fire('Publicada', 'Los acudientes ya pueden ver la tarea.', 'success');
        this.obtenerTareas();
      },
      // El mensaje del backend lo muestra el interceptor
      error: () => { }
    });
  }

  async eliminar(tarea: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la tarea "${tarea.titulo}"? Dejará de verse en el portal de padres, la agenda y el calendario.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.tareasService.eliminar({ id: tarea.id }).subscribe({
        next: () => {
          Swal.fire('Eliminada', 'La tarea ha sido eliminada.', 'success');
          this.obtenerTareas();
        },
        error: () => { }
      });
    }
  }
}
