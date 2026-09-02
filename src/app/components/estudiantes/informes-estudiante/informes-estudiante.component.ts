import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { EstudianteEvaluacionesComponent } from '../vista-estudiante/estudiante-evaluaciones/estudiante-evaluaciones.component';

/**
 * Informes del estudiante como pantalla propia.
 *
 * Es la misma pestaña de evaluaciones de la vista 360, pero accesible
 * directamente desde las opciones del estudiante para quien solo necesita
 * consultar el informe y no toda la ficha.
 *
 * No duplica logica: reutiliza EstudianteEvaluacionesComponent tal cual.
 */
@Component({
  selector: 'app-informes-estudiante',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, EstudianteEvaluacionesComponent],
  templateUrl: './informes-estudiante.component.html',
  styleUrl: './informes-estudiante.component.scss',
})
export class InformesEstudianteComponent implements OnInit {
  public titulo = 'Informes';
  public idEstudiante = '0';
  public nombreEstudiante = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.idEstudiante = params['id'];
      if (!this.idEstudiante || this.idEstudiante === '0') {
        this.router.navigate(['/estudiantes']);
        return;
      }
      this.obtenerEstudiante(this.idEstudiante);
    });
  }

  obtenerEstudiante(id_estudiante: any): void {
    this.estudiantesService.obtenerById(id_estudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        if (!body || body.length === 0) {
          return;
        }
        const estudiante = body[0];
        this.nombreEstudiante = [
          estudiante.primer_nombre,
          estudiante.segundo_nombre,
          estudiante.primer_apellido,
          estudiante.segundo_apellido,
        ]
          .filter(Boolean)
          .join(' ');
        this.titulo = 'Informes de ' + this.nombreEstudiante;
      },
      error: (error: any) => {
        console.error('Error al obtener el estudiante', error);
      },
    });
  }
}
