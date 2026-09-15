import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { InformesEstudiantesService } from '../../../../services/informes-estudiantes.service';
import { GruposService } from '../../../../services/grupos.service';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import { AuthService } from '../../../../services/auth.service';
import Swal from 'sweetalert2';

/**
 * Generación de informes: se escoge grupo y corte, y se ve el estado del
 * informe de cada estudiante para entrar a calificarlo.
 */
@Component({
  selector: 'app-informes-generacion',
  templateUrl: './informes-generacion.component.html',
  styleUrl: './informes-generacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InformesGeneracionComponent implements OnInit {

  titulo = "Generación de Informes";
  regresar = '/academico';

  grupos: any[] = [];
  cortes: any[] = [];

  idGrupo: any = null;
  idCorte: any = null;

  estudiantes: any[] = [];
  cargando = false;
  consultado = false;

  constructor(
    private informesEstudiantesService: InformesEstudiantesService,
    private gruposService: GruposService,
    private cortesAcademicosService: CortesAcademicosService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los grupos", error)
    });

    this.cortesAcademicosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cortes = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los cortes", error)
    });
  }

  consultar() {
    if (!this.idGrupo || !this.idCorte) {
      Swal.fire('Advertencia', 'Selecciona el grupo y el corte', 'warning');
      return;
    }

    this.cargando = true;
    this.informesEstudiantesService.obtenerEstadoPorGrupo(this.idGrupo, this.idCorte).subscribe({
      next: (response: any) => {
        this.estudiantes = (response.body as any[]) || [];
        this.cargando = false;
        this.consultado = true;
      },
      error: (error: any) => {
        console.error("Error al consultar el estado de los informes", error);
        this.cargando = false;
        this.consultado = true;
        Swal.fire('Error', 'No se pudo consultar el estado de los informes', 'error');
      }
    });
  }

  /** Cuántos faltan por calificar, para la barra de avance */
  porcentaje(est: any): number {
    if (!est.filas_total || est.filas_total == 0) {
      return 0;
    }
    return Math.round((est.filas_calificadas * 100) / est.filas_total);
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: any = {
      'sin_generar': 'Sin generar',
      'borrador': 'En borrador',
      'confirmado': 'Confirmado',
      'publicado': 'Publicado'
    };
    return etiquetas[estado] || estado;
  }

  generar(est: any) {
    const usuario = this.authService.getUsuarioActual();

    this.informesEstudiantesService.generar({
      id_estudiante: est.id_estudiante,
      id_corte_academico: this.idCorte,
      id_usuario: usuario?.id || null
    }).subscribe({
      next: () => this.consultar(),
      error: (error: any) => {
        console.error("Error al generar el informe", error);
        Swal.fire('Error', 'No se pudo generar el informe', 'error');
      }
    });
  }

  /**
   * Genera los que aún no existen. Los que ya están no se tocan, así que
   * repetirlo no borra trabajo hecho.
   */
  async generarTodos() {
    const pendientes = this.estudiantes.filter(e => e.estado === 'sin_generar');

    if (pendientes.length === 0) {
      Swal.fire('Todo listo', 'Todos los estudiantes ya tienen su informe generado.', 'info');
      return;
    }

    const result = await Swal.fire({
      title: '¿Generar los informes?',
      text: `Se crearán ${pendientes.length} informes en borrador, sin calificar.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();
    this.cargando = true;
    let procesados = 0;

    for (const est of pendientes) {
      try {
        await new Promise<void>((resolve) => {
          this.informesEstudiantesService.generar({
            id_estudiante: est.id_estudiante,
            id_corte_academico: this.idCorte,
            id_usuario: usuario?.id || null
          }).subscribe({
            next: () => { procesados++; resolve(); },
            error: () => resolve()
          });
        });
      } catch (e) {
        console.error("Error al generar informe", e);
      }
    }

    this.cargando = false;
    Swal.fire('Listo', `Se generaron ${procesados} informes.`, 'success');
    this.consultar();
  }

  calificar(est: any) {
    this.router.navigate(['/academico/informes/calificar', est.id_estudiante, this.idCorte]);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
