import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { PdeAplicacionesService } from '../../../services/pde-aplicaciones.service';

@Component({
  selector: 'app-perfil-desarrollo',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent, FormsModule],
  templateUrl: './perfil-desarrollo.component.html',
  styleUrl: './perfil-desarrollo.component.scss'
})
export class PerfilDesarrolloComponent implements OnInit {

  titulo = 'Perfil de Desarrollo por Edades';
  @ViewChild('tablaEstudiantes') tablaEstudiantes!: TablasComponent;

  estudiantes: any[] = [];

  titulosTabla = [
    { alias: '#', clave: 'indice' },
    { alias: 'Nombre', clave: 'nombre' },
    { alias: 'Grupo', clave: 'grupo' },
    { alias: 'Edad', clave: 'edad' },
    { alias: 'Estado', clave: 'estado' },
    { alias: 'Índice', clave: 'pde_indice_label', tipo: 'badge', claseCSS: 'pde_indice_badge_class' },
    { alias: 'Estado PDE', clave: 'pde_estado_label', tipo: 'badge', claseCSS: 'pde_estado_badge_class' },
    { alias: 'Fecha PDE', clave: 'pde_fecha' }
  ];

  columnasFiltro: (string | { columna: string, tipoFiltro: 'fecha' | 'normal' })[] = [
    'Grupo',
    'Edad',
    'Estado',
    'Estado PDE',
    { columna: 'Fecha PDE', tipoFiltro: 'fecha' }
  ];

  accionesTabla = [
    { id: 'aplicar', label: 'Aplicar', icono: '/assets/images/evaluar.png' },
    { id: 'historial', label: 'Historial', icono: '/assets/images/historia.png' }
  ];

  constructor(
    private pdeAplicacionesService: PdeAplicacionesService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargarEstudiantes();
  }

  cargarEstudiantes() {
    this.pdeAplicacionesService.obtenerListadoEstudiantes().subscribe({
      next: (res: any) => {
        const datos = res.body as any[];
        this.estudiantes = datos.map((e: any, i: number) => ({
          id: e.id,
          indice: i + 1,
          nombre: e.nombre_completo,
          grupo: e.nombre_grupo,
          edad: this.formatearEdad(e.edad_meses, e.edad_anios),
          estado: e.estado_estudiante,
          pde_indice_label: this.formatearIndice(e.pde_indice),
          pde_indice_badge_class: this.getIndiceBadgeClass(e.pde_indice),
          pde_fecha: e.pde_fecha || '',
          pde_ultima_id: e.pde_ultima_id || null,
          pde_estado: e.pde_estado || '',
          pde_estado_label: this.getEstadoLabel(e.pde_estado),
          pde_estado_badge_class: this.getEstadoBadgeClass(e.pde_estado),
          color: e.activo == 0 ? '#e2e9f3' : ''
        }));
      }
    });
  }

  formatearIndice(indice: any): string {
    if (indice === null || indice === undefined || indice === '') return 'Sin aplicar';
    return `${Math.round(Number(indice))}`;
  }

  // El indice compara la edad de desarrollo alcanzada contra la edad real: 100 es lo esperado.
  getIndiceBadgeClass(indice: any): string {
    if (indice === null || indice === undefined || indice === '') return 'bg-secondary';
    const valor = Number(indice);
    if (valor >= 95) return 'bg-success';
    if (valor >= 80) return 'bg-warning text-dark';
    return 'bg-danger';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'iniciada': 'Iniciada',
      'en_proceso': 'En proceso',
      'finalizada': 'Finalizada'
    };
    return labels[estado] || 'Sin aplicar';
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'iniciada': 'bg-info',
      'en_proceso': 'bg-warning text-dark',
      'finalizada': 'bg-success'
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
      case 'aplicar':
        if (registro.pde_ultima_id &&
            (registro.pde_estado === 'iniciada' || registro.pde_estado === 'en_proceso')) {
          this.router.navigate(['/operaciones/perfil-desarrollo/aplicar', id], {
            queryParams: { retomar: registro.pde_ultima_id }
          });
        } else {
          this.router.navigate(['/operaciones/perfil-desarrollo/aplicar', id]);
        }
        break;
      case 'historial':
        this.router.navigate(['/operaciones/perfil-desarrollo/historial', id]);
        break;
    }
  }
}
