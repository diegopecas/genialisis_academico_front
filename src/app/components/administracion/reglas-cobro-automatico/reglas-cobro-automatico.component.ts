import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ReglasCobroAutomaticoService } from '../../../services/reglas-cobro-automatico.service';


@Component({
  selector: 'app-reglas-cobro-automatico',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './reglas-cobro-automatico.component.html',
  styleUrl: './reglas-cobro-automatico.component.scss'
})
export class ReglasCobroAutomaticoComponent implements OnInit {
  titulo = 'Reglas de Cobro Automático';
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private reglasService: ReglasCobroAutomaticoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerReglas();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'nombre_tipo_evento', alias: 'Tipo evento', alinear: 'izquierda' },
      { clave: 'nombre_producto_servicio', alias: 'Producto a cobrar', alinear: 'izquierda' },
      { clave: 'valor_sugerido_formateado', alias: 'Valor', alinear: 'derecha' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'nombre_convenio_exime', alias: 'Exime convenio', alinear: 'centrado' },
      { clave: 'prioridad', alias: 'Prioridad', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  obtenerReglas() {
    this.reglasService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.datos = (body as any[]).map((r: any) => ({
          ...r,
          estado: r.activo == 1 ? 'Activo' : 'Inactivo',
          color: r.activo == 0 ? '#e2e9f3' : '',
          nombre_grupo: r.nombre_grupo || 'Todos',
          nombre_convenio_exime: r.nombre_convenio_exime || 'Ninguno',
          valor_sugerido_formateado: '$' + Number(r.valor_sugerido).toLocaleString('es-CO')
        }));
      },
      error: (error) => {
        console.error('Error al obtener reglas:', error);
      }
    });
  }

  clicAccion($event: any) {
    if ($event.accion === 'editar') {
      this.router.navigate(['/administracion/financiero/reglas-cobro-automatico/editar/' + $event.registro.id]);
    }
  }
}