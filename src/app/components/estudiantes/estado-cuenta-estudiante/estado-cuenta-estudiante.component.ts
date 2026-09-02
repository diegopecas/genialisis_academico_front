import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { EstudianteCuentasComponent } from '../vista-estudiante/estudiante-cuentas/estudiante-cuentas.component';

/**
 * Estado de cuenta del estudiante como pantalla propia.
 *
 * Es la misma pestaña de la vista 360, accesible directamente desde las
 * opciones del estudiante. Reutiliza EstudianteCuentasComponent sin cambios.
 */
@Component({
  selector: 'app-estado-cuenta-estudiante',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, EstudianteCuentasComponent],
  templateUrl: './estado-cuenta-estudiante.component.html',
  styleUrl: './estado-cuenta-estudiante.component.scss',
})
export class EstadoCuentaEstudianteComponent implements OnInit {
  public titulo = 'Estado de Cuenta';
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
        this.titulo = 'Estado de Cuenta de ' + this.nombreEstudiante;
      },
      error: (error: any) => {
        console.error('Error al obtener el estudiante', error);
      },
    });
  }
}
