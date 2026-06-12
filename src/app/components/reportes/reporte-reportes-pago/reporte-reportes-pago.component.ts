import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ReportesPagoService } from '../../../services/reportes-pago.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reporte-reportes-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-reportes-pago.component.html',
  styleUrl: './reporte-reportes-pago.component.scss'
})
export class ReporteReportesPagoComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = 'Reporte de Pagos Reportados (Portal de Padres)';
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = [
    { columna: 'Fecha Pago', tipoFiltro: 'fecha' as 'fecha' | 'normal' },
    'Estudiante',
    'Reportado por',
    'Recibió',
    'Medio de Pago',
    'Estado',
    { columna: 'Fecha Registro', tipoFiltro: 'fecha' as 'fecha' | 'normal' }
  ];

  public resumen = {
    totalReportado: 0,
    pendientes: { cantidad: 0, total: 0 },
    asociados: { cantidad: 0, total: 0 },
    haySeleccion: false
  };

  constructor(
    private router: Router,
    private reportesPagoService: ReportesPagoService
  ) {}

  ngOnInit() {
    this.crearTitulos();
    this.obtenerTodos();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'fecha_pago', alias: 'Fecha Pago', alinear: 'centrado', tipo: 'date', formato: { pattern: 'dd/MM/yyyy' } },
      { clave: 'nombre_estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'nombre_persona_reporta', alias: 'Reportado por', alinear: 'izquierda' },
      { clave: 'nombre_colaborador_recibio', alias: 'Recibió', alinear: 'izquierda' },
      { clave: 'nombre_tipo_pago', alias: 'Medio de Pago', alinear: 'izquierda' },
      { clave: 'valor', alias: 'Valor', alinear: 'derecha', tipo: 'integer', formato: { digitInfo: '1.0-0' } },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'tiempo_habil_texto', alias: 'Tiempo Hábil', alinear: 'centrado' },
      { clave: 'tiene_comprobante', alias: 'Comprobante', alinear: 'centrado' },
      { clave: 'fecha_registro', alias: 'Fecha Registro', alinear: 'centrado', tipo: 'date', formato: { pattern: 'dd/MM/yyyy HH:mm' } },
      { clave: 'id_pago_recibido_texto', alias: 'Pago Asociado', alinear: 'centrado' },
      { clave: 'observaciones', alias: 'Observaciones', alinear: 'izquierda' }
    ];
  }

  obtenerTodos(): void {
    this.reportesPagoService.obtenerTodos().subscribe((response: any) => {
      const datos = response.body as any[];

      this.datos = datos.map(item => {
        // Estado legible
        let estadoTexto = item.estado === 'asociado' ? 'Registrado' : 'Pendiente';

        // Color de fila basado en horas hábiles
        let color = '';
        if (item.estado === 'asociado') {
          color = '#e6ffe6';
        } else if (item.horas_habiles > 48) {
          color = '#ffe6e6';
        } else {
          color = '#fffbe6';
        }

        return {
          ...item,
          estado_texto: estadoTexto,
          tiene_comprobante: item.comprobante_ruta ? 'Sí' : 'No',
          id_pago_recibido_texto: item.id_pago_recibido ? 'Pago #' + item.id_pago_recibido : '-',
          color: color
        };
      });

      this.calcularResumen(this.datos);
    });
  }

  calcularResumen(datos: any[]): void {
    this.resumen = {
      totalReportado: 0,
      pendientes: { cantidad: 0, total: 0 },
      asociados: { cantidad: 0, total: 0 },
      haySeleccion: datos.length > 0 && datos.length < this.datos.length
    };

    datos.forEach(item => {
      const valor = Number(item.valor) || 0;
      this.resumen.totalReportado += valor;

      if (item.estado === 'pendiente') {
        this.resumen.pendientes.cantidad++;
        this.resumen.pendientes.total += valor;
      } else {
        this.resumen.asociados.cantidad++;
        this.resumen.asociados.total += valor;
      }
    });
  }

  onDatosFiltradosCambiados(datosFiltrados: any[]): void {
    this.calcularResumen(datosFiltrados);
    this.resumen.haySeleccion = false;
  }

  onSeleccionCambiada(seleccionados: any[]): void {
    if (seleccionados.length > 0) {
      this.calcularResumen(seleccionados);
      this.resumen.haySeleccion = true;
    } else {
      const datosFiltrados = this.tablasComponent?.tabla?.datosFiltrados || this.datos;
      this.calcularResumen(datosFiltrados);
      this.resumen.haySeleccion = false;
    }
  }

  seleccionar(event: any) {
    if (event.accion === 'consultar') {
      // Navegar al detalle si es necesario
    }
  }
}