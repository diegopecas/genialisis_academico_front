import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { ConfiguracionGlobalService } from '../../../../services/configuracion-global.service';

@Component({
  selector: 'app-configuracion-global',
  templateUrl: './configuracion-global.component.html',
  styleUrl: './configuracion-global.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ConfiguracionGlobalComponent implements OnInit {

  titulo = "Configuración Global del Sistema";
  public columnasFiltro = ['Clave', 'Descripción', 'Tipo Valor'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private configuracionService: ConfiguracionGlobalService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConfiguraciones();
  }

  obtenerConfiguraciones() {
    this.configuracionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio configuración global", body);
      this.datos = body;
      this.datos.forEach((config: any) => {
        // Determinar qué tipo de valor tiene
        if (config.valor_texto !== null && config.valor_texto !== '') {
          config.tipo_valor = 'Texto';
          config.valor_mostrar = config.valor_texto;
        } else if (config.valor_numero !== null) {
          config.tipo_valor = 'Número';
          config.valor_mostrar = config.valor_numero;
        } else if (config.valor_fecha !== null) {
          config.tipo_valor = 'Fecha';
          config.valor_mostrar = config.valor_fecha;
        } else {
          config.tipo_valor = 'Sin valor';
          config.valor_mostrar = '-';
        }
      });
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
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_valor',
        alias: 'Tipo Valor',
        alinear: 'centrado',
      },
      {
        clave: 'valor_mostrar',
        alias: 'Valor',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/configuracion/configuracion-global/editar/' + $event.registro.id]);
        break;
    }
  }
}