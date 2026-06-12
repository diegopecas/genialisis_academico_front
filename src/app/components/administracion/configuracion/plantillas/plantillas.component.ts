import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { PlantillasService } from '../../../../services/plantillas.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plantillas',
  templateUrl: './plantillas.component.html',
  styleUrl: './plantillas.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class PlantillasComponent implements OnInit {

  titulo = "Gestión de Plantillas";
  public columnasFiltro = ['Clave', 'Título', 'Tipo'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private plantillasService: PlantillasService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerPlantillas();
  }

  obtenerPlantillas() {
    this.plantillasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'clave',
        alias: 'Clave',
        alinear: 'izquierda',
      },
      {
        clave: 'titulo',
        alias: 'Título',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_nombre',
        alias: 'Tipo',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_actualizacion',
        alias: 'Última actualización',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/configuracion/plantillas/editar/' + $event.registro.id]);
        break;
    }
  }
}