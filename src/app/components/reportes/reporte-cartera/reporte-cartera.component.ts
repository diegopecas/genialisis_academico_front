import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';

import { HeaderComponent } from '../../../common/header/header.component';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';

// Interfaces
interface EstudianteCartera {
  id_persona: number;
  id_estudiante: number;
  id_colaborador: number;
  nombre_estudiante: string;
  numero_identificacion: string;
  grupo_estudiante: string;
  tipo_persona: string;
  activo: number;
  totalCobrado: number;
  totalCobradoAnulado: number;
  totalPagado: number;
  totalPagadoAnulado: number;
  saldoTotal: number;
  saldoVencido: number;
  saldoPendiente: number;
  tiposPago: { [key: string]: number };
  valoresMensuales: { [key: number]: any };
  clasificaciones: {
    [key: string]: {
      cobrado: number;
      pagado: number;
      cobradoAEsteMes: number;
      cobradoFuturo: number;
    }
  };
  productos: { [key: string]: { cobrado: number; pagado: number } };
  totalSaldoPendiente?: number;
}

// Interfaz extendida para cuando necesitamos totalSaldoPendiente como requerido
interface EstudianteCarteraConSaldoPendiente extends EstudianteCartera {
  totalSaldoPendiente: number;
}

interface ValorCartera {
  id_persona: number;
  tipo_valor: string;
  valor: number;
  mes: number | null;
}

interface ClasificacionCartera {
  id_clasificacion: number;
  nombre_clasificacion: string;
  total_cobrado: number;
  total_pagado: number;
  total_cobrado_anulado: number;
  total_pagado_anulado: number;
  saldo_total: number;
  saldo_vencido: number;
  saldo_pendiente: number;
  total_cobrado_a_este_mes?: number; // NUEVO
  total_cobrado_futuro?: number; // NUEVO
}

interface PagoDiario {
  fecha: string;
  dia: number;
  mes: number;
  nombre_mes: string;
  anio: number;
  id_tipo_pago: number;
  nombre_tipo_pago: string;
  total_cobrado: number;
  cantidad_cobros: number;
  total_pagado: number;
  total_recibido?: number;
  cantidad_pagos: number;
  id_estudiante?: number;
  id_colaborador?: number;
  id_persona?: number;
  nombre_estudiante?: string;
  tipo_persona?: string;
}

interface DatoMensual {
  mes: number;
  nombreMes: string;
  cobrado: number;
  cobradoAnulado: number;
  pagado: number;
  pagadoAnulado: number;
  saldo: number;
  porcentajeRecaudo: number;
}
interface ProductoCartera {
  id_producto: number;
  nombre_producto: string;
  id_clasificacion: number;
  nombre_clasificacion: string;
  total_cobrado: number;
  total_cobrado_a_este_mes: number;
  total_cobrado_futuro: number;
  total_pagado: number;
  saldo_total: number;
  saldo_vencido: number;
  saldo_pendiente: number;
  cantidad_estudiantes: number;
  porcentaje_recaudo: number;
}
interface MovimientoAnulado {
  fecha_anulacion: string;
  dia: number;
  mes: number;
  nombre_mes: string;
  anio: number;
  tipo_movimiento: string;
  id_tipo_pago: number;
  nombre_tipo_pago: string;
  fecha_original: string;
  id_estudiante?: number;
  id_colaborador?: number;
  id_persona?: number;
  nombre_estudiante?: string;
  tipo_persona?: string;
  id_producto_servicio?: number;
  nombre_producto?: string;
  id_clasificacion?: number;
  nombre_clasificacion?: string;
  valor_anulado: number;
  cantidad_anulaciones: number;
  id_usuario_anulacion?: number;
  nombre_usuario_anulacion?: string;
}
@Component({
  selector: 'app-reporte-cartera',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reporte-cartera.component.html',
  styleUrl: './reporte-cartera.component.scss'
})
export class ReporteCarteraComponent implements OnInit, OnDestroy, AfterViewInit {
  titulo = "Reporte de Cartera";

  // Variables de control
  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtros
  public anioSeleccionado: number = new Date().getFullYear();
  public aniosDisponibles: number[] = [];
  public grupoSeleccionado: string = '';
  public estadoSeleccionado: string = '';
  public busquedaEstudiante: string = '';
  public mesDiarioSeleccionado: string = '';

  // Datos
  public grupos: any[] = [];
  public estudiantes: EstudianteCartera[] = [];
  public estudiantesFiltrados: EstudianteCartera[] = [];
  public colaboradores: EstudianteCartera[] = [];
  public colaboradoresFiltrados: EstudianteCartera[] = [];
  public datosClasificaciones: ClasificacionCartera[] = [];
  public datosPagosDiarios: PagoDiario[] = [];
  public movimientoDiarioFiltrado: PagoDiario[] = [];
  public datosMensuales: DatoMensual[] = [];

  // Datos filtrados para otras vistas
  public datosClasificacionesFiltradas: ClasificacionCartera[] = [];
  public datosMensualesFiltrados: DatoMensual[] = [];

  // Filtros de activos/inactivos ('todos' | 'activos' | 'inactivos')
  public filtroActivoEstudiantes: string = 'activos';
  public filtroActivoColaboradores: string = 'activos';
  public filtroActivoSaldosEstudiantes: string = 'activos';
  public filtroActivoSaldosColaboradores: string = 'activos';

  // Variables para saldos pendientes mensuales (estudiantes)
  public estudiantesSaldosPendientesFiltrados: EstudianteCarteraConSaldoPendiente[] = [];
  public mostrarSoloConSaldoPendiente: boolean = true;
  public columnaOrdenamientoSaldos: string = 'totalSaldoPendiente';
  public ordenAscendenteSaldos: boolean = false;

  // Variables para saldos pendientes mensuales (colaboradores)
  public colaboradoresSaldosPendientesFiltrados: EstudianteCarteraConSaldoPendiente[] = [];
  public mostrarSoloConSaldoPendienteColaboradores: boolean = true;
  public columnaOrdenamientoSaldosColaboradores: string = 'totalSaldoPendiente';
  public ordenAscendenteSaldosColaboradores: boolean = false;

  // Paginación colaboradores
  public paginaActualColaboradores: number = 1;
  public totalPaginasColaboradores: number = 1;

  // Ordenamiento colaboradores
  public columnaOrdenamientoColaboradores: string = 'saldoVencido';
  public ordenAscendenteColaboradores: boolean = false;

  // Totales generales
  public totalesGenerales = {
    totalCobrado: 0,
    totalPagado: 0,
    saldoTotal: 0,
    saldoVencido: 0,
    saldoPendiente: 0,
    cantidadEstudiantes: 0,
    cantidadVencidos: 0,
    porcentajeRecaudo: 0
  };

  // Paginación
  public paginaActual: number = 1;
  public registrosPorPagina: number = 20;
  public totalPaginas: number = 1;

  // Detalle estudiante
  public estudianteSeleccionado: EstudianteCartera | null = null;
  public detalleEstudianteMensual: any[] = [];
  public detalleEstudianteTiposPago: any[] = [];

  // Gráficos
  private charts: { [key: string]: Chart } = {};

  // Meses disponibles
  public mesesDisponibles = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Ordenamiento
  public columnaOrdenamiento: string = 'saldoVencido';
  public ordenAscendente: boolean = false;

  public fechaInicioSeleccionada: string = '';
  public fechaFinSeleccionada: string = '';


  // Variables para paginación y colapso en Movimiento Diario

  public paginacionMovimientoDiario = {
    cobros: {
      paginaActual: 1,
      registrosPorPagina: 10,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false  // Agregar esta línea también para cobros si quieres
    },
    ingresos: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false  // Agregar esta propiedad
    },
    descuentos: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false  // Agregar esta propiedad
    },
    extracurricular: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false  // Agregar esta propiedad
    }
  };
  // Arrays globales para almacenar datos filtrados
  public movimientoIngresos: PagoDiario[] = [];
  public movimientoDescuentos: PagoDiario[] = [];
  public movimientoExtracurricular: PagoDiario[] = [];
  public movimientoCobros: PagoDiario[] = [];

  // Propiedades para los filtros de tipo de pago
  public filtroTipoIngresos: number | '' = '';
  public filtroTipoDescuentos: number | '' = '';
  public filtroTipoExtracurricular: number | '' = '';

  // Arrays para almacenar los tipos únicos obtenidos de los datos
  public tiposIngresos: { id: number, nombre: string }[] = [];
  public tiposDescuentos: { id: number, nombre: string }[] = [];
  public tiposExtracurricular: { id: number, nombre: string }[] = [];

  // Variables para tab de productos
  public datosProductos: ProductoCartera[] = [];
  public datosProductosFiltrados: ProductoCartera[] = [];
  public datosProductosAgrupados: Map<string, ProductoCartera[]> = new Map();
  public clasificacionSeleccionadaProductos: string = '';
  public productosSeleccionados: string[] = [];
  public dropdownProductosAbierto: boolean = false;
  public busquedaProducto: string = '';
  public clasificacionesUnicasProductos: { id: string, nombre: string }[] = [];
  public productosUnicos: { id: string, nombre: string }[] = [];
  constructor(
    private cuentasPorCobrarService: CuentasPorCobrarService
  ) {
    Chart.register(...registerables);
  }
  // Datos de anulados
  public datosAnulados: MovimientoAnulado[] = [];
  public anuladosFiltrados: MovimientoAnulado[] = [];

  // Arrays globales para anulados clasificados
  public anuladosCobros: MovimientoAnulado[] = [];
  public anuladosIngresos: MovimientoAnulado[] = [];
  public anuladosDescuentos: MovimientoAnulado[] = [];
  public anuladosExtracurricular: MovimientoAnulado[] = [];

  // Filtros de fecha para anulados
  public fechaInicioAnulacion: string = '';
  public fechaFinAnulacion: string = '';

  // Filtros de tipo para anulados
  public filtroTipoAnuladosIngresos: number | '' = '';
  public filtroTipoAnuladosDescuentos: number | '' = '';
  public filtroTipoAnuladosExtracurricular: number | '' = '';

  // Tipos únicos para anulados
  public tiposAnuladosIngresos: { id: number, nombre: string }[] = [];
  public tiposAnuladosDescuentos: { id: number, nombre: string }[] = [];
  public tiposAnuladosExtracurricular: { id: number, nombre: string }[] = [];

  // Paginación para anulados
  public paginacionAnulados = {
    cobros: {
      paginaActual: 1,
      registrosPorPagina: 10,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false
    },
    ingresos: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false
    },
    descuentos: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false
    },
    extracurricular: {
      paginaActual: 1,
      registrosPorPagina: 5,
      totalPaginas: 1,
      expandido: true,
      soloConDiferencia: false
    }
  };
  ngOnInit(): void {
    this.inicializarAnios();
    this.inicializarFechasFiltro();
    this.cargarDatosCartera();
  }

  ngAfterViewInit(): void {
    // Asegurar que los gráficos se generen después de que la vista esté completamente cargada
    if (this.datosDisponibles) {
      setTimeout(() => {
        this.generarGraficos();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.limpiarGraficos();
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

  cargarDatosCartera(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = this.cuentasPorCobrarService.obtenerReporteAnual(this.anioSeleccionado).subscribe({
      next: (response: any) => {
        const data = response.body;
        console.log("obtenerReporteAnual", data)
        if (data && data.reporte_estudiantes && data.reporte_valores) {
          this.procesarDatosCartera(data);
          this.datosDisponibles = true;

          // Aplicar filtro de fechas después de procesar datos
          this.filtrarMovimientoDiario(); // <-- Agregar esta línea

          // Generar gráficos después de procesar los datos
          setTimeout(() => {
            this.generarGraficos();
          }, 500);
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos de cartera:', error);
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });

    this.subscriptions.push(sub);
  }

  procesarDatosCartera(data: any): void {
    const estudiantesMap = new Map<number, EstudianteCartera>();

    // Inicializar personas (estudiantes + colaboradores) desde reporte_estudiantes
    data.reporte_estudiantes.forEach((est: any) => {
      estudiantesMap.set(est.id_persona, {
        id_persona: est.id_persona,
        id_estudiante: est.id_estudiante || 0,
        id_colaborador: est.id_colaborador || 0,
        nombre_estudiante: est.nombre_estudiante,
        numero_identificacion: est.numero_identificacion,
        grupo_estudiante: est.grupo_estudiante || 'Sin grupo',
        tipo_persona: est.tipo_persona || 'Estudiante',
        activo: est.activo ?? 1,
        totalCobrado: 0,
        totalCobradoAnulado: 0,
        totalPagado: 0,
        totalPagadoAnulado: 0,
        saldoTotal: 0,
        saldoVencido: 0,
        saldoPendiente: 0,
        tiposPago: {},
        valoresMensuales: {},
        clasificaciones: {},
        productos: {}
      });
    });

    // Procesar valores desde reporte_valores
    data.reporte_valores.forEach((valor: ValorCartera) => {
      const estudiante = estudiantesMap.get(valor.id_persona);
      if (!estudiante) return;

      // Procesar clasificaciones cobradas
      if (valor.tipo_valor.startsWith('Clasificacion_') &&
        !valor.tipo_valor.startsWith('Clasificacion_Pagado_') &&
        !valor.tipo_valor.startsWith('Clasificacion_AEsteMes_') &&
        !valor.tipo_valor.startsWith('Clasificacion_Futuro_')) {
        const match = valor.tipo_valor.match(/Clasificacion_(\d+)_(.+)/);
        if (match) {
          const idClasificacion = match[1];
          if (!estudiante.clasificaciones[idClasificacion]) {
            estudiante.clasificaciones[idClasificacion] = {
              cobrado: 0,
              pagado: 0,
              cobradoAEsteMes: 0,
              cobradoFuturo: 0
            };
          }
          estudiante.clasificaciones[idClasificacion].cobrado = valor.valor;
        }
      }
      // Procesar clasificaciones pagadas
      else if (valor.tipo_valor.startsWith('Clasificacion_Pagado_')) {
        const match = valor.tipo_valor.match(/Clasificacion_Pagado_(\d+)_(.+)/);
        if (match) {
          const idClasificacion = match[1];
          if (!estudiante.clasificaciones[idClasificacion]) {
            estudiante.clasificaciones[idClasificacion] = {
              cobrado: 0,
              pagado: 0,
              cobradoAEsteMes: 0,
              cobradoFuturo: 0
            };
          }
          estudiante.clasificaciones[idClasificacion].pagado = valor.valor;
        }
      }
      // Procesar clasificaciones cobrado a este mes
      else if (valor.tipo_valor.startsWith('Clasificacion_AEsteMes_')) {
        const match = valor.tipo_valor.match(/Clasificacion_AEsteMes_(\d+)_(.+)/);
        if (match) {
          const idClasificacion = match[1];
          if (!estudiante.clasificaciones[idClasificacion]) {
            estudiante.clasificaciones[idClasificacion] = {
              cobrado: 0,
              pagado: 0,
              cobradoAEsteMes: 0,
              cobradoFuturo: 0
            };
          }
          estudiante.clasificaciones[idClasificacion].cobradoAEsteMes = valor.valor;
        }
      }
      // Procesar clasificaciones cobrado futuro
      else if (valor.tipo_valor.startsWith('Clasificacion_Futuro_')) {
        const match = valor.tipo_valor.match(/Clasificacion_Futuro_(\d+)_(.+)/);
        if (match) {
          const idClasificacion = match[1];
          if (!estudiante.clasificaciones[idClasificacion]) {
            estudiante.clasificaciones[idClasificacion] = {
              cobrado: 0,
              pagado: 0,
              cobradoAEsteMes: 0,
              cobradoFuturo: 0
            };
          }
          estudiante.clasificaciones[idClasificacion].cobradoFuturo = valor.valor;
        }
      }
      // Procesar productos cobrados
      else if (valor.tipo_valor.startsWith('Producto_') && !valor.tipo_valor.startsWith('Producto_Pagado_')) {
        const match = valor.tipo_valor.match(/Producto_(\d+)_(.+)/);
        if (match) {
          const idProducto = match[1];
          if (!estudiante.productos[idProducto]) {
            estudiante.productos[idProducto] = { cobrado: 0, pagado: 0 };
          }
          estudiante.productos[idProducto].cobrado = valor.valor;
        }
      }
      // Procesar productos pagados
      else if (valor.tipo_valor.startsWith('Producto_Pagado_')) {
        const match = valor.tipo_valor.match(/Producto_Pagado_(\d+)_(.+)/);
        if (match) {
          const idProducto = match[1];
          if (!estudiante.productos[idProducto]) {
            estudiante.productos[idProducto] = { cobrado: 0, pagado: 0 };
          }
          estudiante.productos[idProducto].pagado = valor.valor;
        }
      }
      // Procesar otros valores
      else {
        switch (valor.tipo_valor) {
          case 'Total Cobrado':
            estudiante.totalCobrado = valor.valor;
            break;
          case 'Total Cobrado Anulado':
            estudiante.totalCobradoAnulado = valor.valor;
            break;
          case 'Total Pagado':
            estudiante.totalPagado = valor.valor;
            break;
          case 'Total Pagado Anulado':
            estudiante.totalPagadoAnulado = valor.valor;
            break;
          case 'Saldo Total':
            estudiante.saldoTotal = valor.valor;
            break;
          case 'Saldo Vencido':
            estudiante.saldoVencido = valor.valor;
            break;
          case 'Saldo Pendiente':
            estudiante.saldoPendiente = valor.valor;
            break;
          default:
            if (valor.tipo_valor.startsWith('Pago Tipo ')) {
              estudiante.tiposPago[valor.tipo_valor] = valor.valor;
            }
            else if (valor.mes !== null) {
              if (!estudiante.valoresMensuales[valor.mes]) {
                estudiante.valoresMensuales[valor.mes] = {};
              }
              estudiante.valoresMensuales[valor.mes][valor.tipo_valor] = valor.valor;
            }
            break;
        }
      }
    });

    const todasLasPersonas = Array.from(estudiantesMap.values());
    this.estudiantes = todasLasPersonas.filter(p => p.tipo_persona === 'Estudiante');
    this.colaboradores = todasLasPersonas.filter(p => p.tipo_persona === 'Colaborador');

    // Procesar clasificaciones
    this.datosClasificaciones = data.reporte_clasificaciones || [];

    // Procesar productos
    if (data.reporte_productos) {
      this.datosProductos = data.reporte_productos.map((prod: any) => ({
        id_producto: prod.id_producto,
        nombre_producto: prod.nombre_producto,
        id_clasificacion: prod.id_clasificacion,
        nombre_clasificacion: prod.nombre_clasificacion,
        total_cobrado: parseFloat(prod.total_cobrado) || 0,
        total_cobrado_a_este_mes: parseFloat(prod.total_cobrado_a_este_mes) || 0,
        total_cobrado_futuro: parseFloat(prod.total_cobrado_futuro) || 0,
        total_pagado: parseFloat(prod.total_pagado) || 0,
        saldo_total: parseFloat(prod.saldo_total) || 0,
        saldo_vencido: parseFloat(prod.saldo_vencido) || 0,
        saldo_pendiente: parseFloat(prod.saldo_pendiente) || 0,
        cantidad_estudiantes: parseInt(prod.cantidad_estudiantes) || 0,
        porcentaje_recaudo: 0
      }));

      // Calcular porcentaje de recaudo
      this.datosProductos.forEach(producto => {
        if (producto.total_cobrado > 0) {
          producto.porcentaje_recaudo = Math.round((producto.total_pagado / producto.total_cobrado) * 100);
        }
      });

      // Procesar estudiante_producto para actualizar los datos de estudiantes
      if (data.estudiante_producto) {
        this.procesarEstudianteProducto(data.estudiante_producto);
      }
    }

    // Inicializar datos filtrados
    this.datosProductosFiltrados = [...this.datosProductos];
    this.datosClasificacionesFiltradas = [...this.datosClasificaciones];

    // Actualizar filtros de productos
    this.actualizarFiltrosProductos();

    // Agrupar productos por clasificación
    this.agruparProductosPorClasificacion();

    // Procesar pagos diarios
    this.datosPagosDiarios = data.reporte_pagos_diarios || [];
    this.movimientoDiarioFiltrado = [...this.datosPagosDiarios];
    this.clasificarMovimientosPorTipo();
    this.calcularPaginacionMovimientoDiario();

    // NUEVO: Procesar anulados
    if (data.reporte_anulados) {
      this.datosAnulados = data.reporte_anulados || [];
      this.anuladosFiltrados = [...this.datosAnulados];

      // Inicializar fechas de filtro para anulados
      this.inicializarFechasFiltroAnulados();

      // Clasificar anulados por tipo
      this.clasificarAnuladosPorTipo();

      // Calcular paginación inicial
      this.calcularPaginacionAnulados();
    }

    // Generar datos mensuales
    this.generarDatosMensuales();
    this.datosMensualesFiltrados = [...this.datosMensuales];

    // Calcular totales generales
    this.calcularTotalesGenerales();

    // Aplicar filtros iniciales
    this.aplicarFiltros();
    this.aplicarFiltrosColaboradores();
  }

  private procesarEstudianteProducto(estudianteProducto: any[]): void {
    estudianteProducto.forEach(ep => {
      // Buscar en estudiantes primero, luego en colaboradores
      let persona = this.estudiantes.find(e => e.id_persona === ep.id_persona);
      if (!persona) {
        persona = this.colaboradores.find(c => c.id_persona === ep.id_persona);
      }
      if (persona) {
        if (!persona.productos[ep.id_producto]) {
          persona.productos[ep.id_producto] = { cobrado: 0, pagado: 0 };
        }
        persona.productos[ep.id_producto] = {
          cobrado: parseFloat(ep.total_cobrado) || 0,
          pagado: parseFloat(ep.total_pagado) || 0
        };
        if (!persona.clasificaciones[ep.id_clasificacion]) {
          persona.clasificaciones[ep.id_clasificacion] = {
            cobrado: 0,
            pagado: 0,
            cobradoAEsteMes: 0,
            cobradoFuturo: 0
          };
        }
      }
    });
  }
  generarDatosMensuales(): void {
    this.datosMensuales = [];

    // Crear estructura para cada mes
    for (let mes = 1; mes <= 12; mes++) {
      const datoMes: DatoMensual = {
        mes: mes,
        nombreMes: this.mesesDisponibles[mes - 1].nombre,
        cobrado: 0,
        cobradoAnulado: 0,
        pagado: 0,
        pagadoAnulado: 0,
        saldo: 0,
        porcentajeRecaudo: 0
      };

      // Sumar valores de todos los estudiantes para este mes
      this.estudiantes.forEach(est => {
        const valoresMes = est.valoresMensuales[mes];
        if (valoresMes) {
          datoMes.cobrado += valoresMes[`Cobrado ${datoMes.nombreMes}`] || 0;
          datoMes.cobradoAnulado += valoresMes[`Cobrado Anulado ${datoMes.nombreMes}`] || 0;
          datoMes.pagado += valoresMes[`Pagado ${datoMes.nombreMes}`] || 0;
          datoMes.pagadoAnulado += valoresMes[`Pagado Anulado ${datoMes.nombreMes}`] || 0;
          datoMes.saldo += valoresMes[`Saldo ${datoMes.nombreMes}`] || 0;
        }
      });

      // Calcular porcentaje de recaudo
      if (datoMes.cobrado > 0) {
        datoMes.porcentajeRecaudo = Math.round((datoMes.pagado / datoMes.cobrado) * 100);
      }

      this.datosMensuales.push(datoMes);
    }
  }

  calcularTotalesGenerales(): void {
    this.totalesGenerales = {
      totalCobrado: 0,
      totalPagado: 0,
      saldoTotal: 0,
      saldoVencido: 0,
      saldoPendiente: 0,
      cantidadEstudiantes: this.estudiantes.length,
      cantidadVencidos: 0,
      porcentajeRecaudo: 0
    };

    this.estudiantes.forEach(est => {
      this.totalesGenerales.totalCobrado += est.totalCobrado;
      this.totalesGenerales.totalPagado += est.totalPagado;
      this.totalesGenerales.saldoTotal += est.saldoTotal;
      this.totalesGenerales.saldoVencido += est.saldoVencido;
      this.totalesGenerales.saldoPendiente += est.saldoPendiente;

      if (est.saldoVencido > 0) {
        this.totalesGenerales.cantidadVencidos++;
      }
    });

    if (this.totalesGenerales.totalCobrado > 0) {
      this.totalesGenerales.porcentajeRecaudo = Math.round(
        (this.totalesGenerales.totalPagado / this.totalesGenerales.totalCobrado) * 100
      );
    }
  }

  cambiarAnio(): void {
    this.cargarDatosCartera();
  }

  filtrarTodosLosComponentes(): void {
    // Filtrar clasificaciones basándose en los estudiantes filtrados
    this.filtrarClasificaciones();

    // Filtrar productos basándose en los estudiantes filtrados
    this.filtrarProductos();

    // Filtrar datos mensuales basándose en los estudiantes filtrados
    this.filtrarDatosMensuales();

    // Actualizar totales generales con datos filtrados
    this.calcularTotalesGeneralesFiltrados();

    // Regenerar gráficos con datos filtrados
    setTimeout(() => {
      this.generarGraficos();
    }, 100);
  }

  filtrarClasificaciones(): void {
    // Si no hay filtros, usar datos originales
    if (!this.grupoSeleccionado && !this.estadoSeleccionado && !this.busquedaEstudiante) {
      this.datosClasificacionesFiltradas = [...this.datosClasificaciones];

      // Calcular totales desde los estudiantes
      this.datosClasificacionesFiltradas.forEach(clasif => {
        clasif.total_cobrado_a_este_mes = 0;
        clasif.total_cobrado_futuro = 0;

        this.estudiantes.forEach(est => {
          if (est.clasificaciones[clasif.id_clasificacion]) {
            clasif.total_cobrado_a_este_mes! += est.clasificaciones[clasif.id_clasificacion].cobradoAEsteMes || 0;
            clasif.total_cobrado_futuro! += est.clasificaciones[clasif.id_clasificacion].cobradoFuturo || 0;
          }
        });
      });
      return;
    }

    // Con filtros, recalcular
    const clasificacionesMap = new Map<string, ClasificacionCartera>();

    this.datosClasificaciones.forEach(clasif => {
      clasificacionesMap.set(clasif.id_clasificacion.toString(), {
        id_clasificacion: clasif.id_clasificacion,
        nombre_clasificacion: clasif.nombre_clasificacion,
        total_cobrado: 0,
        total_pagado: 0,
        total_cobrado_anulado: 0,
        total_pagado_anulado: 0,
        saldo_total: 0,
        saldo_vencido: 0,
        saldo_pendiente: 0,
        total_cobrado_a_este_mes: 0,
        total_cobrado_futuro: 0
      });
    });

    // Sumar solo estudiantes filtrados
    this.estudiantesFiltrados.forEach(est => {
      Object.keys(est.clasificaciones).forEach(idClasificacion => {
        const clasificacion = clasificacionesMap.get(idClasificacion);
        if (clasificacion && clasificacion.total_cobrado_a_este_mes !== undefined && clasificacion.total_cobrado_futuro !== undefined) {
          clasificacion.total_cobrado += est.clasificaciones[idClasificacion].cobrado || 0;
          clasificacion.total_pagado += est.clasificaciones[idClasificacion].pagado || 0;
          clasificacion.total_cobrado_a_este_mes += est.clasificaciones[idClasificacion].cobradoAEsteMes || 0;
          clasificacion.total_cobrado_futuro += est.clasificaciones[idClasificacion].cobradoFuturo || 0;
          clasificacion.saldo_total = clasificacion.total_cobrado - clasificacion.total_pagado;

          const proporcion = est.totalCobrado > 0
            ? est.clasificaciones[idClasificacion].cobrado / est.totalCobrado
            : 0;
          clasificacion.saldo_vencido += est.saldoVencido * proporcion;
        }
      });
    });

    this.datosClasificacionesFiltradas = Array.from(clasificacionesMap.values())
      .filter(clasif => clasif.total_cobrado > 0 || clasif.total_pagado > 0);
  }

  filtrarDatosMensuales(): void {
    // Si no hay filtros, mostrar todos los datos mensuales
    if (!this.grupoSeleccionado && !this.estadoSeleccionado && !this.busquedaEstudiante) {
      this.datosMensualesFiltrados = [...this.datosMensuales];
      return;
    }

    // Recalcular datos mensuales basándose en estudiantes filtrados
    this.datosMensualesFiltrados = [];

    for (let mes = 1; mes <= 12; mes++) {
      const datoMes: DatoMensual = {
        mes: mes,
        nombreMes: this.mesesDisponibles[mes - 1].nombre,
        cobrado: 0,
        cobradoAnulado: 0,
        pagado: 0,
        pagadoAnulado: 0,
        saldo: 0,
        porcentajeRecaudo: 0
      };

      // Sumar valores solo de estudiantes filtrados
      this.estudiantesFiltrados.forEach(est => {
        const valoresMes = est.valoresMensuales[mes];
        if (valoresMes) {
          datoMes.cobrado += valoresMes[`Cobrado ${datoMes.nombreMes}`] || 0;
          datoMes.cobradoAnulado += valoresMes[`Cobrado Anulado ${datoMes.nombreMes}`] || 0;
          datoMes.pagado += valoresMes[`Pagado ${datoMes.nombreMes}`] || 0;
          datoMes.pagadoAnulado += valoresMes[`Pagado Anulado ${datoMes.nombreMes}`] || 0;
          datoMes.saldo += valoresMes[`Saldo ${datoMes.nombreMes}`] || 0;
        }
      });

      // Calcular porcentaje de recaudo
      if (datoMes.cobrado > 0) {
        datoMes.porcentajeRecaudo = Math.round((datoMes.pagado / datoMes.cobrado) * 100);
      }

      this.datosMensualesFiltrados.push(datoMes);
    }
  }

  calcularTotalesGeneralesFiltrados(): void {
    // Si no hay filtros, usar totales generales originales
    if (!this.grupoSeleccionado && !this.estadoSeleccionado && !this.busquedaEstudiante) {
      this.calcularTotalesGenerales();
      return;
    }

    // Recalcular totales basándose en estudiantes filtrados
    this.totalesGenerales = {
      totalCobrado: 0,
      totalPagado: 0,
      saldoTotal: 0,
      saldoVencido: 0,
      saldoPendiente: 0,
      cantidadEstudiantes: this.estudiantesFiltrados.length,
      cantidadVencidos: 0,
      porcentajeRecaudo: 0
    };

    this.estudiantesFiltrados.forEach(est => {
      this.totalesGenerales.totalCobrado += est.totalCobrado;
      this.totalesGenerales.totalPagado += est.totalPagado;
      this.totalesGenerales.saldoTotal += est.saldoTotal;
      this.totalesGenerales.saldoVencido += est.saldoVencido;
      this.totalesGenerales.saldoPendiente += est.saldoPendiente;

      if (est.saldoVencido > 0) {
        this.totalesGenerales.cantidadVencidos++;
      }
    });

    if (this.totalesGenerales.totalCobrado > 0) {
      this.totalesGenerales.porcentajeRecaudo = Math.round(
        (this.totalesGenerales.totalPagado / this.totalesGenerales.totalCobrado) * 100
      );
    }
  }

  aplicarFiltros(): void {
    let filtrados = [...this.estudiantes];

    // Filtrar por activos/inactivos
    if (this.filtroActivoEstudiantes === 'activos') {
      filtrados = filtrados.filter(est => est.activo === 1);
    } else if (this.filtroActivoEstudiantes === 'inactivos') {
      filtrados = filtrados.filter(est => est.activo === 0);
    }

    // Filtrar por grupo
    if (this.grupoSeleccionado) {
      const grupoSeleccionado = this.grupos.find(g => g.id.toString() === this.grupoSeleccionado);
      if (grupoSeleccionado) {
        filtrados = filtrados.filter(est => est.grupo_estudiante === grupoSeleccionado.nombre);
      }
    }

    // Filtrar por estado
    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case 'al_dia':
          filtrados = filtrados.filter(est => est.saldoTotal === 0);
          break;
        case 'con_saldo':
          filtrados = filtrados.filter(est => est.saldoTotal > 0);
          break;
        case 'vencido':
          filtrados = filtrados.filter(est => est.saldoVencido > 0);
          break;
      }
    }

    // Filtrar por búsqueda
    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(est =>
        est.nombre_estudiante.toLowerCase().includes(busqueda)
      );
    }

    this.estudiantesFiltrados = filtrados;

    this.aplicarOrdenamiento();
    this.calcularPaginacion();
    this.filtrarTodosLosComponentes();
    this.filtrarMovimientoDiario();
    this.aplicarFiltrosSaldosPendientes();
  }

  aplicarFiltrosColaboradores(): void {
    let filtrados = [...this.colaboradores];

    // Filtrar por activos/inactivos
    if (this.filtroActivoColaboradores === 'activos') {
      filtrados = filtrados.filter(col => col.activo === 1);
    } else if (this.filtroActivoColaboradores === 'inactivos') {
      filtrados = filtrados.filter(col => col.activo === 0);
    }

    // Filtrar por estado
    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case 'al_dia':
          filtrados = filtrados.filter(col => col.saldoTotal === 0);
          break;
        case 'con_saldo':
          filtrados = filtrados.filter(col => col.saldoTotal > 0);
          break;
        case 'vencido':
          filtrados = filtrados.filter(col => col.saldoVencido > 0);
          break;
      }
    }

    // Filtrar por búsqueda
    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(col =>
        col.nombre_estudiante.toLowerCase().includes(busqueda)
      );
    }

    this.colaboradoresFiltrados = filtrados;

    this.aplicarOrdenamientoColaboradores();
    this.calcularPaginacionColaboradores();
    this.aplicarFiltrosSaldosPendientesColaboradores();
  }

  aplicarOrdenamiento(): void {
    const multiplicador = this.ordenAscendente ? 1 : -1;

    this.estudiantesFiltrados.sort((a, b) => {
      let valorA: any = a[this.columnaOrdenamiento as keyof EstudianteCartera];
      let valorB: any = b[this.columnaOrdenamiento as keyof EstudianteCartera];

      // Si es string, convertir a minúsculas para comparación
      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }

      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrdenamiento === columna) {
      // Si es la misma columna, cambiar el orden
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      // Si es una columna diferente, establecer como nueva columna
      this.columnaOrdenamiento = columna;
      // Por defecto, las columnas numéricas ordenan descendente, las de texto ascendente
      this.ordenAscendente = ['nombre_estudiante', 'numero_identificacion', 'grupo_estudiante'].includes(columna);
    }

    this.aplicarOrdenamiento();
  }

  getEstudiantesPaginados(): EstudianteCartera[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return this.estudiantesFiltrados.slice(inicio, fin);
  }

  buscarEstudiante(): void {
    this.aplicarFiltros();
    this.aplicarFiltrosColaboradores();
    this.filtrarTodosLosComponentes();
  }

  resetearFiltros(): void {
    this.grupoSeleccionado = '';
    this.estadoSeleccionado = '';
    this.busquedaEstudiante = '';

    this.inicializarFechasFiltro();

    this.datosClasificacionesFiltradas = [...this.datosClasificaciones];
    this.datosMensualesFiltrados = [...this.datosMensuales];
    this.movimientoDiarioFiltrado = [...this.datosPagosDiarios];

    this.inicializarFechasFiltroAnulados();
    this.anuladosFiltrados = [...this.datosAnulados];
    this.filtroTipoAnuladosIngresos = '';
    this.filtroTipoAnuladosDescuentos = '';
    this.filtroTipoAnuladosExtracurricular = '';

    this.filtrarMovimientoDiario();
    this.filtrarAnulados();
    this.resetearFiltrosProductos();
    this.aplicarFiltros();
    this.aplicarFiltrosColaboradores();
  }

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.estudiantesFiltrados.length / this.registrosPorPagina);
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
  }

  getPaginas(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginas - 1);

    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  getEstadoBadgeClass(estudiante: EstudianteCartera): string {
    if (estudiante.saldoTotal === 0) {
      return 'bg-success';
    } else if (estudiante.saldoVencido > 0) {
      return 'bg-danger';
    } else {
      return 'bg-warning';
    }
  }

  getEstadoTexto(estudiante: EstudianteCartera): string {
    if (estudiante.saldoTotal === 0) {
      return 'Al día';
    } else if (estudiante.saldoVencido > 0) {
      return 'Vencido';
    } else {
      return 'Pendiente';
    }
  }

  verDetalleEstudiante(estudiante: EstudianteCartera): void {
    this.estudianteSeleccionado = estudiante;

    // Generar detalle mensual
    this.detalleEstudianteMensual = [];
    for (let mes = 1; mes <= 12; mes++) {
      const valoresMes = estudiante.valoresMensuales[mes];
      const nombreMes = this.mesesDisponibles[mes - 1].nombre;

      if (valoresMes) {
        this.detalleEstudianteMensual.push({
          mes: nombreMes,
          cobrado: valoresMes[`Cobrado ${nombreMes}`] || 0,
          pagado: valoresMes[`Pagado ${nombreMes}`] || 0,
          saldo: valoresMes[`Saldo ${nombreMes}`] || 0
        });
      }
    }

    // Generar detalle de tipos de pago
    this.detalleEstudianteTiposPago = Object.entries(estudiante.tiposPago)
      .map(([nombre, valor]) => ({
        nombre: nombre.replace('Pago Tipo ', ''),
        valor: valor
      }))
      .filter(tp => tp.valor > 0);

    // Mostrar modal
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDetalleEstudiante'));
    modal.show();
  }

  filtrarMovimientoDiario(): void {
    let filtrados = [...this.datosPagosDiarios];

    // Filtrar por rango de fechas si están seleccionadas
    if (this.fechaInicioSeleccionada) {
      filtrados = filtrados.filter(mov => mov.fecha >= this.fechaInicioSeleccionada);
    }

    if (this.fechaFinSeleccionada) {
      filtrados = filtrados.filter(mov => mov.fecha <= this.fechaFinSeleccionada);
    }

    // NUEVO: Filtrar por grupo y estado si están seleccionados
    if (this.grupoSeleccionado || this.estadoSeleccionado) {
      // Obtener los IDs de personas que cumplen con los filtros de grupo/estado
      const personasFiltradas = new Set(this.estudiantesFiltrados.map(est => est.id_persona));

      // Filtrar movimientos solo para las personas que cumplen los criterios
      filtrados = filtrados.filter(mov => {
        // Si el movimiento tiene id_persona, verificar si está en el conjunto filtrado
        if (mov.id_persona) {
          return personasFiltradas.has(mov.id_persona);
        }
        // Si no tiene id_persona (podría ser un movimiento sin estudiante asociado)
        // decidir si incluirlo o no según tu lógica de negocio
        return false; // o true si quieres incluir movimientos sin estudiante
      });
    }

    this.movimientoDiarioFiltrado = filtrados;

    // Clasificar movimientos y generar tipos únicos
    this.clasificarMovimientosPorTipo();

    // Recalcular paginación
    this.calcularPaginacionMovimientoDiario();
  }
  formatearFecha(fecha: string): string {
    try {
      // IMPORTANTE: Agregar 'T12:00:00' para evitar problemas de timezone
      // Esto asegura que la fecha se interprete al mediodía, evitando cambios de día
      const [year, month, day] = fecha.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

      // Verificar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.error('Fecha inválida:', fecha);
        return fecha;
      }

      // Formatear usando el año, mes y día originales para evitar problemas
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formateando fecha:', fecha, error);
      return fecha;
    }
  }
  calcularPorcentajeRecaudo(clasificacion: ClasificacionCartera): number {
    if (clasificacion.total_cobrado === 0) return 0;
    return Math.round((clasificacion.total_pagado / clasificacion.total_cobrado) * 100);
  }

  calcularPorcentajeRecaudoTotal(): number {
    const totalCobrado = this.getTotalClasificaciones('total_cobrado');
    const totalPagado = this.getTotalClasificaciones('total_pagado');

    if (totalCobrado === 0) return 0;
    return Math.round((totalPagado / totalCobrado) * 100);
  }

  calcularPorcentajeRecaudoAnual(): number {
    const totalCobrado = this.getTotalMensual('cobrado');
    const totalPagado = this.getTotalMensual('pagado');

    if (totalCobrado === 0) return 0;
    return Math.round((totalPagado / totalCobrado) * 100);
  }
  getTotalClasificaciones(campo: string): number {
    // Para los nuevos campos incluyendo saldo_vencido
    if (campo === 'total_cobrado_a_este_mes' ||
      campo === 'total_cobrado_futuro' ||
      campo === 'saldo_vencido') {
      return this.datosClasificacionesFiltradas.reduce((total, clasif) => {
        return total + (clasif[campo as keyof ClasificacionCartera] as number || 0);
      }, 0);
    }

    // Resto del código existente...
    if (!this.grupoSeleccionado && !this.estadoSeleccionado && !this.busquedaEstudiante) {
      switch (campo) {
        case 'total_cobrado':
          return this.totalesGenerales.totalCobrado;
        case 'total_pagado':
          return this.totalesGenerales.totalPagado;
        case 'saldo_total':
          return this.totalesGenerales.saldoTotal;
        default:
          break;
      }
    }

    let total = 0;
    this.estudiantesFiltrados.forEach(est => {
      switch (campo) {
        case 'total_cobrado':
          total += est.totalCobrado;
          break;
        case 'total_pagado':
          total += est.totalPagado;
          break;
        case 'saldo_total':
          total += est.saldoTotal;
          break;
        case 'saldo_vencido':
          total += est.saldoVencido;
          break;
        case 'saldo_pendiente':
          total += est.saldoPendiente;
          break;
      }
    });

    return total;
  }

  getTotalMensual(campo: string): number {
    const datosParaTotal = this.datosMensualesFiltrados.length > 0
      ? this.datosMensualesFiltrados
      : this.datosMensuales;

    return datosParaTotal.reduce((total, mes) => {
      return total + (mes[campo as keyof DatoMensual] as number || 0);
    }, 0);
  }

  generarGraficos(): void {
    this.limpiarGraficos();

    // Asegurar que el DOM esté listo
    setTimeout(() => {
      this.generarGraficoIngresosMensuales();
      this.generarGraficoClasificaciones();
    }, 100);
  }

  limpiarGraficos(): void {
    Object.values(this.charts).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts = {};
  }

  generarGraficoIngresosMensuales(): void {
    const canvas = document.getElementById('graficoIngresosMensuales') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Canvas graficoIngresosMensuales no encontrado');
      return;
    }

    // Destruir gráfico existente si existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('No se pudo obtener el contexto 2D del canvas');
      return;
    }

    // Usar datos filtrados si existen, sino usar datos originales
    const datosParaGrafico = this.datosMensualesFiltrados.length > 0
      ? this.datosMensualesFiltrados
      : this.datosMensuales;

    const labels = datosParaGrafico.map(mes => mes.nombreMes);
    const cobrados = datosParaGrafico.map(mes => mes.cobrado);
    const pagados = datosParaGrafico.map(mes => mes.pagado);

    try {
      this.charts['ingresos'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Cobrado',
              data: cobrados,
              backgroundColor: 'rgba(54, 162, 235, 0.8)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            },
            {
              label: 'Pagado',
              data: pagados,
              backgroundColor: 'rgba(75, 192, 192, 0.8)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(context.parsed.y);
                  }
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 0,
                    notation: 'compact'
                  }).format(value as number);
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al generar gráfico de ingresos mensuales:', error);
    }
  }

  generarGraficoClasificaciones(): void {
    const canvas = document.getElementById('graficoClasificaciones') as HTMLCanvasElement;
    if (!canvas) {
      console.warn('Canvas graficoClasificaciones no encontrado');
      return;
    }

    // Destruir gráfico existente si existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('No se pudo obtener el contexto 2D del canvas');
      return;
    }

    // Usar datos filtrados si existen, sino usar datos originales
    const datosParaGrafico = this.datosClasificacionesFiltradas.length > 0
      ? this.datosClasificacionesFiltradas
      : this.datosClasificaciones;

    const labels = datosParaGrafico.map(c => c.nombre_clasificacion);
    const data = datosParaGrafico.map(c => c.total_cobrado);

    const colores = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)'
    ];

    try {
      this.charts['clasificaciones'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Cobrado',
            data: data,
            backgroundColor: colores,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed !== null) {
                    label += new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0,
                      currencyDisplay: 'narrowSymbol'
                    }).format(context.parsed);
                  }
                  // Agregar porcentaje
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const porcentaje = ((context.parsed / total) * 100).toFixed(1);
                  label += ` (${porcentaje}%)`;
                  return label;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al generar gráfico de clasificaciones:', error);
    }
  }

  // Métodos para saldos pendientes mensuales
  getSaldoPendienteMes(estudiante: EstudianteCartera, mes: number): number {
    const valoresMes = estudiante.valoresMensuales[mes];
    if (!valoresMes) return 0;

    const nombreMes = this.mesesDisponibles[mes - 1].nombre;
    // Solo retornar el saldo si es mayor a 0 (saldo pendiente real)
    const saldo = valoresMes[`Saldo ${nombreMes}`] || 0;
    return saldo > 0 ? saldo : 0;
  }

  calcularTotalSaldoPendienteEstudiante(estudiante: EstudianteCartera): number {
    let total = 0;
    for (let mes = 1; mes <= 12; mes++) {
      total += this.getSaldoPendienteMes(estudiante, mes);
    }
    return total;
  }

  aplicarFiltrosSaldosPendientes(): void {
    let filtrados = [...this.estudiantes];

    // Filtrar por activos/inactivos (filtro propio de este tab)
    if (this.filtroActivoSaldosEstudiantes === 'activos') {
      filtrados = filtrados.filter(est => est.activo === 1);
    } else if (this.filtroActivoSaldosEstudiantes === 'inactivos') {
      filtrados = filtrados.filter(est => est.activo === 0);
    }

    // Aplicar filtros globales de grupo, estado y búsqueda
    if (this.grupoSeleccionado) {
      const grupoSel = this.grupos.find(g => g.id.toString() === this.grupoSeleccionado);
      if (grupoSel) {
        filtrados = filtrados.filter(est => est.grupo_estudiante === grupoSel.nombre);
      }
    }
    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case 'al_dia': filtrados = filtrados.filter(est => est.saldoTotal === 0); break;
        case 'con_saldo': filtrados = filtrados.filter(est => est.saldoTotal > 0); break;
        case 'vencido': filtrados = filtrados.filter(est => est.saldoVencido > 0); break;
      }
    }
    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(est => est.nombre_estudiante.toLowerCase().includes(busqueda));
    }

    let filtradosConSaldo: EstudianteCarteraConSaldoPendiente[] = filtrados.map(est => ({
      ...est,
      totalSaldoPendiente: this.calcularTotalSaldoPendienteEstudiante(est)
    }));

    if (this.mostrarSoloConSaldoPendiente) {
      filtradosConSaldo = filtradosConSaldo.filter(est => est.totalSaldoPendiente > 0);
    }

    this.estudiantesSaldosPendientesFiltrados = filtradosConSaldo;
    this.aplicarOrdenamientoSaldosPendientes();
  }

  ordenarPorSaldosPendientes(columna: string): void {
    if (this.columnaOrdenamientoSaldos === columna) {
      this.ordenAscendenteSaldos = !this.ordenAscendenteSaldos;
    } else {
      this.columnaOrdenamientoSaldos = columna;
      this.ordenAscendenteSaldos = columna === 'nombre_estudiante' || columna === 'grupo_estudiante';
    }

    this.aplicarOrdenamientoSaldosPendientes();
  }

  aplicarOrdenamientoSaldosPendientes(): void {
    const multiplicador = this.ordenAscendenteSaldos ? 1 : -1;

    this.estudiantesSaldosPendientesFiltrados.sort((a, b) => {
      let valorA: any;
      let valorB: any;

      if (this.columnaOrdenamientoSaldos === 'totalSaldoPendiente') {
        valorA = a.totalSaldoPendiente || 0;
        valorB = b.totalSaldoPendiente || 0;
      } else {
        valorA = a[this.columnaOrdenamientoSaldos as keyof EstudianteCartera];
        valorB = b[this.columnaOrdenamientoSaldos as keyof EstudianteCartera];
      }

      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }

      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  getTotalSaldoPendienteMes(mes: number): number {
    return this.estudiantesSaldosPendientesFiltrados.reduce((total, est) => {
      return total + this.getSaldoPendienteMes(est, mes);
    }, 0);
  }

  getTotalSaldosPendientes(): number {
    return this.estudiantesSaldosPendientesFiltrados.reduce((total, est) => {
      return total + (est.totalSaldoPendiente || 0);
    }, 0);
  }

  getEstudiantesConSaldoPendiente(): number {
    return this.estudiantesSaldosPendientesFiltrados.filter(est =>
      (est.totalSaldoPendiente || 0) > 0
    ).length;
  }

  getMesConMayorSaldoPendiente(): string {
    let maxSaldo = 0;
    let mesMax = '';

    this.mesesDisponibles.forEach(mes => {
      const totalMes = this.getTotalSaldoPendienteMes(mes.valor);
      if (totalMes > maxSaldo) {
        maxSaldo = totalMes;
        mesMax = mes.nombre;
      }
    });

    return mesMax || 'N/A';
  }

  getPromedioSaldoPendiente(): number {
    const estudiantesConSaldo = this.getEstudiantesConSaldoPendiente();
    if (estudiantesConSaldo === 0) return 0;

    return this.getTotalSaldosPendientes() / estudiantesConSaldo;
  }

  exportarSaldosPendientesMensuales(): void {
    // Preparar encabezados
    const headers = ['Estudiante', 'Identificación', 'Grupo'];
    this.mesesDisponibles.forEach(mes => {
      headers.push(mes.nombre);
    });
    headers.push('Total');

    // Preparar datos
    const datos = this.estudiantesSaldosPendientesFiltrados.map(est => {
      const fila: any = {
        'Estudiante': est.nombre_estudiante,
        'Identificación': est.numero_identificacion,
        'Grupo': est.grupo_estudiante
      };

      // Agregar saldos por mes
      this.mesesDisponibles.forEach(mes => {
        fila[mes.nombre] = this.getSaldoPendienteMes(est, mes.valor);
      });

      // Agregar total
      fila['Total'] = est.totalSaldoPendiente || 0;

      return fila;
    });

    // Agregar fila de totales
    const totales: any = {
      'Estudiante': 'TOTALES',
      'Identificación': '',
      'Grupo': ''
    };

    this.mesesDisponibles.forEach(mes => {
      totales[mes.nombre] = this.getTotalSaldoPendienteMes(mes.valor);
    });

    totales['Total'] = this.getTotalSaldosPendientes();
    datos.push(totales);

    // Crear libro de Excel
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos Pendientes Mensuales');

    // Agregar hoja de resumen
    const resumenData = [
      ['Concepto', 'Valor'],
      ['Total Estudiantes', this.estudiantesSaldosPendientesFiltrados.length],
      ['Estudiantes con Saldo Pendiente', this.getEstudiantesConSaldoPendiente()],
      ['Total Saldo Pendiente', this.getTotalSaldosPendientes()],
      ['Promedio por Estudiante', this.getPromedioSaldoPendiente()],
      ['Mes con Mayor Saldo', this.getMesConMayorSaldoPendiente()]
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Descargar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `saldos_pendientes_mensuales_${this.anioSeleccionado}_${fecha}.xlsx`);
  }

  // Métodos de exportación
  exportarWhatsApp(): void {
    let mensaje = `*REPORTE DE CARTERA ${this.anioSeleccionado}*\n\n`;
    mensaje += `📅 *Fecha:* ${new Date().toLocaleDateString('es-CO')}\n\n`;

    mensaje += `*RESUMEN GENERAL*\n`;
    mensaje += `💰 *Total Cobrado:* ${this.formatearMoneda(this.totalesGenerales.totalCobrado)}\n`;
    mensaje += `✅ *Total Recaudado:* ${this.formatearMoneda(this.totalesGenerales.totalPagado)}\n`;
    mensaje += `📊 *Saldo Total:* ${this.formatearMoneda(this.totalesGenerales.saldoTotal)}\n`;
    mensaje += `⚠️ *Saldo Vencido:* ${this.formatearMoneda(this.totalesGenerales.saldoVencido)}\n`;
    mensaje += `📈 *% Recaudo:* ${this.totalesGenerales.porcentajeRecaudo}%\n`;
    mensaje += `👥 *Total Estudiantes:* ${this.totalesGenerales.cantidadEstudiantes}\n\n`;

    // Agregar estudiantes con saldo vencido
    const estudiantesVencidos = this.estudiantes.filter(est => est.saldoVencido > 0);
    if (estudiantesVencidos.length > 0) {
      mensaje += `*ESTUDIANTES CON SALDO VENCIDO*\n`;
      estudiantesVencidos.forEach(est => {
        mensaje += `• ${est.nombre_estudiante} - ${this.formatearMoneda(est.saldoVencido)}\n`;
      });
    }

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`;

    // Abrir WhatsApp
    window.open(urlWhatsApp, '_blank');
  }

  exportarCSV(): void {
    // Preparar datos para exportar
    const datosExportar = this.estudiantesFiltrados.map(est => ({
      'Estudiante': est.nombre_estudiante,
      'Identificación': est.numero_identificacion,
      'Grupo': est.grupo_estudiante,
      'Total Cobrado': est.totalCobrado,
      'Total Pagado': est.totalPagado,
      'Saldo Total': est.saldoTotal,
      'Saldo Vencido': est.saldoVencido,
      'Saldo Pendiente': est.saldoPendiente,
      'Estado': this.getEstadoTexto(est)
    }));

    // Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera');

    // Agregar hoja de resumen
    const resumenData = [
      ['Concepto', 'Valor'],
      ['Total Cobrado', this.totalesGenerales.totalCobrado],
      ['Total Recaudado', this.totalesGenerales.totalPagado],
      ['Saldo Total', this.totalesGenerales.saldoTotal],
      ['Saldo Vencido', this.totalesGenerales.saldoVencido],
      ['% Recaudo', this.totalesGenerales.porcentajeRecaudo],
      ['Total Estudiantes', this.totalesGenerales.cantidadEstudiantes],
      ['Estudiantes con Saldo Vencido', this.totalesGenerales.cantidadVencidos]
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Agregar hoja mensual
    const datosMensualesExport = this.datosMensuales.map(mes => ({
      'Mes': mes.nombreMes,
      'Cobrado': mes.cobrado,
      'Pagado': mes.pagado,
      'Saldo': mes.saldo,
      '% Recaudo': mes.porcentajeRecaudo
    }));

    const wsMensual = XLSX.utils.json_to_sheet(datosMensualesExport);
    XLSX.utils.book_append_sheet(wb, wsMensual, 'Mensual');

    // Descargar archivo
    XLSX.writeFile(wb, `cartera_${this.anioSeleccionado}_${new Date().getTime()}.xlsx`);
  }

  exportarDetalleEstudiante(): void {
    if (!this.estudianteSeleccionado) return;

    // Crear datos para Excel
    const datosDetalle: any[] = [];

    // Agregar encabezado
    datosDetalle.push({
      'Campo': 'Estudiante',
      'Valor': this.estudianteSeleccionado.nombre_estudiante
    });
    datosDetalle.push({
      'Campo': 'Identificación',
      'Valor': this.estudianteSeleccionado.numero_identificacion
    });
    datosDetalle.push({
      'Campo': 'Grupo',
      'Valor': this.estudianteSeleccionado.grupo_estudiante
    });
    datosDetalle.push({
      'Campo': 'Total Cobrado',
      'Valor': this.estudianteSeleccionado.totalCobrado
    });
    datosDetalle.push({
      'Campo': 'Total Pagado',
      'Valor': this.estudianteSeleccionado.totalPagado
    });
    datosDetalle.push({
      'Campo': 'Saldo Total',
      'Valor': this.estudianteSeleccionado.saldoTotal
    });
    datosDetalle.push({
      'Campo': 'Saldo Vencido',
      'Valor': this.estudianteSeleccionado.saldoVencido
    });

    // Crear hoja de resumen
    const wsResumen = XLSX.utils.json_to_sheet(datosDetalle);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Agregar detalle mensual
    const detalleMensualExport = this.detalleEstudianteMensual.map(d => ({
      'Mes': d.mes,
      'Cobrado': d.cobrado,
      'Pagado': d.pagado,
      'Saldo': d.saldo
    }));

    const wsMensual = XLSX.utils.json_to_sheet(detalleMensualExport);
    XLSX.utils.book_append_sheet(wb, wsMensual, 'Detalle Mensual');

    // Guardar archivo
    const nombreArchivo = `detalle_${this.estudianteSeleccionado.nombre_estudiante.replace(/ /g, '_')}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol'
    }).format(valor);
  }
  // Método para obtener totales de estudiantes filtrados
  getTotalEstudiantes(campo: string): number {
    // Si hay búsqueda o filtros, usar estudiantes filtrados
    const estudiantesParaTotalizar = this.estudiantesFiltrados.length > 0
      ? this.estudiantesFiltrados
      : this.estudiantes;

    switch (campo) {
      case 'totalCobrado':
        return estudiantesParaTotalizar.reduce((sum, est) => sum + est.totalCobrado, 0);

      case 'totalPagado':
        return estudiantesParaTotalizar.reduce((sum, est) => sum + est.totalPagado, 0);

      case 'saldoTotal':
        return estudiantesParaTotalizar.reduce((sum, est) => sum + est.saldoTotal, 0);

      case 'saldoVencido':
        return estudiantesParaTotalizar.reduce((sum, est) => sum + est.saldoVencido, 0);

      case 'saldoPendiente':
        return estudiantesParaTotalizar.reduce((sum, est) => sum + est.saldoPendiente, 0);

      default:
        return 0;
    }
  }

  // Método para calcular el porcentaje de recaudo de los estudiantes filtrados
  getPorcentajeRecaudoEstudiantes(): number {
    const totalCobrado = this.getTotalEstudiantes('totalCobrado');
    const totalPagado = this.getTotalEstudiantes('totalPagado');

    if (totalCobrado === 0) return 0;

    return Math.round((totalPagado / totalCobrado) * 100);
  }

  // Método adicional para obtener estadísticas de estudiantes
  getEstadisticasEstudiantes(): any {
    const estudiantesParaEstadisticas = this.estudiantesFiltrados.length > 0
      ? this.estudiantesFiltrados
      : this.estudiantes;

    return {
      totalEstudiantes: estudiantesParaEstadisticas.length,
      estudiantesAlDia: estudiantesParaEstadisticas.filter(est => est.saldoTotal === 0).length,
      estudiantesConSaldo: estudiantesParaEstadisticas.filter(est => est.saldoTotal > 0).length,
      estudiantesConSaldoVencido: estudiantesParaEstadisticas.filter(est => est.saldoVencido > 0).length,
      promedioDeuda: estudiantesParaEstadisticas.length > 0
        ? this.getTotalEstudiantes('saldoTotal') / estudiantesParaEstadisticas.length
        : 0,
      promedioSaldoVencido: estudiantesParaEstadisticas.filter(est => est.saldoVencido > 0).length > 0
        ? this.getTotalEstudiantes('saldoVencido') / estudiantesParaEstadisticas.filter(est => est.saldoVencido > 0).length
        : 0
    };
  }
  // Métodos auxiliares para el tab de Movimiento Diario
  getTotalCobrado(): number {
    // Usar movimientoCobros que ya está filtrado
    return this.movimientoCobros.reduce((sum, m) => sum + m.total_cobrado, 0);
  }

  getTotalCantidadCobros(): number {
    return this.movimientoCobros.reduce((sum, m) => sum + m.cantidad_cobros, 0);
  }

  getTotalPagado(): number {
    // Usar movimientoDiarioFiltrado que ya está filtrado por grupo/estado
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago !== 0)
      .reduce((sum, m) => sum + m.total_pagado, 0);
  }

  getTotalCantidadPagos(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago !== 0)
      .reduce((sum, m) => sum + m.cantidad_pagos, 0);
  }

  getBalance(): number {
    return this.getTotalPagado() - this.getTotalCobrado();
  }
  // Total recibido general
  getTotalRecibido(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago !== 0)
      .reduce((sum, m) => sum + (m.total_recibido || 0), 0);
  }


  // Métodos para separar tipos de pagos
  getTotalPagadoEfectivo(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago > 0 && m.id_tipo_pago <= 4) // IDs 1-4 son pagos efectivos
      .reduce((sum, m) => sum + m.total_pagado, 0);
  }

  getTotalRecibidoEfectivo(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago > 0 && m.id_tipo_pago <= 4)
      .reduce((sum, m) => sum + (m.total_recibido || 0), 0);
  }

  getTotalDescuentos(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago === 5 || m.id_tipo_pago === 6) // IDs 5 y 6 son descuentos/castigos
      .reduce((sum, m) => sum + m.total_pagado, 0);
  }

  getCantidadPagosEfectivos(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago > 0 && m.id_tipo_pago <= 4)
      .reduce((sum, m) => sum + m.cantidad_pagos, 0);
  }

  getCantidadDescuentos(): number {
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago === 5 || m.id_tipo_pago === 6)
      .reduce((sum, m) => sum + m.cantidad_pagos, 0);
  }

  // Total recibido real (suma de aplicado + pendiente)
  getTotalRecibidoReal(): number {
    // Suma el total recibido de todos los tipos de pago
    return this.movimientoDiarioFiltrado
      .filter(m => m.id_tipo_pago !== 0) // Excluir cobros
      .reduce((total, m) => total + (m.total_recibido || 0), 0);
  }
  // Métodos para los diferentes tipos de pagos
  getTotalIngresos(): number {
    let ingresos = [...this.movimientoIngresos];
    if (this.filtroTipoIngresos !== '') {
      ingresos = ingresos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
    }
    return ingresos.reduce((sum, m) => sum + m.total_pagado, 0);
  }

  getTotalDescuentosCastigos(): number {
    let descuentos = [...this.movimientoDescuentos];
    if (this.filtroTipoDescuentos !== '') {
      descuentos = descuentos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
    }
    return descuentos.reduce((sum, m) => sum + m.total_pagado, 0);
  }

  getTotalExtracurricular(): number {
    let extracurricular = [...this.movimientoExtracurricular];
    if (this.filtroTipoExtracurricular !== '') {
      extracurricular = extracurricular.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
    }
    return extracurricular.reduce((sum, m) => sum + m.total_pagado, 0);
  }

  obtenerNombreTipoPago(id: number): string {
    const nombres: { [key: number]: string } = {
      1: 'Efectivo',
      2: 'Nequi',
      3: 'Bancolombia',
      4: 'Descuento',
      5: 'Castigo Cartera',
      6: 'Efectivo Extra'
    };
    return nombres[id] || 'Otro';
  }

  getTotalRecibidoIngresos(): number {
    let ingresos = [...this.movimientoIngresos];
    if (this.filtroTipoIngresos !== '') {
      ingresos = ingresos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
    }
    return ingresos.reduce((sum, m) => sum + (m.total_recibido || 0), 0);
  }

  getTotalRecibidoDescuentos(): number {
    let descuentos = [...this.movimientoDescuentos];
    if (this.filtroTipoDescuentos !== '') {
      descuentos = descuentos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
    }
    return descuentos.reduce((sum, m) => sum + (m.total_recibido || 0), 0);
  }

  getTotalRecibidoExtracurricular(): number {
    let extracurricular = [...this.movimientoExtracurricular];
    if (this.filtroTipoExtracurricular !== '') {
      extracurricular = extracurricular.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
    }
    return extracurricular.reduce((sum, m) => sum + (m.total_recibido || 0), 0);
  }

  cambiarPaginaMovimiento(seccion: string, pagina: number): void {
    const config = this.paginacionMovimientoDiario[seccion as keyof typeof this.paginacionMovimientoDiario];
    if (pagina < 1 || pagina > config.totalPaginas) return;
    config.paginaActual = pagina;
  }

  toggleExpansion(seccion: string): void {
    const config = this.paginacionMovimientoDiario[seccion as keyof typeof this.paginacionMovimientoDiario];
    config.expandido = !config.expandido;
  }

  cambiarRegistrosPorPagina(seccion: string, cantidad: number): void {
    const config = this.paginacionMovimientoDiario[seccion as keyof typeof this.paginacionMovimientoDiario];
    config.registrosPorPagina = cantidad;
    this.calcularPaginacionMovimientoDiario();
  }
  // ELIMINAR los métodos duplicados y dejar solo estos:

  tieneDiferenciaRecibidoAplicado(movimiento: PagoDiario): boolean {
    const recibido = movimiento.total_recibido || 0;
    const aplicado = movimiento.total_pagado || 0;
    return recibido !== aplicado;
  }

  getDiferenciaRecibidoAplicado(movimiento: PagoDiario): number {
    const recibido = movimiento.total_recibido || 0;
    const aplicado = movimiento.total_pagado || 0;
    return recibido - aplicado;
  }

  toggleFiltroDiferencia(seccion: 'ingresos' | 'descuentos' | 'extracurricular'): void {
    this.paginacionMovimientoDiario[seccion].soloConDiferencia =
      !this.paginacionMovimientoDiario[seccion].soloConDiferencia;
    this.calcularPaginacionMovimientoDiario();
  }

  // REEMPLAZAR las versiones anteriores con estas que incluyen el filtro:

  getCobrosPaginados(): PagoDiario[] {
    const inicio = (this.paginacionMovimientoDiario.cobros.paginaActual - 1) *
      this.paginacionMovimientoDiario.cobros.registrosPorPagina;
    const fin = inicio + this.paginacionMovimientoDiario.cobros.registrosPorPagina;
    return this.movimientoCobros.slice(inicio, fin);
  }

  getIngresosPaginados(): PagoDiario[] {
    let ingresos = [...this.movimientoIngresos];

    // Convertir a número para la comparación
    if (this.filtroTipoIngresos !== '') {
      ingresos = ingresos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
    }

    if (this.paginacionMovimientoDiario.ingresos.soloConDiferencia) {
      ingresos = ingresos.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }

    const inicio = (this.paginacionMovimientoDiario.ingresos.paginaActual - 1) *
      this.paginacionMovimientoDiario.ingresos.registrosPorPagina;
    const fin = inicio + this.paginacionMovimientoDiario.ingresos.registrosPorPagina;
    return ingresos.slice(inicio, fin);
  }

  getDescuentosPaginados(): PagoDiario[] {
    let descuentos = [...this.movimientoDescuentos];

    // Convertir a número para la comparación
    if (this.filtroTipoDescuentos !== '') {
      descuentos = descuentos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
    }

    if (this.paginacionMovimientoDiario.descuentos.soloConDiferencia) {
      descuentos = descuentos.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }

    const inicio = (this.paginacionMovimientoDiario.descuentos.paginaActual - 1) *
      this.paginacionMovimientoDiario.descuentos.registrosPorPagina;
    const fin = inicio + this.paginacionMovimientoDiario.descuentos.registrosPorPagina;
    return descuentos.slice(inicio, fin);
  }

  getExtracurricularPaginados(): PagoDiario[] {
    let extracurricular = [...this.movimientoExtracurricular];

    // Convertir a número para la comparación
    if (this.filtroTipoExtracurricular !== '') {
      extracurricular = extracurricular.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
    }

    if (this.paginacionMovimientoDiario.extracurricular.soloConDiferencia) {
      extracurricular = extracurricular.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }

    const inicio = (this.paginacionMovimientoDiario.extracurricular.paginaActual - 1) *
      this.paginacionMovimientoDiario.extracurricular.registrosPorPagina;
    const fin = inicio + this.paginacionMovimientoDiario.extracurricular.registrosPorPagina;
    return extracurricular.slice(inicio, fin);
  }

  calcularPaginacionMovimientoDiario(): void {
    // Cobros - usando array global
    this.paginacionMovimientoDiario.cobros.totalPaginas = Math.ceil(
      this.movimientoCobros.length / this.paginacionMovimientoDiario.cobros.registrosPorPagina
    );
    this.paginacionMovimientoDiario.cobros.paginaActual = 1;

    // Ingresos - usando array global con filtros aplicados
    let ingresosFiltrados = [...this.movimientoIngresos];
    if (this.filtroTipoIngresos !== '') {
      ingresosFiltrados = ingresosFiltrados.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
    }
    if (this.paginacionMovimientoDiario.ingresos.soloConDiferencia) {
      ingresosFiltrados = ingresosFiltrados.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }
    this.paginacionMovimientoDiario.ingresos.totalPaginas = Math.ceil(
      ingresosFiltrados.length / this.paginacionMovimientoDiario.ingresos.registrosPorPagina
    );

    // Descuentos - usando array global con filtros aplicados
    let descuentosFiltrados = [...this.movimientoDescuentos];
    if (this.filtroTipoDescuentos !== '') {
      descuentosFiltrados = descuentosFiltrados.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
    }
    if (this.paginacionMovimientoDiario.descuentos.soloConDiferencia) {
      descuentosFiltrados = descuentosFiltrados.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }
    this.paginacionMovimientoDiario.descuentos.totalPaginas = Math.ceil(
      descuentosFiltrados.length / this.paginacionMovimientoDiario.descuentos.registrosPorPagina
    );

    // Extracurricular - usando array global con filtros aplicados
    let extracurricularFiltrados = [...this.movimientoExtracurricular];
    if (this.filtroTipoExtracurricular !== '') {
      extracurricularFiltrados = extracurricularFiltrados.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
    }
    if (this.paginacionMovimientoDiario.extracurricular.soloConDiferencia) {
      extracurricularFiltrados = extracurricularFiltrados.filter(m => this.tieneDiferenciaRecibidoAplicado(m));
    }
    this.paginacionMovimientoDiario.extracurricular.totalPaginas = Math.ceil(
      extracurricularFiltrados.length / this.paginacionMovimientoDiario.extracurricular.registrosPorPagina
    );
  }

  getCantidadConDiferencia(tipo: 'ingresos' | 'descuentos' | 'extracurricular'): number {
    let movimientos: PagoDiario[] = [];

    switch (tipo) {
      case 'ingresos':
        movimientos = [...this.movimientoIngresos];
        if (this.filtroTipoIngresos !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
        }
        break;
      case 'descuentos':
        movimientos = [...this.movimientoDescuentos];
        if (this.filtroTipoDescuentos !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
        }
        break;
      case 'extracurricular':
        movimientos = [...this.movimientoExtracurricular];
        if (this.filtroTipoExtracurricular !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
        }
        break;
    }

    return movimientos.filter(m => this.tieneDiferenciaRecibidoAplicado(m)).length;
  }


  getTotalDiferencia(tipo: 'ingresos' | 'descuentos' | 'extracurricular'): number {
    let movimientos: PagoDiario[] = [];

    switch (tipo) {
      case 'ingresos':
        movimientos = [...this.movimientoIngresos];
        if (this.filtroTipoIngresos !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
        }
        break;
      case 'descuentos':
        movimientos = [...this.movimientoDescuentos];
        if (this.filtroTipoDescuentos !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
        }
        break;
      case 'extracurricular':
        movimientos = [...this.movimientoExtracurricular];
        if (this.filtroTipoExtracurricular !== '') {
          movimientos = movimientos.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
        }
        break;
    }

    return movimientos.reduce((total, m) => total + this.getDiferenciaRecibidoAplicado(m), 0);
  }
  /**
 * Inicializa las fechas de filtro con el primer día del mes actual y hoy
 */
  private inicializarFechasFiltro(): void {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    // Formatear las fechas a formato YYYY-MM-DD para el input date
    this.fechaInicioSeleccionada = this.formatearFechaParaInput(primerDiaMes);
    this.fechaFinSeleccionada = this.formatearFechaParaInput(hoy);
  }
  /**
   * Formatea una fecha para usar en input type="date"
   */
  private formatearFechaParaInput(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }
  // Método para clasificar movimientos por tipo
  private clasificarMovimientosPorTipo(): void {
    // Clasificar movimientos en arrays globales
    this.movimientoCobros = this.movimientoDiarioFiltrado.filter(m => m.id_tipo_pago === 0);
    this.movimientoIngresos = this.movimientoDiarioFiltrado.filter(m => m.id_tipo_pago >= 1 && m.id_tipo_pago <= 3);
    this.movimientoDescuentos = this.movimientoDiarioFiltrado.filter(m => m.id_tipo_pago === 4 || m.id_tipo_pago === 5);
    this.movimientoExtracurricular = this.movimientoDiarioFiltrado.filter(m => m.id_tipo_pago === 6);

    // Generar tipos únicos desde los arrays clasificados
    this.generarTiposUnicos();
  }

  // Método para generar tipos únicos desde los arrays clasificados
  private generarTiposUnicos(): void {
    // Obtener tipos únicos de ingresos
    const tiposIngresosSet = new Set<number>();
    this.movimientoIngresos.forEach(m => tiposIngresosSet.add(m.id_tipo_pago));

    this.tiposIngresos = Array.from(tiposIngresosSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));

    // Obtener tipos únicos de descuentos
    const tiposDescuentosSet = new Set<number>();
    this.movimientoDescuentos.forEach(m => tiposDescuentosSet.add(m.id_tipo_pago));

    this.tiposDescuentos = Array.from(tiposDescuentosSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));

    // Obtener tipos únicos de extracurricular
    const tiposExtracurricularSet = new Set<number>();
    this.movimientoExtracurricular.forEach(m => tiposExtracurricularSet.add(m.id_tipo_pago));

    this.tiposExtracurricular = Array.from(tiposExtracurricularSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));

    // Limpiar filtros si el tipo seleccionado ya no existe
    if (this.filtroTipoIngresos && !tiposIngresosSet.has(this.filtroTipoIngresos as number)) {
      this.filtroTipoIngresos = '';
    }
    if (this.filtroTipoDescuentos && !tiposDescuentosSet.has(this.filtroTipoDescuentos as number)) {
      this.filtroTipoDescuentos = '';
    }
    if (this.filtroTipoExtracurricular && !tiposExtracurricularSet.has(this.filtroTipoExtracurricular as number)) {
      this.filtroTipoExtracurricular = '';
    }
  }
  cambiarFiltroTipo(seccion: 'ingresos' | 'descuentos' | 'extracurricular'): void {
    this.paginacionMovimientoDiario[seccion].paginaActual = 1;
    this.calcularPaginacionMovimientoDiario();
  }
  private obtenerPersonasFiltradas(): Set<number> {
    let filtrados = [...this.estudiantes];

    // Aplicar los mismos filtros que en aplicarFiltros()
    if (this.grupoSeleccionado) {
      const grupoSeleccionado = this.grupos.find(g => g.id.toString() === this.grupoSeleccionado);
      if (grupoSeleccionado) {
        filtrados = filtrados.filter(est => est.grupo_estudiante === grupoSeleccionado.nombre);
      }
    }

    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case 'al_dia':
          filtrados = filtrados.filter(est => est.saldoTotal === 0);
          break;
        case 'con_saldo':
          filtrados = filtrados.filter(est => est.saldoTotal > 0);
          break;
        case 'vencido':
          filtrados = filtrados.filter(est => est.saldoVencido > 0);
          break;
      }
    }

    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(est =>
        est.nombre_estudiante.toLowerCase().includes(busqueda)
      );
    }

    return new Set(filtrados.map(est => est.id_persona));
  }
  private movimientoPerteneceAEstudianteFiltrado(movimiento: PagoDiario): boolean {
    if (!movimiento.id_persona) {
      // Si no tiene id_persona, decidir si incluirlo
      return false; // o true según tu lógica
    }

    // Verificar si el id_persona está en la lista de estudiantes filtrados
    return this.estudiantesFiltrados.some(est => est.id_persona === movimiento.id_persona);
  }


  obtenerNombreClasificacion(idClasificacion: number): string {
    const clasificacion = this.datosClasificaciones.find(c => c.id_clasificacion === idClasificacion);
    return clasificacion ? clasificacion.nombre_clasificacion : 'Sin clasificación';
  }

  actualizarFiltrosProductos(): void {
    // Obtener clasificaciones únicas
    const clasificacionesSet = new Set<string>();
    this.datosProductos.forEach(producto => {
      clasificacionesSet.add(JSON.stringify({
        id: producto.id_clasificacion.toString(),
        nombre: producto.nombre_clasificacion
      }));
    });

    this.clasificacionesUnicasProductos = Array.from(clasificacionesSet)
      .map(item => JSON.parse(item))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Obtener productos únicos
    const productosSet = new Set<string>();
    this.datosProductos.forEach(producto => {
      productosSet.add(JSON.stringify({
        id: producto.id_producto.toString(),
        nombre: producto.nombre_producto
      }));
    });

    this.productosUnicos = Array.from(productosSet)
      .map(item => JSON.parse(item))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  agruparProductosPorClasificacion(): void {
    this.datosProductosAgrupados.clear();

    this.datosProductosFiltrados.forEach(producto => {
      const clasificacion = producto.nombre_clasificacion;
      if (!this.datosProductosAgrupados.has(clasificacion)) {
        this.datosProductosAgrupados.set(clasificacion, []);
      }
      this.datosProductosAgrupados.get(clasificacion)!.push(producto);
    });
  }

  filtrarProductos(): void {
    let filtrados = [...this.datosProductos];

    // Filtrar por clasificación seleccionada
    if (this.clasificacionSeleccionadaProductos) {
      filtrados = filtrados.filter(producto =>
        producto.id_clasificacion.toString() === this.clasificacionSeleccionadaProductos
      );
    }

    // Filtrar por productos seleccionados (MÚLTIPLES)
    if (this.productosSeleccionados && this.productosSeleccionados.length > 0) {
      filtrados = filtrados.filter(producto =>
        this.productosSeleccionados.includes(producto.id_producto.toString())
      );
    }

    // Si hay filtros de grupo o estado aplicados
    if (this.grupoSeleccionado || this.estadoSeleccionado || this.busquedaEstudiante) {
      // Los datos ya vienen correctos del backend
    }

    this.datosProductosFiltrados = filtrados;
    this.agruparProductosPorClasificacion();
  }

  resetearFiltrosProductos(): void {
    this.clasificacionSeleccionadaProductos = '';
    this.productosSeleccionados = []; // Cambiar a array vacío
    this.filtrarProductos();
  }


  getSubtotalClasificacionProductos(nombreClasificacion: string, campo: string): number {
    const productos = this.datosProductosAgrupados.get(nombreClasificacion) || [];

    switch (campo) {
      case 'total_cobrado':
        return productos.reduce((sum, p) => sum + p.total_cobrado, 0);
      case 'total_cobrado_a_este_mes':
        return productos.reduce((sum, p) => sum + p.total_cobrado_a_este_mes, 0);
      case 'total_cobrado_futuro':
        return productos.reduce((sum, p) => sum + p.total_cobrado_futuro, 0);
      case 'total_pagado':
        return productos.reduce((sum, p) => sum + p.total_pagado, 0);
      case 'saldo_total':
        return productos.reduce((sum, p) => sum + p.saldo_total, 0);
      case 'saldo_vencido':
        return productos.reduce((sum, p) => sum + p.saldo_vencido, 0);
      case 'cantidad_estudiantes':
        return productos.reduce((sum, p) => sum + p.cantidad_estudiantes, 0);
      case 'porcentaje_recaudo':
        const totalCobrado = this.getSubtotalClasificacionProductos(nombreClasificacion, 'total_cobrado');
        const totalPagado = this.getSubtotalClasificacionProductos(nombreClasificacion, 'total_pagado');
        return totalCobrado > 0 ? Math.round((totalPagado / totalCobrado) * 100) : 0;
      default:
        return 0;
    }
  }

  getTotalProductos(campo: string): number {
    switch (campo) {
      case 'total_cobrado':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.total_cobrado, 0);
      case 'total_cobrado_a_este_mes':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.total_cobrado_a_este_mes, 0);
      case 'total_cobrado_futuro':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.total_cobrado_futuro, 0);
      case 'total_pagado':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.total_pagado, 0);
      case 'saldo_total':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.saldo_total, 0);
      case 'saldo_vencido':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.saldo_vencido, 0);
      case 'cantidad_estudiantes':
        return this.datosProductosFiltrados.reduce((sum, p) => sum + p.cantidad_estudiantes, 0);
      case 'porcentaje_recaudo':
        const totalCobrado = this.getTotalProductos('total_cobrado');
        const totalPagado = this.getTotalProductos('total_pagado');
        return totalCobrado > 0 ? Math.round((totalPagado / totalCobrado) * 100) : 0;
      default:
        return 0;
    }
  }

  getProductoConMayorCobro(): string {
    if (this.datosProductosFiltrados.length === 0) return 'N/A';

    const producto = this.datosProductosFiltrados.reduce((prev, current) =>
      (prev.total_cobrado > current.total_cobrado) ? prev : current
    );

    return producto.nombre_producto;
  }

  getProductoConMayorMorosidad(): string {
    if (this.datosProductosFiltrados.length === 0) return 'N/A';

    const producto = this.datosProductosFiltrados.reduce((prev, current) =>
      (prev.saldo_vencido > current.saldo_vencido) ? prev : current
    );

    return producto.nombre_producto;
  }

  exportarProductosExcel(): void {
    const datosExportar: any[] = [];

    // PARTE NUEVA: Agregar información de filtros aplicados (OPCIONAL)
    if (this.productosSeleccionados.length > 0) {
      const productosSeleccionadosNombres = this.productosUnicos
        .filter(p => this.productosSeleccionados.includes(p.id))
        .map(p => p.nombre)
        .join(', ');

      datosExportar.push({
        'Producto': 'FILTROS APLICADOS',
        'Clasificación': '',
        'Total Cobrado': '',
        'Cobrado a Este Mes': '',
        'Cobrado Futuro': '',
        'Total Pagado': '',
        'Saldo Total': '',
        'Saldo Vencido': '',
        '% Recaudo': '',
        'Cant. Estudiantes': ''
      });

      datosExportar.push({
        'Producto': `Productos seleccionados: ${productosSeleccionadosNombres}`,
        'Clasificación': '',
        'Total Cobrado': '',
        'Cobrado a Este Mes': '',
        'Cobrado Futuro': '',
        'Total Pagado': '',
        'Saldo Total': '',
        'Saldo Vencido': '',
        '% Recaudo': '',
        'Cant. Estudiantes': ''
      });

      datosExportar.push({}); // Línea vacía
    }

    // CÓDIGO ORIGINAL (ya existente en tu archivo):
    this.datosProductosAgrupados.forEach((productos, clasificacion) => {
      // Agregar header de clasificación
      datosExportar.push({
        'Producto': `CLASIFICACIÓN: ${clasificacion}`,
        'Clasificación': '',
        'Total Cobrado': '',
        'Cobrado a Este Mes': '',
        'Cobrado Futuro': '',
        'Total Pagado': '',
        'Saldo Total': '',
        'Saldo Vencido': '',
        '% Recaudo': '',
        'Cant. Estudiantes': ''
      });

      // Agregar productos
      productos.forEach(producto => {
        datosExportar.push({
          'Producto': producto.nombre_producto,
          'Clasificación': producto.nombre_clasificacion,
          'Total Cobrado': producto.total_cobrado,
          'Cobrado a Este Mes': producto.total_cobrado_a_este_mes,
          'Cobrado Futuro': producto.total_cobrado_futuro,
          'Total Pagado': producto.total_pagado,
          'Saldo Total': producto.saldo_total,
          'Saldo Vencido': producto.saldo_vencido,
          '% Recaudo': producto.porcentaje_recaudo,
          'Cant. Estudiantes': producto.cantidad_estudiantes
        });
      });

      // Agregar subtotal
      datosExportar.push({
        'Producto': `Subtotal ${clasificacion}`,
        'Clasificación': '',
        'Total Cobrado': this.getSubtotalClasificacionProductos(clasificacion, 'total_cobrado'),
        'Cobrado a Este Mes': this.getSubtotalClasificacionProductos(clasificacion, 'total_cobrado_a_este_mes'),
        'Cobrado Futuro': this.getSubtotalClasificacionProductos(clasificacion, 'total_cobrado_futuro'),
        'Total Pagado': this.getSubtotalClasificacionProductos(clasificacion, 'total_pagado'),
        'Saldo Total': this.getSubtotalClasificacionProductos(clasificacion, 'saldo_total'),
        'Saldo Vencido': this.getSubtotalClasificacionProductos(clasificacion, 'saldo_vencido'),
        '% Recaudo': this.getSubtotalClasificacionProductos(clasificacion, 'porcentaje_recaudo'),
        'Cant. Estudiantes': this.getSubtotalClasificacionProductos(clasificacion, 'cantidad_estudiantes')
      });

      // Línea vacía
      datosExportar.push({});
    });

    // Agregar total general
    datosExportar.push({
      'Producto': 'TOTAL GENERAL',
      'Clasificación': '',
      'Total Cobrado': this.getTotalProductos('total_cobrado'),
      'Cobrado a Este Mes': this.getTotalProductos('total_cobrado_a_este_mes'),
      'Cobrado Futuro': this.getTotalProductos('total_cobrado_futuro'),
      'Total Pagado': this.getTotalProductos('total_pagado'),
      'Saldo Total': this.getTotalProductos('saldo_total'),
      'Saldo Vencido': this.getTotalProductos('saldo_vencido'),
      '% Recaudo': this.getTotalProductos('porcentaje_recaudo'),
      'Cant. Estudiantes': this.getTotalProductos('cantidad_estudiantes')
    });

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `productos_cartera_${this.anioSeleccionado}_${fecha}.xlsx`);
  }
  toggleProducto(idProducto: string): void {
    const index = this.productosSeleccionados.indexOf(idProducto);
    if (index > -1) {
      this.productosSeleccionados.splice(index, 1);
    } else {
      this.productosSeleccionados.push(idProducto);
    }
    this.filtrarProductos();
  }

  toggleTodosProductos(event: any): void {
    if (event.target.checked) {
      this.productosSeleccionados = this.productosUnicos.map(p => p.id);
    } else {
      this.productosSeleccionados = [];
    }
    this.filtrarProductos();
  }

  productosUnicosFiltrados(): any[] {
    if (!this.busquedaProducto) {
      return this.productosUnicos;
    }
    const busqueda = this.busquedaProducto.toLowerCase();
    return this.productosUnicos.filter(p =>
      p.nombre.toLowerCase().includes(busqueda)
    );
  }
  toggleDropdownProductos(): void {
    this.dropdownProductosAbierto = !this.dropdownProductosAbierto;
  }


  // Métodos para inicializar fechas de anulados
  private inicializarFechasFiltroAnulados(): void {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    this.fechaInicioAnulacion = this.formatearFechaParaInput(primerDiaMes);
    this.fechaFinAnulacion = this.formatearFechaParaInput(hoy);
  }

  // Clasificar anulados por tipo
  private clasificarAnuladosPorTipo(): void {
    // Filtrar cobros anulados
    this.anuladosCobros = this.anuladosFiltrados.filter(m =>
      m.tipo_movimiento === 'COBRO'
    );

    // Filtrar pagos anulados por tipo
    const pagosAnulados = this.anuladosFiltrados.filter(m =>
      m.tipo_movimiento === 'PAGO'
    );

    // Clasificar pagos anulados
    this.anuladosIngresos = pagosAnulados.filter(m =>
      m.id_tipo_pago >= 1 && m.id_tipo_pago <= 3
    );
    this.anuladosDescuentos = pagosAnulados.filter(m =>
      m.id_tipo_pago === 4 || m.id_tipo_pago === 5
    );
    this.anuladosExtracurricular = pagosAnulados.filter(m =>
      m.id_tipo_pago === 6
    );

    // Generar tipos únicos
    this.generarTiposUnicosAnulados();
  }

  // Generar tipos únicos para anulados
  private generarTiposUnicosAnulados(): void {
    // Tipos únicos de ingresos anulados
    const tiposIngresosSet = new Set<number>();
    this.anuladosIngresos.forEach(m => tiposIngresosSet.add(m.id_tipo_pago));

    this.tiposAnuladosIngresos = Array.from(tiposIngresosSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));

    // Tipos únicos de descuentos anulados
    const tiposDescuentosSet = new Set<number>();
    this.anuladosDescuentos.forEach(m => tiposDescuentosSet.add(m.id_tipo_pago));

    this.tiposAnuladosDescuentos = Array.from(tiposDescuentosSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));

    // Tipos únicos de extracurricular anulados
    const tiposExtracurricularSet = new Set<number>();
    this.anuladosExtracurricular.forEach(m => tiposExtracurricularSet.add(m.id_tipo_pago));

    this.tiposAnuladosExtracurricular = Array.from(tiposExtracurricularSet)
      .sort((a, b) => a - b)
      .map(id => ({
        id: id,
        nombre: this.obtenerNombreTipoPago(id)
      }));
  }

  // Filtrar anulados
  filtrarAnulados(): void {
    let filtrados = [...this.datosAnulados];

    // Filtrar por fecha de anulación
    if (this.fechaInicioAnulacion) {
      filtrados = filtrados.filter(mov =>
        mov.fecha_anulacion >= this.fechaInicioAnulacion
      );
    }

    if (this.fechaFinAnulacion) {
      filtrados = filtrados.filter(mov =>
        mov.fecha_anulacion <= this.fechaFinAnulacion
      );
    }

    // Aplicar filtros de grupo y estado si están activos
    if (this.grupoSeleccionado || this.estadoSeleccionado) {
      const personasFiltradas = new Set(this.estudiantesFiltrados.map(est => est.id_persona));

      filtrados = filtrados.filter(mov => {
        if (mov.id_persona) {
          return personasFiltradas.has(mov.id_persona);
        }
        return false;
      });
    }

    this.anuladosFiltrados = filtrados;

    // Reclasificar con datos filtrados
    this.clasificarAnuladosPorTipo();

    // Recalcular paginación
    this.calcularPaginacionAnulados();
  }

  // Calcular paginación para anulados
  calcularPaginacionAnulados(): void {
    // Cobros anulados
    this.paginacionAnulados.cobros.totalPaginas = Math.ceil(
      this.anuladosCobros.length / this.paginacionAnulados.cobros.registrosPorPagina
    );
    this.paginacionAnulados.cobros.paginaActual = 1;

    // Ingresos anulados con filtros
    let ingresosFiltrados = [...this.anuladosIngresos];
    if (this.filtroTipoAnuladosIngresos !== '') {
      ingresosFiltrados = ingresosFiltrados.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosIngresos)
      );
    }
    this.paginacionAnulados.ingresos.totalPaginas = Math.ceil(
      ingresosFiltrados.length / this.paginacionAnulados.ingresos.registrosPorPagina
    );

    // Descuentos anulados con filtros
    let descuentosFiltrados = [...this.anuladosDescuentos];
    if (this.filtroTipoAnuladosDescuentos !== '') {
      descuentosFiltrados = descuentosFiltrados.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosDescuentos)
      );
    }
    this.paginacionAnulados.descuentos.totalPaginas = Math.ceil(
      descuentosFiltrados.length / this.paginacionAnulados.descuentos.registrosPorPagina
    );

    // Extracurricular anulados con filtros
    let extracurricularFiltrados = [...this.anuladosExtracurricular];
    if (this.filtroTipoAnuladosExtracurricular !== '') {
      extracurricularFiltrados = extracurricularFiltrados.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosExtracurricular)
      );
    }
    this.paginacionAnulados.extracurricular.totalPaginas = Math.ceil(
      extracurricularFiltrados.length / this.paginacionAnulados.extracurricular.registrosPorPagina
    );
  }

  // Métodos de paginación para anulados
  getCobrosAnuladosPaginados(): MovimientoAnulado[] {
    const inicio = (this.paginacionAnulados.cobros.paginaActual - 1) *
      this.paginacionAnulados.cobros.registrosPorPagina;
    const fin = inicio + this.paginacionAnulados.cobros.registrosPorPagina;
    return this.anuladosCobros.slice(inicio, fin);
  }

  getIngresosAnuladosPaginados(): MovimientoAnulado[] {
    let ingresos = [...this.anuladosIngresos];

    if (this.filtroTipoAnuladosIngresos !== '') {
      ingresos = ingresos.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosIngresos)
      );
    }

    const inicio = (this.paginacionAnulados.ingresos.paginaActual - 1) *
      this.paginacionAnulados.ingresos.registrosPorPagina;
    const fin = inicio + this.paginacionAnulados.ingresos.registrosPorPagina;
    return ingresos.slice(inicio, fin);
  }

  getDescuentosAnuladosPaginados(): MovimientoAnulado[] {
    let descuentos = [...this.anuladosDescuentos];

    if (this.filtroTipoAnuladosDescuentos !== '') {
      descuentos = descuentos.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosDescuentos)
      );
    }

    const inicio = (this.paginacionAnulados.descuentos.paginaActual - 1) *
      this.paginacionAnulados.descuentos.registrosPorPagina;
    const fin = inicio + this.paginacionAnulados.descuentos.registrosPorPagina;
    return descuentos.slice(inicio, fin);
  }

  getExtracurricularAnuladosPaginados(): MovimientoAnulado[] {
    let extracurricular = [...this.anuladosExtracurricular];

    if (this.filtroTipoAnuladosExtracurricular !== '') {
      extracurricular = extracurricular.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosExtracurricular)
      );
    }

    const inicio = (this.paginacionAnulados.extracurricular.paginaActual - 1) *
      this.paginacionAnulados.extracurricular.registrosPorPagina;
    const fin = inicio + this.paginacionAnulados.extracurricular.registrosPorPagina;
    return extracurricular.slice(inicio, fin);
  }

  // Métodos de totales para anulados
  getTotalCobrosAnulados(): number {
    return this.anuladosCobros.reduce((sum, m) => sum + m.valor_anulado, 0);
  }

  getTotalCantidadCobrosAnulados(): number {
    return this.anuladosCobros.reduce((sum, m) => sum + m.cantidad_anulaciones, 0);
  }

  getTotalIngresosAnulados(): number {
    let ingresos = [...this.anuladosIngresos];
    if (this.filtroTipoAnuladosIngresos !== '') {
      ingresos = ingresos.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosIngresos)
      );
    }
    return ingresos.reduce((sum, m) => sum + m.valor_anulado, 0);
  }

  getTotalDescuentosAnulados(): number {
    let descuentos = [...this.anuladosDescuentos];
    if (this.filtroTipoAnuladosDescuentos !== '') {
      descuentos = descuentos.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosDescuentos)
      );
    }
    return descuentos.reduce((sum, m) => sum + m.valor_anulado, 0);
  }

  getTotalExtracurricularAnulados(): number {
    let extracurricular = [...this.anuladosExtracurricular];
    if (this.filtroTipoAnuladosExtracurricular !== '') {
      extracurricular = extracurricular.filter(m =>
        m.id_tipo_pago === Number(this.filtroTipoAnuladosExtracurricular)
      );
    }
    return extracurricular.reduce((sum, m) => sum + m.valor_anulado, 0);
  }

  getTotalPagosAnulados(): number {
    return this.getTotalIngresosAnulados() +
      this.getTotalDescuentosAnulados() +
      this.getTotalExtracurricularAnulados();
  }

  // Control de expansión/contracción
  toggleExpansionAnulado(seccion: string): void {
    const config = this.paginacionAnulados[seccion as keyof typeof this.paginacionAnulados];
    config.expandido = !config.expandido;
  }

  cambiarPaginaAnulado(seccion: string, pagina: number): void {
    const config = this.paginacionAnulados[seccion as keyof typeof this.paginacionAnulados];
    if (pagina < 1 || pagina > config.totalPaginas) return;
    config.paginaActual = pagina;
  }

  cambiarRegistrosPorPaginaAnulado(seccion: string, cantidad: number): void {
    const config = this.paginacionAnulados[seccion as keyof typeof this.paginacionAnulados];
    config.registrosPorPagina = cantidad;
    this.calcularPaginacionAnulados();
  }

  cambiarFiltroTipoAnulado(seccion: 'ingresos' | 'descuentos' | 'extracurricular'): void {
    this.paginacionAnulados[seccion].paginaActual = 1;
    this.calcularPaginacionAnulados();
  }

  // =====================================================
  // MÉTODOS PARA COLABORADORES
  // =====================================================

  aplicarOrdenamientoColaboradores(): void {
    const multiplicador = this.ordenAscendenteColaboradores ? 1 : -1;
    this.colaboradoresFiltrados.sort((a, b) => {
      let valorA: any = a[this.columnaOrdenamientoColaboradores as keyof EstudianteCartera];
      let valorB: any = b[this.columnaOrdenamientoColaboradores as keyof EstudianteCartera];
      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }
      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  ordenarPorColaboradores(columna: string): void {
    if (this.columnaOrdenamientoColaboradores === columna) {
      this.ordenAscendenteColaboradores = !this.ordenAscendenteColaboradores;
    } else {
      this.columnaOrdenamientoColaboradores = columna;
      this.ordenAscendenteColaboradores = ['nombre_estudiante', 'numero_identificacion', 'grupo_estudiante'].includes(columna);
    }
    this.aplicarOrdenamientoColaboradores();
  }

  calcularPaginacionColaboradores(): void {
    this.totalPaginasColaboradores = Math.ceil(this.colaboradoresFiltrados.length / this.registrosPorPagina);
    this.paginaActualColaboradores = 1;
  }

  cambiarPaginaColaboradores(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginasColaboradores) return;
    this.paginaActualColaboradores = pagina;
  }

  getPaginasColaboradores(): number[] {
    const paginas: number[] = [];
    const maxPaginas = 5;
    let inicio = Math.max(1, this.paginaActualColaboradores - Math.floor(maxPaginas / 2));
    let fin = Math.min(this.totalPaginasColaboradores, inicio + maxPaginas - 1);
    if (fin - inicio < maxPaginas - 1) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  }

  getColaboradoresPaginados(): EstudianteCartera[] {
    const inicio = (this.paginaActualColaboradores - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return this.colaboradoresFiltrados.slice(inicio, fin);
  }

  getTotalColaboradores(campo: string): number {
    const datos = this.colaboradoresFiltrados;
    switch (campo) {
      case 'totalCobrado': return datos.reduce((sum, c) => sum + c.totalCobrado, 0);
      case 'totalPagado': return datos.reduce((sum, c) => sum + c.totalPagado, 0);
      case 'saldoTotal': return datos.reduce((sum, c) => sum + c.saldoTotal, 0);
      case 'saldoVencido': return datos.reduce((sum, c) => sum + c.saldoVencido, 0);
      case 'saldoPendiente': return datos.reduce((sum, c) => sum + c.saldoPendiente, 0);
      default: return 0;
    }
  }

  getPorcentajeRecaudoColaboradores(): number {
    const totalCobrado = this.getTotalColaboradores('totalCobrado');
    const totalPagado = this.getTotalColaboradores('totalPagado');
    if (totalCobrado === 0) return 0;
    return Math.round((totalPagado / totalCobrado) * 100);
  }

  verDetalleColaborador(colaborador: EstudianteCartera): void {
    this.verDetalleEstudiante(colaborador);
  }

  // =====================================================
  // SALDOS PENDIENTES COLABORADORES
  // =====================================================

  aplicarFiltrosSaldosPendientesColaboradores(): void {
    let filtrados = [...this.colaboradores];

    // Filtrar por activos/inactivos (filtro propio de este tab)
    if (this.filtroActivoSaldosColaboradores === 'activos') {
      filtrados = filtrados.filter(col => col.activo === 1);
    } else if (this.filtroActivoSaldosColaboradores === 'inactivos') {
      filtrados = filtrados.filter(col => col.activo === 0);
    }

    // Aplicar filtros globales
    if (this.estadoSeleccionado) {
      switch (this.estadoSeleccionado) {
        case 'al_dia': filtrados = filtrados.filter(col => col.saldoTotal === 0); break;
        case 'con_saldo': filtrados = filtrados.filter(col => col.saldoTotal > 0); break;
        case 'vencido': filtrados = filtrados.filter(col => col.saldoVencido > 0); break;
      }
    }
    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(col => col.nombre_estudiante.toLowerCase().includes(busqueda));
    }

    let filtradosConSaldo: EstudianteCarteraConSaldoPendiente[] = filtrados.map(col => ({
      ...col,
      totalSaldoPendiente: this.calcularTotalSaldoPendienteEstudiante(col)
    }));

    if (this.mostrarSoloConSaldoPendienteColaboradores) {
      filtradosConSaldo = filtradosConSaldo.filter(col => col.totalSaldoPendiente > 0);
    }

    this.colaboradoresSaldosPendientesFiltrados = filtradosConSaldo;
    this.aplicarOrdenamientoSaldosPendientesColaboradores();
  }

  ordenarPorSaldosPendientesColaboradores(columna: string): void {
    if (this.columnaOrdenamientoSaldosColaboradores === columna) {
      this.ordenAscendenteSaldosColaboradores = !this.ordenAscendenteSaldosColaboradores;
    } else {
      this.columnaOrdenamientoSaldosColaboradores = columna;
      this.ordenAscendenteSaldosColaboradores = columna === 'nombre_estudiante' || columna === 'grupo_estudiante';
    }
    this.aplicarOrdenamientoSaldosPendientesColaboradores();
  }

  aplicarOrdenamientoSaldosPendientesColaboradores(): void {
    const multiplicador = this.ordenAscendenteSaldosColaboradores ? 1 : -1;
    this.colaboradoresSaldosPendientesFiltrados.sort((a, b) => {
      let valorA: any;
      let valorB: any;
      if (this.columnaOrdenamientoSaldosColaboradores === 'totalSaldoPendiente') {
        valorA = a.totalSaldoPendiente || 0;
        valorB = b.totalSaldoPendiente || 0;
      } else {
        valorA = a[this.columnaOrdenamientoSaldosColaboradores as keyof EstudianteCartera];
        valorB = b[this.columnaOrdenamientoSaldosColaboradores as keyof EstudianteCartera];
      }
      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = valorB.toLowerCase();
      }
      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  getTotalSaldoPendienteMesColaboradores(mes: number): number {
    return this.colaboradoresSaldosPendientesFiltrados.reduce((total, col) => {
      return total + this.getSaldoPendienteMes(col, mes);
    }, 0);
  }

  getTotalSaldosPendientesColaboradores(): number {
    return this.colaboradoresSaldosPendientesFiltrados.reduce((total, col) => {
      return total + (col.totalSaldoPendiente || 0);
    }, 0);
  }

  getColaboradoresConSaldoPendiente(): number {
    return this.colaboradoresSaldosPendientesFiltrados.filter(col =>
      (col.totalSaldoPendiente || 0) > 0
    ).length;
  }

  getPromedioSaldoPendienteColaboradores(): number {
    const conSaldo = this.getColaboradoresConSaldoPendiente();
    if (conSaldo === 0) return 0;
    return this.getTotalSaldosPendientesColaboradores() / conSaldo;
  }

  getMesConMayorSaldoPendienteColaboradores(): string {
    let maxSaldo = 0;
    let mesMax = '';
    this.mesesDisponibles.forEach(mes => {
      const totalMes = this.getTotalSaldoPendienteMesColaboradores(mes.valor);
      if (totalMes > maxSaldo) {
        maxSaldo = totalMes;
        mesMax = mes.nombre;
      }
    });
    return mesMax || 'N/A';
  }

  exportarSaldosPendientesMensualesColaboradores(): void {
    const headers = ['Colaborador', 'Identificación', 'Cargo'];
    this.mesesDisponibles.forEach(mes => headers.push(mes.nombre));
    headers.push('Total');

    const datos = this.colaboradoresSaldosPendientesFiltrados.map(col => {
      const fila: any = {
        'Colaborador': col.nombre_estudiante,
        'Identificación': col.numero_identificacion,
        'Cargo': col.grupo_estudiante
      };
      this.mesesDisponibles.forEach(mes => {
        fila[mes.nombre] = this.getSaldoPendienteMes(col, mes.valor);
      });
      fila['Total'] = col.totalSaldoPendiente || 0;
      return fila;
    });

    const totales: any = { 'Colaborador': 'TOTALES', 'Identificación': '', 'Cargo': '' };
    this.mesesDisponibles.forEach(mes => {
      totales[mes.nombre] = this.getTotalSaldoPendienteMesColaboradores(mes.valor);
    });
    totales['Total'] = this.getTotalSaldosPendientesColaboradores();
    datos.push(totales);

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Saldos Pendientes Colaboradores');
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `saldos_pendientes_colaboradores_${this.anioSeleccionado}_${fecha}.xlsx`);
  }

  // =====================================================
  // EXPORTAR EXCEL MOVIMIENTO DIARIO (por cada sub-tabla)
  // =====================================================

  exportarCobrosExcel(): void {
    const datos = this.movimientoCobros.map(m => ({
      'Fecha': this.formatearFecha(m.fecha),
      'Persona': m.nombre_estudiante || '-',
      'Tipo Persona': m.tipo_persona || '-',
      'Monto': m.total_cobrado,
      'Cantidad': m.cantidad_cobros
    }));
    this.exportarMovimientoDiarioAExcel(datos, 'Cobros');
  }

  exportarIngresosExcel(): void {
    let ingresos = [...this.movimientoIngresos];
    if (this.filtroTipoIngresos !== '') {
      ingresos = ingresos.filter(m => m.id_tipo_pago === Number(this.filtroTipoIngresos));
    }
    const datos = ingresos.map(m => ({
      'Fecha': this.formatearFecha(m.fecha),
      'Persona': m.nombre_estudiante || '-',
      'Tipo Persona': m.tipo_persona || '-',
      'Tipo Pago': this.obtenerNombreTipoPago(m.id_tipo_pago),
      'Recibido': m.total_recibido || 0,
      'Aplicado': m.total_pagado,
      'Diferencia': this.getDiferenciaRecibidoAplicado(m)
    }));
    this.exportarMovimientoDiarioAExcel(datos, 'Ingresos');
  }

  exportarDescuentosExcel(): void {
    let descuentos = [...this.movimientoDescuentos];
    if (this.filtroTipoDescuentos !== '') {
      descuentos = descuentos.filter(m => m.id_tipo_pago === Number(this.filtroTipoDescuentos));
    }
    const datos = descuentos.map(m => ({
      'Fecha': this.formatearFecha(m.fecha),
      'Persona': m.nombre_estudiante || '-',
      'Tipo Persona': m.tipo_persona || '-',
      'Tipo Pago': this.obtenerNombreTipoPago(m.id_tipo_pago),
      'Recibido': m.total_recibido || 0,
      'Aplicado': m.total_pagado,
      'Diferencia': this.getDiferenciaRecibidoAplicado(m)
    }));
    this.exportarMovimientoDiarioAExcel(datos, 'Descuentos');
  }

  exportarExtracurricularExcel(): void {
    let extracurricular = [...this.movimientoExtracurricular];
    if (this.filtroTipoExtracurricular !== '') {
      extracurricular = extracurricular.filter(m => m.id_tipo_pago === Number(this.filtroTipoExtracurricular));
    }
    const datos = extracurricular.map(m => ({
      'Fecha': this.formatearFecha(m.fecha),
      'Persona': m.nombre_estudiante || '-',
      'Tipo Persona': m.tipo_persona || '-',
      'Tipo Pago': this.obtenerNombreTipoPago(m.id_tipo_pago),
      'Recibido': m.total_recibido || 0,
      'Aplicado': m.total_pagado,
      'Diferencia': this.getDiferenciaRecibidoAplicado(m)
    }));
    this.exportarMovimientoDiarioAExcel(datos, 'Extracurricular');
  }

  private exportarMovimientoDiarioAExcel(datos: any[], nombreHoja: string): void {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `movimiento_diario_${nombreHoja.toLowerCase()}_${this.anioSeleccionado}_${fecha}.xlsx`);
  }
}