import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { CasasDocentesService } from '../../../services/casas-docentes.service';
import { DocentesService } from '../../../services/docentes.service';


@Component({
  selector: 'app-gestion-docentes',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './gestion-docentes.component.html',
  styleUrl: './gestion-docentes.component.scss'
})
export class GestionDocentesComponent implements OnInit {
  titulo = "Gestión de Docentes";
  
  estadisticas = {
    totalDocentes: 0,
    totalCasas: 0,
    totalGrupos: 0,
    puntosAcumulados: 0
  };

  constructor(
    private router: Router,
    private docentesService: DocentesService,
    private casasDocentesService: CasasDocentesService
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  cargarEstadisticas() {
    // Cargar total de docentes activos
    this.docentesService.obtenerTodos().subscribe((response: any) => {
      const docentes = response.body || [];
      this.estadisticas.totalDocentes = docentes.filter((d: any) => d.activo === 1).length;
      
      // Contar grupos únicos asignados
      const gruposUnicos = new Set();
      docentes.forEach((docente: any) => {
        // Aquí se podría hacer una llamada para obtener los grupos de cada docente
        // Por ahora lo dejamos en 0
      });
    });

    // Cargar total de casas docentes
    this.casasDocentesService.obtenerTodos().subscribe((response: any) => {
      const casas = response.body || [];
      this.estadisticas.totalCasas = casas.length;
      
      // Sumar puntos de todas las casas
      this.estadisticas.puntosAcumulados = casas.reduce((total: number, casa: any) => {
        return total + (casa.puntos || 0);
      }, 0);
    });

    // TODO: Implementar servicio para obtener el total de grupos con docentes asignados
    // Por ahora dejamos un valor de ejemplo
    this.estadisticas.totalGrupos = 0;
  }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'docentes':
        this.router.navigate(['/docentes']);
        break;
      case 'casas-docentes':
        this.router.navigate(['/casas-docentes']);
        break;
      default:
        console.log('Opción no reconocida:', opcion);
        break;
    }
  }
}