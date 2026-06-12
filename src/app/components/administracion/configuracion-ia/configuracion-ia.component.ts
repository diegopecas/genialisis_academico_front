import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { IaConfiguracionService } from '../../../services/ia-configuracion.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configuracion-ia',
  templateUrl: './configuracion-ia.component.html',
  styleUrl: './configuracion-ia.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ConfiguracionIaComponent implements OnInit {

  titulo = "Configuración IA";
  public columnasFiltro = ['Clave', 'Descripción'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private iaConfiguracionService: IaConfiguracionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConfiguraciones();
  }

  obtenerConfiguraciones() {
    this.iaConfiguracionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio ia configuracion", body);
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
        clave: 'valor',
        alias: 'Valor',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/configuracion-ia/editar/' + $event.registro.id]);
        break;
    }
  }
}