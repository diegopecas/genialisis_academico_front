import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { GruposService } from '../../../services/grupos.service';
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

  constructor(
    private gruposService: GruposService,
    private utilService: UtilService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarGrupos();
  }

  private cargarGrupos(): void {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.grupos = (collect(response.body).where('calificable', '==', 1) as any).items;
    });
  }

  seleccionarGrupo(grupo: any): void {
    this.router.navigate(['/calificacion/grupo', grupo.id]);
  }
}