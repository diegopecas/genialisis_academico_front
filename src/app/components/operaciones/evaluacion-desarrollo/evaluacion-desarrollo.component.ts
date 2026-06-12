import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { FormsModule } from '@angular/forms';
import { Ead3EvaluacionesService } from '../../../services/ead3-evaluaciones.service';

@Component({
  selector: 'app-evaluacion-desarrollo',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent, FormsModule],
  templateUrl: './evaluacion-desarrollo.component.html',
  styleUrl: './evaluacion-desarrollo.component.scss'
})
export class EvaluacionDesarrolloComponent implements OnInit {

  titulo = 'Evaluación EAD-3';
  @ViewChild('tablaEstudiantes') tablaEstudiantes!: TablasComponent;

  estudiantes: any[] = [];

  titulosTabla = [
    { alias: '#', clave: 'indice' },
    { alias: 'Nombre', clave: 'nombre' },
    { alias: 'Grupo', clave: 'grupo' },
    { alias: 'Edad', clave: 'edad' },
    { alias: 'Estado', clave: 'estado' },
    { alias: 'Calificación EAD-3', clave: 'ead3_clasificacion', tipo: 'badge', claseCSS: 'ead3_badge_class' },
    { alias: 'Estado EAD-3', clave: 'ead3_estado_label', tipo: 'badge', claseCSS: 'ead3_estado_badge_class' },
    { alias: 'Fecha EAD-3', clave: 'ead3_fecha' }
  ];

  columnasFiltro: (string | { columna: string, tipoFiltro: 'fecha' | 'normal' })[] = [
    'Grupo',
    'Edad',
    'Estado',
    'Calificación EAD-3',
    'Estado EAD-3',
    { columna: 'Fecha EAD-3', tipoFiltro: 'fecha' }
  ];

  accionesTabla = [
    { id: 'evaluar', label: 'Evaluar', icono: '/assets/images/evaluar.png' },
    { id: 'historial', label: 'Historial', icono: '/assets/images/historia.png' }
  ];

  constructor(
    private ead3EvaluacionesService: Ead3EvaluacionesService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarEstudiantes();
  }

  cargarEstudiantes() {
    this.ead3EvaluacionesService.obtenerListadoEstudiantes().subscribe({
      next: (res: any) => {
        const datos = res.body as any[];
        this.estudiantes = datos.map((e: any, i: number) => ({
          id: e.id,
          indice: i + 1,
          nombre: e.nombre_completo,
          grupo: e.nombre_grupo,
          edad: this.formatearEdad(e.edad_meses, e.edad_anios),
          estado: e.estado_estudiante,
          ead3_clasificacion: e.ead3_clasificacion || 'Sin evaluación',
          ead3_badge_class: this.getBadgeClass(e.ead3_color),
          ead3_fecha: e.ead3_fecha || '',
          ead3_ultima_id: e.ead3_ultima_id || null,
          ead3_estado: e.ead3_estado || '',
          ead3_estado_label: this.getEstadoEad3Label(e.ead3_estado),
          ead3_estado_badge_class: this.getEstadoEad3BadgeClass(e.ead3_estado),
          color: e.activo == 0 ? '#e2e9f3' : ''
        }));
      }
    });
  }

  getBadgeClass(color: string): string {
    const clases: { [key: string]: string } = {
      'verde': 'bg-success',
      'amarillo': 'bg-warning text-dark',
      'rojo': 'bg-danger'
    };
    return clases[color] || 'bg-secondary';
  }

  getEstadoEad3Label(estado: string): string {
    const labels: { [key: string]: string } = {
      'iniciado': 'Iniciada',
      'en_proceso': 'En proceso',
      'finalizado': 'Finalizada'
    };
    return labels[estado] || 'Sin evaluar';
  }

  getEstadoEad3BadgeClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'iniciado': 'bg-info',
      'en_proceso': 'bg-warning text-dark',
      'finalizado': 'bg-success'
    };
    return clases[estado] || 'bg-secondary';
  }

  formatearEdad(edadMeses: number, edadAnios: number): string {
    if (!edadMeses && edadMeses !== 0) return 'N/A';
    if (edadMeses < 12) return `${edadMeses} meses`;
    const mesesRestantes = edadMeses % 12;
    return mesesRestantes > 0 ? `${edadAnios}a ${mesesRestantes}m` : `${edadAnios} años`;
  }

  onAccionTabla(evento: any) {
    const { accion, id, registro } = evento;
    switch (accion) {
      case 'evaluar':
        // Si hay evaluación activa (iniciado o en_proceso), retomar
        if (registro.ead3_ultima_id &&
            (registro.ead3_estado === 'iniciado' || registro.ead3_estado === 'en_proceso')) {
          this.router.navigate(['/operaciones/evaluacion-desarrollo/evaluar', id], {
            queryParams: { retomar: registro.ead3_ultima_id }
          });
        } else {
          this.router.navigate(['/operaciones/evaluacion-desarrollo/evaluar', id]);
        }
        break;
      case 'historial':
        this.router.navigate(['/operaciones/evaluacion-desarrollo/historial', id]);
        break;
    }
  }
}