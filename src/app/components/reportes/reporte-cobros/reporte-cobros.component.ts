import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';

interface CobroDesagregado {
  id: number;
  fecha: string;
  anio: number;
  nombre_persona: string;
  numero_identificacion: string;
  tipo_persona: string;
  grupo_o_cargo: string;
  nombre_producto_servicio: string;
  nombre_clasificacion: string;
  valor: number;
  valor_pagado: number;
  saldo: number;
  detalle: string;
}

@Component({
  selector: 'app-reporte-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-cobros.component.html',
  styleUrl: './reporte-cobros.component.scss'
})
export class ReporteCobrosComponent implements OnInit, OnDestroy {
  titulo = 'Reporte de Cobros Realizados';

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtros
  public anioSeleccionado: number = new Date().getFullYear();
  public aniosDisponibles: number[] = [];

  // Datos
  public cobros: CobroDesagregado[] = [];

  // Datos filtrados actuales
  private datosFiltradosActuales: any[] = [];

  // Selección del usuario
  private seleccionActual: any[] = [];
  public haySeleccion: boolean = false;

  // Totales
  public totalesGenerales = {
    totalCobrado: 0,
    totalPagado: 0,
    saldoTotal: 0,
    cantidadRegistros: 0,
    porcentajeRecaudo: 0,
    cantidadConSaldo: 0
  };

  // Configuración de app-tablas
  public titulosTabla = [
    { clave: 'fecha', alias: 'Fecha', tipo: 'date' },
    { clave: 'anio', alias: 'Año' },
    { clave: 'nombre_persona', alias: 'Persona' },
    { clave: 'tipo_persona', alias: 'Tipo' },
    { clave: 'numero_identificacion', alias: 'Identificación' },
    { clave: 'grupo_o_cargo', alias: 'Grupo / Cargo' },
    { clave: 'nombre_producto_servicio', alias: 'Producto' },
    { clave: 'nombre_clasificacion', alias: 'Clasificación' },
    { clave: 'valor', alias: 'Valor Cobrado', tipo: 'money' },
    { clave: 'valor_pagado', alias: 'Valor Pagado', tipo: 'money' },
    { clave: 'saldo', alias: 'Saldo', tipo: 'money' }
  ];

  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' })[] = [
    { columna: 'Fecha', tipoFiltro: 'rango' },
    'Año',
    'Tipo',
    'Grupo / Cargo',
    'Clasificación',
    'Producto',
    'Saldo'
  ];

  public prefiltrosExcluir: { [alias: string]: any[] } = {};
  public prefiltrosFecha: { [alias: string]: { anio?: number, mes?: number, dia?: number } } = {};

  constructor(
    private cuentasPorCobrarService: CuentasPorCobrarService
  ) {}

  ngOnInit(): void {
    this.inicializarAnios();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  inicializarAnios(): void {
    const anioActual = new Date().getFullYear();
    const anioInicial = 2024;
    this.aniosDisponibles = [];
    for (let anio = anioInicial; anio <= anioActual; anio++) {
      this.aniosDisponibles.push(anio);
    }
    this.anioSeleccionado = anioActual;
  }

  cambiarAnio(): void {
    this.prefiltrosFecha = {};
    this.seleccionActual = [];
    this.haySeleccion = false;
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = this.cuentasPorCobrarService.obtenerReporteCobrosAnual(this.anioSeleccionado).subscribe({
      next: (response: any) => {
        const data = response.body;
        if (data && Array.isArray(data) && data.length > 0) {
          this.procesarDatos(data);
          this.datosDisponibles = true;
        } else {
          this.cobros = [];
          this.resetTotales();
          this.datosDisponibles = false;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos de cobros:', error);
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });
    this.subscriptions.push(sub);
  }

  procesarDatos(data: any[]): void {
    this.cobros = data.map(item => {
      const fecha = item.fecha || '';
      let anio = this.anioSeleccionado;
      if (fecha && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        anio = parseInt(fecha.split('-')[0], 10);
      }

      return {
        id: item.id,
        fecha: fecha,
        anio: anio,
        nombre_persona: (item.nombre_persona || '').trim().replace(/\s+/g, ' '),
        numero_identificacion: item.numero_identificacion || '',
        tipo_persona: item.tipo_persona || 'Otro',
        grupo_o_cargo: item.grupo_o_cargo || 'Sin asignar',
        nombre_producto_servicio: item.nombre_producto_servicio || 'Sin producto',
        nombre_clasificacion: item.nombre_clasificacion || 'Sin clasificación',
        valor: parseFloat(item.valor) || 0,
        valor_pagado: parseFloat(item.valor_pagado) || 0,
        saldo: parseFloat(item.saldo) || 0,
        detalle: item.detalle || ''
      };
    });
    this.calcularTotales(this.cobros);
  }

  calcularTotales(datos: any[]): void {
    this.totalesGenerales.cantidadRegistros = datos.length;
    this.totalesGenerales.totalCobrado = datos.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
    this.totalesGenerales.totalPagado = datos.reduce((sum, c) => sum + (parseFloat(c.valor_pagado) || 0), 0);
    this.totalesGenerales.saldoTotal = datos.reduce((sum, c) => sum + (parseFloat(c.saldo) || 0), 0);
    this.totalesGenerales.cantidadConSaldo = datos.filter(c => parseFloat(c.saldo) > 0).length;
    this.totalesGenerales.porcentajeRecaudo = this.totalesGenerales.totalCobrado > 0
      ? Math.round((this.totalesGenerales.totalPagado / this.totalesGenerales.totalCobrado) * 100)
      : 0;
  }

  private resetTotales(): void {
    this.totalesGenerales = {
      totalCobrado: 0, totalPagado: 0, saldoTotal: 0,
      cantidadRegistros: 0, porcentajeRecaudo: 0, cantidadConSaldo: 0
    };
  }

  onDatosFiltradosCambiados(datosFiltrados: any[]): void {
    if (!datosFiltrados) return;
    this.datosFiltradosActuales = datosFiltrados;

    if (!this.haySeleccion) {
      this.calcularTotales(datosFiltrados);
    }
  }

  onSeleccionCambiada(seleccionados: any[]): void {
    this.seleccionActual = seleccionados;
    this.haySeleccion = seleccionados.length > 0;

    if (this.haySeleccion) {
      this.calcularTotales(seleccionados);
    } else {
      this.calcularTotales(this.datosFiltradosActuales);
    }
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol'
    }).format(valor);
  }
}