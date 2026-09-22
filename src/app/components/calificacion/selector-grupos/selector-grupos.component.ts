import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { GruposService } from '../../../services/grupos.service';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import { UtilService } from '../../../common/constantes/util.service';
import collect from 'collect.js';

@Component({
  selector: 'app-selector-grupos',
  templateUrl: './selector-grupos.component.html',
  styleUrl: './selector-grupos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent]
})
export class SelectorGruposComponent implements OnInit {

  public titulo = "Registro de calificaciones";
  public grupos: any[] = [];
  /* Cursos extracurriculares con área académica: sin área no tienen logros ni
     actividades, así que no hay nada que calificar y no se muestran. */
  public cursosExtra: any[] = [];

  constructor(
    private gruposService: GruposService,
    private cursosExtraService: CursosExtraService,
    private utilService: UtilService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarCursosExtra();
    this.cargarGrupos();
  }

  private cargarGrupos(): void {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.grupos = (collect(response.body).where('calificable', '==', 1) as any).items;
    });
  }

  private cargarCursosExtra(): void {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cursosExtra = body.filter((c: any) => !!c.id_area_academica);
      },
      error: (error: any) => {
        console.error("Error al cargar cursos extracurriculares", error);
      }
    });
  }

  seleccionarCursoExtra(curso: any): void {
    this.router.navigate(['/calificacion/curso-extra', curso.id]);
  }

  seleccionarGrupo(grupo: any): void {
    this.router.navigate(['/calificacion/grupo', grupo.id]);
  }
}