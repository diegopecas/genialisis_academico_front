import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CertificadosConfiguracionService } from '../../../services/certificados-configuracion.service';

@Component({
  selector: 'app-certificados-configuracion',
  templateUrl: './certificados-configuracion.component.html',
  styleUrl: './certificados-configuracion.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CertificadosConfiguracionComponent implements OnInit {

  titulo = 'Configuración de Certificados';
  public columnasFiltro = ['Certificado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private configuracionService: CertificadosConfiguracionService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConfiguraciones();
  }

  /**
   * El backend siempre devuelve las cinco claves, aunque al tenant le falte
   * alguna fila, para que se puedan configurar desde aquí.
   */
  obtenerConfiguraciones() {
    this.configuracionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map(configuracion => ({
        id: configuracion.clave_certificado,
        certificado: configuracion.nombre,
        modo: configuracion.modo === 'automatico' ? 'Automático' : 'Manual',
        regla: this.textoRegla(configuracion),
        formato: Number(configuracion.es_de_pagos) === 1
          ? (Number(configuracion.agrupar_por_mes) === 1 ? 'Por mes' : 'Por recibo')
          : '',
        estado: Number(configuracion.activo) === 1 ? 'Activo' : 'Inactivo'
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'certificado',
        alias: 'Certificado',
        alinear: 'izquierda',
      },
      {
        clave: 'modo',
        alias: 'Modo',
        alinear: 'centrado',
      },
      {
        clave: 'regla',
        alias: 'Regla',
        alinear: 'izquierda',
      },
      {
        clave: 'formato',
        alias: 'Formato',
        alinear: 'centrado',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/operaciones/certificados-configuracion/editar/' + $event.registro.id]);
        break;
    }
  }

  /**
   * El paz y salvo no tiene regla configurable: siempre exige saldo en cero.
   */
  textoRegla(configuracion: any): string {
    if (Number(configuracion.regla_fija) === 1) {
      return 'Saldo en cero (fija)';
    }
    if (configuracion.regla === 'al_dia') {
      return 'Estar al día';
    }
    if (configuracion.regla === 'al_dia_productos') {
      return `Al día en ${configuracion.total_productos} producto(s)`;
    }
    return 'Sin restricción';
  }
}
