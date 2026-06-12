import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import { EstudiantesXCursosExtraService } from '../../../services/estudiantes-x-cursos-extra.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inscripcion-cursos-extra',
  templateUrl: './inscripcion-cursos-extra.component.html',
  styleUrl: './inscripcion-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InscripcionCursosExtraComponent implements OnInit {

  titulo = "Inscripción a Cursos Extracurriculares";

  cursosExtra: any[] = [];
  idCursoSeleccionado: any = null;
  cursoSeleccionado: any = null;

  disponibles: any[] = [];
  disponiblesFiltrados: any[] = [];
  busquedaDisponibles: string = '';
  seleccionadosDisponibles: Set<number> = new Set();

  inscritos: any[] = [];
  inscritosFiltrados: any[] = [];
  busquedaInscritos: string = '';
  seleccionadosInscritos: Set<number> = new Set();

  constructor(
    private cursosExtraService: CursosExtraService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
  ) { }

  ngOnInit(): void {
    this.cargarCursos();
  }

  cargarCursos() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.cursosExtra = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar cursos", error);
      }
    });
  }

  onCursoChange() {
    if (!this.idCursoSeleccionado) {
      this.disponibles = [];
      this.disponiblesFiltrados = [];
      this.inscritos = [];
      this.inscritosFiltrados = [];
      this.cursoSeleccionado = null;
      return;
    }
    this.cursoSeleccionado = this.cursosExtra.find((c: any) => c.id == this.idCursoSeleccionado);
    this.cargarDisponibles();
    this.cargarInscritos();
    this.limpiarSelecciones();
  }

  cargarDisponibles() {
    this.cursosExtraService.obtenerEstudiantesDisponibles(this.idCursoSeleccionado).subscribe({
      next: (response: any) => {
        this.disponibles = response.body || [];
        this.filtrarDisponibles();
      },
      error: (error: any) => {
        console.error("Error al cargar disponibles", error);
      }
    });
  }

  cargarInscritos() {
    this.cursosExtraService.obtenerInscritos(this.idCursoSeleccionado).subscribe({
      next: (response: any) => {
        this.inscritos = response.body || [];
        this.filtrarInscritos();
      },
      error: (error: any) => {
        console.error("Error al cargar inscritos", error);
      }
    });
  }

  limpiarSelecciones() {
    this.seleccionadosDisponibles.clear();
    this.seleccionadosInscritos.clear();
    this.busquedaDisponibles = '';
    this.busquedaInscritos = '';
  }

  // Filtros
  filtrarDisponibles() {
    if (!this.busquedaDisponibles) {
      this.disponiblesFiltrados = [...this.disponibles];
    } else {
      const busqueda = this.busquedaDisponibles.toLowerCase();
      this.disponiblesFiltrados = this.disponibles.filter((e: any) =>
        e.nombre_completo.toLowerCase().includes(busqueda)
      );
    }
  }

  filtrarInscritos() {
    if (!this.busquedaInscritos) {
      this.inscritosFiltrados = [...this.inscritos];
    } else {
      const busqueda = this.busquedaInscritos.toLowerCase();
      this.inscritosFiltrados = this.inscritos.filter((e: any) =>
        e.nombre_completo.toLowerCase().includes(busqueda)
      );
    }
  }

  // Selección
  toggleDisponible(id: number) {
    if (this.seleccionadosDisponibles.has(id)) {
      this.seleccionadosDisponibles.delete(id);
    } else {
      this.seleccionadosDisponibles.add(id);
    }
  }

  toggleInscrito(id: number) {
    if (this.seleccionadosInscritos.has(id)) {
      this.seleccionadosInscritos.delete(id);
    } else {
      this.seleccionadosInscritos.add(id);
    }
  }

  seleccionarTodosDisponibles() {
    if (this.seleccionadosDisponibles.size === this.disponiblesFiltrados.length) {
      this.seleccionadosDisponibles.clear();
    } else {
      this.disponiblesFiltrados.forEach((e: any) => this.seleccionadosDisponibles.add(e.id));
    }
  }

  seleccionarTodosInscritos() {
    if (this.seleccionadosInscritos.size === this.inscritosFiltrados.length) {
      this.seleccionadosInscritos.clear();
    } else {
      this.inscritosFiltrados.forEach((e: any) => this.seleccionadosInscritos.add(e.id));
    }
  }

  // Mover estudiantes
  inscribirSeleccionados() {
    if (this.seleccionadosDisponibles.size === 0) {
      Swal.fire('Advertencia', 'Seleccione al menos un estudiante para inscribir', 'warning');
      return;
    }

    if (this.cursoSeleccionado?.cupo_maximo) {
      const totalDespues = this.inscritos.length + this.seleccionadosDisponibles.size;
      if (totalDespues > this.cursoSeleccionado.cupo_maximo) {
        Swal.fire('Advertencia', `No se pueden inscribir ${this.seleccionadosDisponibles.size} estudiantes. El cupo máximo es ${this.cursoSeleccionado.cupo_maximo} y ya hay ${this.inscritos.length} inscritos.`, 'warning');
        return;
      }
    }

    const fecha_hoy = new Date().toISOString().split('T')[0];
    const promesas: any[] = [];

    this.seleccionadosDisponibles.forEach((idEstudiante: number) => {
      const data = {
        id_estudiante: idEstudiante,
        id_curso_extra: parseInt(this.idCursoSeleccionado),
        fecha_inscripcion: fecha_hoy,
        anio: this.cursoSeleccionado.anio
      };
      promesas.push(this.estudiantesXCursosExtraService.crear(data).toPromise());
    });

    Promise.all(promesas).then(() => {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${this.seleccionadosDisponibles.size} estudiante(s) inscrito(s)`, showConfirmButton: false, timer: 2000 });
      this.cargarDisponibles();
      this.cargarInscritos();
      this.seleccionadosDisponibles.clear();
    }).catch((error: any) => {
      console.error("Error al inscribir", error);
      Swal.fire('Error', 'No se pudieron inscribir todos los estudiantes', 'error');
    });
  }

  retirarSeleccionados() {
    if (this.seleccionadosInscritos.size === 0) {
      Swal.fire('Advertencia', 'Seleccione al menos un estudiante para retirar', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Retirar estudiantes?',
      text: `¿Desea retirar ${this.seleccionadosInscritos.size} estudiante(s) del curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, retirar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const promesas: any[] = [];
        this.seleccionadosInscritos.forEach((idEstudiante: number) => {
          const inscripcion = this.inscritos.find((e: any) => e.id_estudiante == idEstudiante);
          if (inscripcion) {
            promesas.push(this.estudiantesXCursosExtraService.eliminar({ id: inscripcion.id }).toPromise());
          }
        });

        Promise.all(promesas).then(() => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `${this.seleccionadosInscritos.size} estudiante(s) retirado(s)`, showConfirmButton: false, timer: 2000 });
          this.cargarDisponibles();
          this.cargarInscritos();
          this.seleccionadosInscritos.clear();
        }).catch((error: any) => {
          console.error("Error al retirar", error);
          Swal.fire('Error', 'No se pudieron retirar todos los estudiantes', 'error');
        });
      }
    });
  }
}