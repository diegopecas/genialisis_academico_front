import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { MovimientosFinancierosService } from '../../../services/movimientos-financieros.service';

interface MovimientoDesagregado {
  id: number;
  fecha: string;
  anio: number;
  tipo_movimiento: string;
  tipo_movimiento_icono: string;
  categoria: string;
  concepto: string;
  concepto_icono: string;
  medio_pago: string;
  medio_pago_icono: string;
  valor: number;
  detalle: string;
  referencia_externa: string;
  estado: string;
  usuario_registro: string;
}

@Component({
  selector: 'app-reporte-movimientos-financieros',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-movimientos-financieros.component.html',
  styleUrl: './reporte-movimientos-financieros.component.scss'
})
export class ReporteMovimientosFinancierosComponent implements OnInit, OnDestroy {
  titulo = 'Reporte de Movimientos Financieros';

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtros
  public anioSeleccionado: number = new Date().getFullYear();
  public aniosDisponibles: number[] = [];

  // Datos
  public movimientos: MovimientoDesagregado[] = [];

  // Datos filtrados actuales
  private datosFiltradosActuales: any[] = [];

  // Selección del usuario
  private seleccionActual: any[] = [];
  public haySeleccion: boolean = false;

  // Totales
  public totalesGenerales = {
    cantidadRegistros: 0,
    totalIngresos: 0,
    totalGastos: 0,
    balanceNeto: 0,
    cantidadIngresos: 0,
    cantidadGastos: 0
  };

  // Configuración de app-tablas
  public titulosTabla = [
    { clave: 'fecha', alias: 'Fecha', tipo: 'date' },
    { clave: 'anio', alias: 'Año' },
    { clave: 'tipo_movimiento', alias: 'Tipo' },
    { clave: 'categoria', alias: 'Categoría' },
    { clave: 'concepto', alias: 'Concepto' },
    { clave: 'medio_pago', alias: 'Medio de Pago' },
    { clave: 'valor', alias: 'Valor', tipo: 'money' },
    { clave: 'estado', alias: 'Estado' },
    { clave: 'usuario_registro', alias: 'Registrado por' },
    { clave: 'referencia_externa', alias: 'Referencia' },
    { clave: 'detalle', alias: 'Detalle' }
  ];

  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' })[] = [
    { columna: 'Fecha', tipoFiltro: 'rango' },
    'Año',
    'Tipo',
    'Categoría',
    'Concepto',
    'Medio de Pago',
    'Estado'
  ];

  public prefiltrosExcluir: { [alias: string]: any[] } = {};
  public prefiltrosFecha: { [alias: string]: { anio?: number, mes?: number, dia?: number } } = {};

  constructor(
    private movimientosFinancierosService: MovimientosFinancierosService
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

    const sub = this.movimientosFinancierosService.obtenerReporteAnual(this.anioSeleccionado).subscribe({
      next: (response: any) => {
        const data = response.body;
        if (data && Array.isArray(data) && data.length > 0) {
          this.procesarDatos(data);
          this.datosDisponibles = true;
        } else {
          this.movimientos = [];
          this.resetTotales();
          this.datosDisponibles = false;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar movimientos financieros:', error);
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });
    this.subscriptions.push(sub);
  }

  procesarDatos(data: any[]): void {
    this.movimientos = data.map(item => {
      const fecha = item.fecha || '';
      let anio = this.anioSeleccionado;
      if (fecha && /^\d{4}-\d{2}-\d{2}/.test(fecha)) {
        anio = parseInt(fecha.split('-')[0], 10);
      }

      let estado = 'Pendiente';
      if (item.anulado == 1) {
        estado = 'Anulado';
      } else if (item.id_usuario_aprobacion) {
        estado = 'Aprobado';
      }

      return {
        id: item.id,
        fecha: fecha,
        anio: anio,
        tipo_movimiento: item.tipo_movimiento_nombre || '',
        tipo_movimiento_icono: item.tipo_movimiento_icono || '',
        categoria: item.categoria_nombre || 'Sin categoría',
        concepto: item.concepto_nombre || 'Sin concepto',
        concepto_icono: item.concepto_icono || '',
        medio_pago: item.medio_pago_nombre || 'Sin medio',
        medio_pago_icono: item.medio_pago_icono || '',
        valor: parseFloat(item.valor) || 0,
        detalle: item.detalle || '',
        referencia_externa: item.referencia_externa || '',
        estado: estado,
        usuario_registro: item.usuario_registro_nombre || ''
      };
    });
    this.calcularTotales(this.movimientos);
  }

  calcularTotales(datos: any[]): void {
    // Solo se contabilizan movimientos no anulados para los totales financieros
    const activos = datos.filter(m => m.estado !== 'Anulado');
    const ingresos = activos.filter(m => m.tipo_movimiento === 'Ingreso');
    const gastos = activos.filter(m => m.tipo_movimiento === 'Gasto');

    this.totalesGenerales.cantidadRegistros = datos.length;
    this.totalesGenerales.cantidadIngresos = ingresos.length;
    this.totalesGenerales.cantidadGastos = gastos.length;
    this.totalesGenerales.totalIngresos = ingresos.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);
    this.totalesGenerales.totalGastos = gastos.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);
    this.totalesGenerales.balanceNeto = this.totalesGenerales.totalIngresos - this.totalesGenerales.totalGastos;
  }

  private resetTotales(): void {
    this.totalesGenerales = {
      cantidadRegistros: 0,
      totalIngresos: 0,
      totalGastos: 0,
      balanceNeto: 0,
      cantidadIngresos: 0,
      cantidadGastos: 0
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
}