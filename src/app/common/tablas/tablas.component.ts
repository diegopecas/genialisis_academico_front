import { CommonModule, NgClass } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { BuscarComponent } from '../buscar/buscar.component';
import { CustomDecimalFormatPipe } from '../pipes/custom-decimal-format.pipe';
import { RouterModule } from '@angular/router';
import collect from 'collect.js';
import * as XLSX from 'xlsx';
import { FormsModule } from '@angular/forms';
import { ThemeService, ThemeConfig } from '../../services/theme.service';

@Component({
  selector: 'app-tablas',
  templateUrl: './tablas.component.html',
  styleUrl: './tablas.component.scss',
  standalone: true,
  imports: [CommonModule, BuscarComponent, CustomDecimalFormatPipe, RouterModule, FormsModule, NgClass],
  providers: []
})
export class TablasComponent implements OnChanges, OnInit {
  @Input() titulos: any[] = [];
  @Input() datos: any[] = [];
  @Input() acciones: any[] = [];
  @Input() raiz: any = "";
  @Input() accionVer: any = false;
  @Input() accionEditar: any = false;
  @Input() accionEliminar: any = false;
  @Input() mostrarBuscar: any = false;
  @Input() columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' })[] = [];
  @Input() seleccionMultiple: boolean = false;
  @Input() campoId: string = 'id';
  // Por defecto se oculta la columna del id (UUID) de la vista; el id sigue disponible en los datos para acciones.
  // Poner [mostrarColumnaId]="true" para mostrarla explicitamente.
  @Input() mostrarColumnaId: boolean = false;
  @Input() exportarExcel: boolean = true;
  @Input() prefiltrosExcluir: { [alias: string]: any[] } = {};
  @Input() prefiltrosFecha: { [alias: string]: { anio?: number, mes?: number, dia?: number } } = {};

  @Output() eliminar = new EventEmitter<any>();
  @Output() clicAccion = new EventEmitter<any>();
  @Output() seleccionCambiada = new EventEmitter<any[]>();
  @Output() datosFiltradosCambiados = new EventEmitter<any[]>();

  public currentTheme!: ThemeConfig;
  public columnasFiltroNormalizadas: Map<string, 'fecha' | 'normal' | 'rango'> = new Map();

  public formatosDisponibles = {
    number: { alias: 'number', descripcion: 'Formato numerico (ej: 1,234.56)' },
    integer: { alias: 'integer', descripcion: 'Formato entero (ej: 1,234)' },
    percent: { alias: 'percent', descripcion: 'Porcentaje (ej: 12.34%)' },
    currency: { alias: 'currency', descripcion: 'Moneda (similar a money)' },
    money: { alias: 'money', descripcion: 'Moneda (ej: $ 1,234.56)' },
    date: { alias: 'date', descripcion: 'Fecha (ej: 01/01/2023)' },
    datetime: { alias: 'datetime', descripcion: 'Fecha y hora (ej: 01/01/2023 12:34)' },
    time: { alias: 'time', descripcion: 'Hora (ej: 12:34)' },
    link: { alias: 'link', descripcion: 'Enlace' },
    badge: { alias: 'badge', descripcion: 'Etiqueta con estilo (badge). Usa claseCSS para el estilo' },
    progreso: { alias: 'progreso', descripcion: 'Barra de progreso. El valor debe ser un porcentaje (0-100)' },
    html: { alias: 'html', descripcion: 'Contenido HTML puro. Usalo con precaucion' },
    icono: { alias: 'icono', descripcion: 'Icono con texto opcional. Usa clave_class, clave_color, clave_title' },
    booleano: { alias: 'booleano', descripcion: 'Muestra check o X para valores true/false o 1/0' },
    boton: { alias: 'boton', descripcion: 'Botón clickeable con icono. Usa icono para la imagen y accionId para identificar la acción' }
  };

  formatConfig: { [key: string]: any } = {};
  public path = ""
  public buscarTexto = "";
  public Math = Math;
  public accionVerActivo = false;
  public accionEditarActivo = false;
  public accionEliminarActivo = false;
  public buscador = true;
  public registrosPagina = 10;
  public filtrosActivos: { [key: string]: any[] } = {};
  public opcionesFiltro: { [key: string]: { valor: any, seleccionado: boolean }[] } = {};
  public filtroAbierto: { [key: string]: boolean } = {};
  public todosSeleccionados: { [key: string]: boolean } = {};
  public cantidadFiltrosActivos: number = 0;
  public accionesMenuAbierto: { [key: string]: boolean } = {};
  public registrosSeleccionados: Set<any> = new Set();
  public todosSeleccionadosPagina: boolean = false;
  public columnaOrdenada: string = '';
  public direccionOrden: 'asc' | 'desc' | '' = '';
  public particleDecorations: string[] = [];
  private prefiltrosAplicados: boolean = false;

  get tieneAcciones(): boolean {
    return this.accionVerActivo || this.accionEditarActivo || this.accionEliminarActivo || (this.tabla.acciones && this.tabla.acciones.length > 0);
  }

  public tabla: any = {
    columnas: 0,
    titulos: [],
    datos: [],
    datosFiltrados: [],
    acciones: [],
    paginas: [[]],
    paginaActual: 0
  }

  public busquedaFiltro: { [key: string]: string } = {};
  public opcionesFiltroFiltradas: { [key: string]: { valor: any, seleccionado: boolean }[] } = {};
  
  // Filtro tipo fecha (año/mes/día)
  public filtrosFecha: { 
    [key: string]: { 
      anios: number[], 
      meses: number[], 
      dias: number[],
      anioSeleccionado: number | null, 
      mesSeleccionado: number | null,
      diaSeleccionado: number | null
    } 
  } = {};
  public nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Filtro tipo rango (desde/hasta). Detecta automáticamente si es fecha o número según el tipo del título.
  public filtrosRango: {
    [key: string]: {
      tipoInput: 'date' | 'number';
      desde: any;
      hasta: any;
    }
  } = {};

  constructor(
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.generateParticles();
    this.normalizarColumnasFiltro();
  }

  normalizarColumnasFiltro(): void {
    this.columnasFiltroNormalizadas.clear();
    this.columnasFiltro.forEach(item => {
      if (typeof item === 'string') {
        this.columnasFiltroNormalizadas.set(item, 'normal');
      } else {
        const tipoFiltro = item.tipoFiltro || 'normal';
        this.columnasFiltroNormalizadas.set(item.columna, tipoFiltro);
      }
    });
  }

  obtenerNombreColumna(item: string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' }): string {
    return typeof item === 'string' ? item : item.columna;
  }

  columnaEstaEnFiltros(alias: string): boolean {
    return this.columnasFiltro.some(item => {
      const nombre = this.obtenerNombreColumna(item);
      return nombre === alias;
    });
  }

  private generateParticles(): void {
    if (this.currentTheme) {
      this.particleDecorations = Array.from({ length: 5 }, () =>
        this.currentTheme.decorativeElements[
        Math.floor(Math.random() * this.currentTheme.decorativeElements.length)
        ]
      );
    }
  }

  formatValue(valor: any, tipo: string | undefined, formato?: any): string {
    if (valor === undefined || valor === null) {
      return '';
    }

    const formatNumber = (num: number, minFraction: number = 0, maxFraction: number = 2): string => {
      return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: minFraction,
        maximumFractionDigits: maxFraction
      }).format(num);
    };

    const formatDate = (dateStr: string, options: any): string => {
      try {
        let date: Date;
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          date = new Date(dateStr + 'T00:00:00Z');
        } else {
          date = new Date(dateStr);
        }
        if (isNaN(date.getTime())) throw new Error('Fecha invalida');
        return new Intl.DateTimeFormat('es-ES', options).format(date);
      } catch (e) {
        console.error('Error formateando fecha:', e);
        return String(dateStr);
      }
    };

    switch (tipo) {
      case 'date':
        try {
          if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
            const [year, month, day] = valor.split('-').map(n => parseInt(n, 10));
            return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          }
          return formatDate(valor, { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch { return valor; }

      case 'datetime':
        try {
          return formatDate(valor, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch { return valor; }

      case 'time':
        try {
          return formatDate(valor, { hour: '2-digit', minute: '2-digit' });
        } catch { return valor; }

      case 'number':
        const numOptions = formato?.digitInfo?.split('-') || ['1', '2', '2'];
        const minFrac = parseInt(numOptions[1] || '0');
        const maxFrac = parseInt(numOptions[2] || '2');
        return formatNumber(parseFloat(valor), minFrac, maxFrac);

      case 'integer':
        return formatNumber(parseInt(valor), 0, 0);

      case 'percent':
        let percentValue = parseFloat(valor);
        if (formato?.asDecimal && percentValue <= 1) {
          percentValue = percentValue * 100;
        }
        return formatNumber(percentValue,
          formato?.digitInfo ? parseInt(formato.digitInfo.split('-')[1] || '0') : 0,
          formato?.digitInfo ? parseInt(formato.digitInfo.split('-')[2] || '2') : 2) + '%';

      case 'currency':
      case 'money':
        return '$ ' + formatNumber(parseFloat(valor), 0, 0);

      default:
        return valor.toString();
    }
  }

  initFiltrosBusqueda() {
    Object.keys(this.opcionesFiltro).forEach(clave => {
      this.busquedaFiltro[clave] = '';
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
    });
  }

  filtrarOpciones(clave: string) {
    const busqueda = this.busquedaFiltro[clave].toLowerCase();
    if (!busqueda) {
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
      return;
    }
    this.opcionesFiltroFiltradas[clave] = this.opcionesFiltro[clave].filter(opcion => {
      const valor = opcion.valor?.toString().toLowerCase() || '(sin valor)';
      return valor.includes(busqueda);
    });
  }

  getOpcionOriginalIndex(clave: string, opcionFiltrada: any): number {
    return this.opcionesFiltro[clave].findIndex(opt => opt.valor === opcionFiltrada.valor);
  }

  contarSeleccionados(clave: string): number {
    return this.opcionesFiltro[clave].filter(opt => opt.seleccionado).length;
  }

  toggleFiltro(clave: string) {
    this.filtroAbierto[clave] = !this.filtroAbierto[clave];
    if (this.filtroAbierto[clave] && this.opcionesFiltro[clave]) {
      this.busquedaFiltro[clave] = '';
      this.opcionesFiltroFiltradas[clave] = [...this.opcionesFiltro[clave]];
    }
  }

  toggleAccionesMenu(id: string) {
    Object.keys(this.accionesMenuAbierto).forEach(key => {
      if (key !== id) {
        this.accionesMenuAbierto[key] = false;
      }
    });
    this.accionesMenuAbierto[id] = !this.accionesMenuAbierto[id];
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: any) {
    const clickedInsideDropdown = event.target.closest('.dropdown-menu');
    const clickedOnToggle = event.target.closest('.dropdown-toggle');
    if (!clickedInsideDropdown && !clickedOnToggle) {
      this.cerrarTodosLosDropdowns();
      this.cerrarTodosLosMenusAcciones();
    }
  }

  cerrarTodosLosMenusAcciones() {
    Object.keys(this.accionesMenuAbierto).forEach(key => {
      this.accionesMenuAbierto[key] = false;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["raiz"]) {
      this.path = changes["raiz"]["currentValue"];
    }
    if (changes["acciones"]) {
      this.tabla.acciones = changes["acciones"]["currentValue"] || [];
    }
    if (changes["titulos"]) {
      const titulosRecibidos = changes["titulos"]["currentValue"] || [];
      // Ocultar de la vista la columna del id (campoId) salvo que se pida mostrarla.
      // No se altera el array de datos: el id sigue disponible para acciones, edicion y seleccion.
      this.tabla.titulos = this.mostrarColumnaId
        ? titulosRecibidos
        : titulosRecibidos.filter((titulo: any) => titulo.clave !== this.campoId);
      this.tabla.titulos.forEach((titulo: any) => {
        if (titulo.formato) {
          this.formatConfig[titulo.clave] = titulo.formato;
        }
      });
    }
    if (changes["datos"]) {
      this.tabla.datos = Array.isArray(changes["datos"]["currentValue"]) ?
        changes["datos"]["currentValue"] : [];
      this.generarOpcionesFiltro();
      this.filtrarDatos();
    }
    if (changes["accionVer"]) {
      this.accionVerActivo = changes["accionVer"]["currentValue"] || false;
    }
    if (changes["accionEditar"]) {
      this.accionEditarActivo = changes["accionEditar"]["currentValue"] || false;
    }
    if (changes["accionEliminar"]) {
      this.accionEliminarActivo = changes["accionEliminar"]["currentValue"] || false;
    }
    if (changes["mostrarBuscar"]) {
      this.buscador = changes["mostrarBuscar"]["currentValue"] || false;
    }
    if (changes["columnasFiltro"]) {
      this.columnasFiltro = Array.isArray(changes["columnasFiltro"]["currentValue"]) ?
        changes["columnasFiltro"]["currentValue"] : [];
      this.normalizarColumnasFiltro();
      this.resetFiltros();
      if (this.tabla.datos && this.tabla.datos.length > 0) {
        this.generarOpcionesFiltro();
      }
    }
    this.calcularColumnas();
  }

  generarOpcionesFiltro() {
    if (!this.tabla.datos || !Array.isArray(this.tabla.datos) || this.tabla.datos.length === 0 ||
      !this.columnasFiltro || !Array.isArray(this.columnasFiltro) || this.columnasFiltro.length === 0) {
      return;
    }

    this.opcionesFiltro = {};
    this.filtrosFecha = {};
    this.filtrosRango = {};

    this.columnasFiltro.forEach(item => {
      const columnaAlias = this.obtenerNombreColumna(item);
      const tituloItem = this.tabla.titulos.find((t: any) => t.alias === columnaAlias);

      if (tituloItem) {
        const clave = tituloItem.clave;
        const tipoFiltroConfig = this.columnasFiltroNormalizadas.get(columnaAlias);

        if (tipoFiltroConfig === 'fecha') {
          this.generarFiltroFecha(clave);
        } else if (tipoFiltroConfig === 'rango') {
          this.generarFiltroRango(clave, tituloItem.tipo);
        } else {
          const valoresSet = new Set();
          let tieneValoresNulos = false;
          
          this.tabla.datos.forEach((item: any) => {
            if (item[clave] === undefined || item[clave] === null || item[clave] === '') {
              tieneValoresNulos = true;
            } else {
              valoresSet.add(item[clave]);
            }
          });

          const valoresArray = Array.from(valoresSet);
          valoresArray.sort((a: any, b: any) => {
            if (typeof a === 'string' && typeof b === 'string') {
              return a.localeCompare(b);
            }
            return a - b;
          });

          if (tieneValoresNulos) {
            valoresArray.unshift(null);
          }

          this.opcionesFiltro[clave] = valoresArray.map(valor => ({
            valor: valor,
            seleccionado: true
          }));

          this.filtroAbierto[clave] = false;
          this.todosSeleccionados[clave] = true;

          if (!this.filtrosActivos[clave]) {
            this.filtrosActivos[clave] = [...valoresArray];
          }
        }
      }
    });

    // Aplicar prefiltros de exclusión solo la primera vez que se cargan los datos
    if (!this.prefiltrosAplicados && this.prefiltrosExcluir && Object.keys(this.prefiltrosExcluir).length > 0) {
      this.aplicarPrefiltrosExcluir();
    }

    // Aplicar prefiltros de fecha solo la primera vez que se cargan los datos
    if (!this.prefiltrosAplicados && this.prefiltrosFecha && Object.keys(this.prefiltrosFecha).length > 0) {
      this.aplicarPrefiltrosFecha();
    }

    // Marcar prefiltros como aplicados si había alguno configurado
    if (!this.prefiltrosAplicados) {
      const tienePrefiltros = (this.prefiltrosExcluir && Object.keys(this.prefiltrosExcluir).length > 0) ||
                              (this.prefiltrosFecha && Object.keys(this.prefiltrosFecha).length > 0);
      if (tienePrefiltros) {
        this.prefiltrosAplicados = true;
      }
    }

    this.actualizarContadorFiltros();
    this.initFiltrosBusqueda();
  }

  /**
   * Aplica prefiltros de exclusión desmarcando los valores indicados en prefiltrosExcluir.
   * Se ejecuta solo la primera vez que se cargan los datos.
   */
  private aplicarPrefiltrosExcluir(): void {
    Object.keys(this.prefiltrosExcluir).forEach(alias => {
      const tituloItem = this.tabla.titulos.find((t: any) => t.alias === alias);
      if (!tituloItem) return;

      const clave = tituloItem.clave;
      const valoresExcluir = this.prefiltrosExcluir[alias];

      if (!this.opcionesFiltro[clave]) return;

      this.opcionesFiltro[clave].forEach(opcion => {
        if (valoresExcluir.some((v: any) => v === opcion.valor || String(v) === String(opcion.valor))) {
          opcion.seleccionado = false;
        }
      });

      this.todosSeleccionados[clave] = this.opcionesFiltro[clave].every(opcion => opcion.seleccionado);

      this.filtrosActivos[clave] = this.opcionesFiltro[clave]
        .filter(opcion => opcion.seleccionado)
        .map(opcion => opcion.valor);
    });
  }

  /**
   * Aplica prefiltros de fecha preseleccionando año/mes/día en filtros tipo fecha.
   * Se ejecuta solo la primera vez que se cargan los datos.
   */
  private aplicarPrefiltrosFecha(): void {
    Object.keys(this.prefiltrosFecha).forEach(alias => {
      const tituloItem = this.tabla.titulos.find((t: any) => t.alias === alias);
      if (!tituloItem) return;

      const clave = tituloItem.clave;
      const prefiltro = this.prefiltrosFecha[alias];

      if (!this.filtrosFecha[clave]) return;

      if (prefiltro.anio !== undefined && this.filtrosFecha[clave].anios.includes(prefiltro.anio)) {
        this.filtrosFecha[clave].anioSeleccionado = prefiltro.anio;
      }

      if (prefiltro.mes !== undefined && this.filtrosFecha[clave].meses.includes(prefiltro.mes)) {
        this.filtrosFecha[clave].mesSeleccionado = prefiltro.mes;
      }

      if (prefiltro.dia !== undefined && this.filtrosFecha[clave].dias.includes(prefiltro.dia)) {
        this.filtrosFecha[clave].diaSeleccionado = prefiltro.dia;
      }

      this.aplicarFiltroFecha(clave);
    });
  }

  generarFiltroFecha(clave: string) {
    const aniosSet = new Set<number>();
    const mesesSet = new Set<number>();
    const diasSet = new Set<number>();

    this.tabla.datos.forEach((item: any) => {
      if (item[clave]) {
        let fecha: Date;
        const valorFecha = item[clave];
        
        if (typeof valorFecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valorFecha)) {
          const partes = valorFecha.split('T')[0].split('-');
          fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        } else {
          fecha = new Date(valorFecha);
        }
        
        if (!isNaN(fecha.getTime())) {
          aniosSet.add(fecha.getFullYear());
          mesesSet.add(fecha.getMonth() + 1);
          diasSet.add(fecha.getDate());
        }
      }
    });

    this.filtrosFecha[clave] = {
      anios: Array.from(aniosSet).sort((a, b) => b - a),
      meses: Array.from(mesesSet).sort((a, b) => a - b),
      dias: Array.from(diasSet).sort((a, b) => a - b),
      anioSeleccionado: null,
      mesSeleccionado: null,
      diaSeleccionado: null
    };

    this.filtroAbierto[clave] = false;
  }

  esFiltroFecha(clave: string): boolean {
    return this.filtrosFecha[clave] !== undefined;
  }

  aplicarFiltroFecha(clave: string) {
    const filtroFecha = this.filtrosFecha[clave];
    if (!filtroFecha) return;

    if (filtroFecha.anioSeleccionado === null && 
        filtroFecha.mesSeleccionado === null && 
        filtroFecha.diaSeleccionado === null) {
      delete this.filtrosActivos[clave];
    } else {
      const valoresFiltrados = this.tabla.datos
        .filter((item: any) => {
          if (!item[clave]) return false;
          
          let fecha: Date;
          const valorFecha = item[clave];
          
          if (typeof valorFecha === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valorFecha)) {
            const partes = valorFecha.split('T')[0].split('-');
            fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
          } else {
            fecha = new Date(valorFecha);
          }
          
          if (isNaN(fecha.getTime())) return false;

          let coincideAnio = true;
          let coincideMes = true;
          let coincideDia = true;

          if (filtroFecha.anioSeleccionado !== null) {
            coincideAnio = fecha.getFullYear() === filtroFecha.anioSeleccionado;
          }

          if (filtroFecha.mesSeleccionado !== null) {
            coincideMes = (fecha.getMonth() + 1) === filtroFecha.mesSeleccionado;
          }

          if (filtroFecha.diaSeleccionado !== null) {
            coincideDia = fecha.getDate() === filtroFecha.diaSeleccionado;
          }

          return coincideAnio && coincideMes && coincideDia;
        })
        .map((item: any) => item[clave]);

      this.filtrosActivos[clave] = valoresFiltrados;
    }

    this.filtrarDatos();
    this.actualizarContadorFiltros();
  }

  resetFiltroFecha(clave: string) {
    if (this.filtrosFecha[clave]) {
      this.filtrosFecha[clave].anioSeleccionado = null;
      this.filtrosFecha[clave].mesSeleccionado = null;
      this.filtrosFecha[clave].diaSeleccionado = null;
      this.aplicarFiltroFecha(clave);
    }
  }

  // =====================================================
  // FILTRO TIPO RANGO (desde/hasta)
  // Detecta automáticamente si es fecha o número según
  // el tipo declarado en titulosTabla.
  // =====================================================

  generarFiltroRango(clave: string, tipoDato: string): void {
    const tiposNumericos = ['money', 'currency', 'number', 'integer', 'percent'];
    const tiposFecha = ['date', 'datetime'];

    let tipoInput: 'date' | 'number' = 'number';
    if (tiposFecha.includes(tipoDato)) {
      tipoInput = 'date';
    }

    this.filtrosRango[clave] = {
      tipoInput: tipoInput,
      desde: null,
      hasta: null
    };

    this.filtroAbierto[clave] = false;
  }

  esFiltroRango(clave: string): boolean {
    return this.filtrosRango[clave] !== undefined;
  }

  aplicarFiltroRango(clave: string): void {
    const rango = this.filtrosRango[clave];
    if (!rango) return;

    const sinFiltro = (rango.desde === null || rango.desde === '') &&
                      (rango.hasta === null || rango.hasta === '');

    if (sinFiltro) {
      delete this.filtrosActivos[clave];
    } else {
      // Marcamos con un prefijo especial para que filtrarDatos lo reconozca
      this.filtrosActivos['__rango__' + clave] = [rango.desde, rango.hasta, rango.tipoInput];
      delete this.filtrosActivos[clave];
    }

    this.filtrarDatos();
    this.actualizarContadorFiltros();
  }

  resetFiltroRango(clave: string): void {
    if (this.filtrosRango[clave]) {
      this.filtrosRango[clave].desde = null;
      this.filtrosRango[clave].hasta = null;
      delete this.filtrosActivos['__rango__' + clave];
      this.filtrarDatos();
      this.actualizarContadorFiltros();
    }
  }

  private aplicarFiltrosRango(datos: any[]): any[] {
    const clavesRango = Object.keys(this.filtrosActivos).filter(k => k.startsWith('__rango__'));

    if (clavesRango.length === 0) return datos;

    return datos.filter(item => {
      return clavesRango.every(claveCompleta => {
        const clave = claveCompleta.replace('__rango__', '');
        const [desde, hasta, tipoInput] = this.filtrosActivos[claveCompleta];
        const valor = item[clave];

        if (valor === null || valor === undefined || valor === '') return false;

        if (tipoInput === 'date') {
          const valorFecha = typeof valor === 'string' ? valor.split('T')[0] : valor;
          if (desde && valorFecha < desde) return false;
          if (hasta && valorFecha > hasta) return false;
        } else {
          const valorNum = parseFloat(valor);
          if (isNaN(valorNum)) return false;
          if (desde !== null && desde !== '' && valorNum < parseFloat(desde)) return false;
          if (hasta !== null && hasta !== '' && valorNum > parseFloat(hasta)) return false;
        }

        return true;
      });
    });
  }

  // =====================================================

  toggleTodos(clave: string) {
    this.todosSeleccionados[clave] = !this.todosSeleccionados[clave];
    this.opcionesFiltro[clave].forEach(opcion => {
      opcion.seleccionado = this.todosSeleccionados[clave];
    });
    this.aplicarSeleccion(clave);
  }

  toggleOpcion(clave: string, index: number) {
    if (index >= 0 && index < this.opcionesFiltro[clave].length) {
      this.opcionesFiltro[clave][index].seleccionado = !this.opcionesFiltro[clave][index].seleccionado;
      this.todosSeleccionados[clave] = this.opcionesFiltro[clave].every(opcion => opcion.seleccionado);
      this.aplicarSeleccion(clave);
    }
  }

  aplicarSeleccion(clave: string) {
    const valoresSeleccionados = this.opcionesFiltro[clave]
      .filter(opcion => opcion.seleccionado)
      .map(opcion => opcion.valor);
    this.filtrosActivos[clave] = valoresSeleccionados;
    this.filtrarDatos();
    this.actualizarContadorFiltros();
  }

  actualizarContadorFiltros() {
    let contador = 0;
    
    // Filtros normales
    Object.keys(this.filtrosActivos).forEach(clave => {
      if (clave.startsWith('__rango__')) return;
      if (this.opcionesFiltro[clave] && this.filtrosActivos[clave].length < this.opcionesFiltro[clave].length) {
        contador++;
      }
    });
    
    // Filtros de fecha
    Object.keys(this.filtrosFecha).forEach(clave => {
      if (this.filtrosFecha[clave].anioSeleccionado !== null || 
          this.filtrosFecha[clave].mesSeleccionado !== null ||
          this.filtrosFecha[clave].diaSeleccionado !== null) {
        contador++;
      }
    });

    // Filtros de rango
    Object.keys(this.filtrosRango).forEach(clave => {
      const rango = this.filtrosRango[clave];
      if ((rango.desde !== null && rango.desde !== '') || 
          (rango.hasta !== null && rango.hasta !== '')) {
        contador++;
      }
    });
    
    this.cantidadFiltrosActivos = contador;
  }

  resetFiltros() {
    this.filtrosActivos = {};
    Object.keys(this.opcionesFiltro).forEach(clave => {
      if (this.opcionesFiltro[clave]) {
        this.opcionesFiltro[clave].forEach(opcion => {
          opcion.seleccionado = true;
        });
        this.todosSeleccionados[clave] = true;
        this.filtrosActivos[clave] = this.opcionesFiltro[clave].map(opcion => opcion.valor);
      }
    });
    
    Object.keys(this.filtrosFecha).forEach(clave => {
      this.filtrosFecha[clave].anioSeleccionado = null;
      this.filtrosFecha[clave].mesSeleccionado = null;
      this.filtrosFecha[clave].diaSeleccionado = null;
    });

    Object.keys(this.filtrosRango).forEach(clave => {
      this.filtrosRango[clave].desde = null;
      this.filtrosRango[clave].hasta = null;
    });
    
    this.filtrarDatos();
    this.cantidadFiltrosActivos = 0;
  }

  cambiarTamanoPagina(tamano: number) {
    this.registrosPagina = tamano;
    this.filtrarDatos();
  }

  cambiarPaginaActual(i: number) {
    if (i >= 0 && i < this.tabla.paginas.length) {
      this.tabla.paginaActual = i;
    }
  }

  calcularColumnas() {
    this.tabla.columnas = this.tieneAcciones ? 1 : 0;
  }

  eliminarRegistro(valor: any) {
    Swal.fire({
      title: "Esta seguro de borrar el registro " + valor + "?",
      text: "Esta accion no se puede revertir!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, borrarlo!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminar.emit(valor);
      }
    });
  }

  buscar(event: any) {
    this.buscarTexto = event;
    this.filtrarDatos();
  }

  filtrarDatos() {
    if (!this.tabla.datos || !Array.isArray(this.tabla.datos) || this.tabla.datos.length === 0) {
      this.tabla.datosFiltrados = [];
      this.tabla.paginas = [[]];
      this.tabla.paginaActual = 0;
      return;
    }

    let datosFiltrados = [...this.tabla.datos];

    if (this.buscarTexto && this.buscarTexto.trim() !== '') {
      const termino = this.buscarTexto.toLowerCase();
      const clavesVisibles = this.tabla.titulos.map((t: any) => t.clave);

      datosFiltrados = datosFiltrados.filter((item: any) => {
        return clavesVisibles.some((clave: string) => {
          const valor = item[clave];
          if (valor === null || valor === undefined) return false;
          return valor.toString().toLowerCase().includes(termino);
        });
      });
    }

    // Filtros normales y de fecha (excluye claves de rango)
    const filtrosNoRango = Object.keys(this.filtrosActivos).filter(k => !k.startsWith('__rango__'));
    if (filtrosNoRango.length > 0) {
      datosFiltrados = datosFiltrados.filter((item: any) => {
        return filtrosNoRango.every(columna => {
          if (!this.filtrosActivos[columna] || this.filtrosActivos[columna].length === 0) {
            return true;
          }
          const valorItem = item[columna];
          if (valorItem === null || valorItem === undefined || valorItem === '') {
            return this.filtrosActivos[columna].includes(null);
          }
          return this.filtrosActivos[columna].includes(valorItem);
        });
      });
    }

    // Filtros de rango
    datosFiltrados = this.aplicarFiltrosRango(datosFiltrados);

    if (this.columnaOrdenada && this.direccionOrden) {
      datosFiltrados = [...datosFiltrados].sort((a: any, b: any) => {
        let valorA = a[this.columnaOrdenada];
        let valorB = b[this.columnaOrdenada];

        if (valorA === null || valorA === undefined) valorA = '';
        if (valorB === null || valorB === undefined) valorB = '';

        const esNumero = !isNaN(valorA) && !isNaN(valorB) && valorA !== '' && valorB !== '';
        const esFecha = this.esFechaValor(valorA) && this.esFechaValor(valorB);

        let resultado = 0;

        if (esNumero) {
          resultado = parseFloat(valorA) - parseFloat(valorB);
        } else if (esFecha) {
          resultado = new Date(valorA).getTime() - new Date(valorB).getTime();
        } else {
          resultado = valorA.toString().toLowerCase().localeCompare(valorB.toString().toLowerCase());
        }

        return this.direccionOrden === 'asc' ? resultado : -resultado;
      });
    }

    this.tabla.datosFiltrados = datosFiltrados;

    try {
      const paginas = [];

      if (this.registrosPagina <= 0) {
        paginas.push([...this.tabla.datosFiltrados]);
      } else {
        for (let i = 0; i < this.tabla.datosFiltrados.length; i += this.registrosPagina) {
          const pagina = this.tabla.datosFiltrados.slice(i, i + this.registrosPagina);
          paginas.push(pagina);
        }
      }

      if (paginas.length === 0) {
        paginas.push([]);
      }

      this.tabla.paginas = paginas;

      if (this.tabla.paginaActual >= this.tabla.paginas.length) {
        this.tabla.paginaActual = Math.max(0, this.tabla.paginas.length - 1);
      }

    } catch (error) {
      console.error('Error al paginar los datos:', error);
      this.tabla.paginas = [this.tabla.datosFiltrados];
      this.tabla.paginaActual = 0;
    }

    if (this.seleccionMultiple) {
      this.verificarTodosSeleccionados();
    }

    this.datosFiltradosCambiados.emit(this.tabla.datosFiltrados);
  }

  private esFechaValor(valor: any): boolean {
    if (!valor) return false;
    const fecha = new Date(valor);
    return !isNaN(fecha.getTime());
  }

  seleccionar(accion: any, id: any, registro: any) {
    this.cerrarTodosLosMenusAcciones();
    this.clicAccion.emit({
      accion: accion,
      id: id,
      registro: registro
    });
  }

  cerrarTodosLosDropdowns() {
    Object.keys(this.filtroAbierto).forEach(clave => {
      this.filtroAbierto[clave] = false;
    });
  }

  cerrarOtrosDropdowns(claveActual: string) {
    Object.keys(this.filtroAbierto).forEach(clave => {
      if (clave !== claveActual) {
        this.filtroAbierto[clave] = false;
      }
    });
  }

  toggleSeleccionRegistro(id: any) {
    if (this.registrosSeleccionados.has(id)) {
      this.registrosSeleccionados.delete(id);
    } else {
      this.registrosSeleccionados.add(id);
    }
    this.verificarTodosSeleccionados();
    this.actualizarSeleccionPadre();
  }

  verificarTodosSeleccionados() {
    if (this.tabla.paginas[this.tabla.paginaActual]) {
      const registrosPagina = this.tabla.paginas[this.tabla.paginaActual];

      if (registrosPagina.length === 0) {
        this.todosSeleccionadosPagina = false;
      } else {
        this.todosSeleccionadosPagina = registrosPagina.every((dato: any) =>
          this.registrosSeleccionados.has(dato[this.campoId])
        );
      }
    }
  }

  toggleTodosPagina() {
    if (!this.tabla.datosFiltrados || !Array.isArray(this.tabla.datosFiltrados)) {
      console.warn('No hay datos filtrados validos');
      this.todosSeleccionadosPagina = false;
      return;
    }

    const todosSeleccionados = this.tabla.datosFiltrados
      .every((dato: any) => this.registrosSeleccionados.has(dato[this.campoId]));

    if (todosSeleccionados) {
      this.tabla.datosFiltrados.forEach((dato: any) => {
        this.registrosSeleccionados.delete(dato[this.campoId]);
      });
      this.todosSeleccionadosPagina = false;
    } else {
      this.tabla.datosFiltrados.forEach((dato: any) => {
        this.registrosSeleccionados.add(dato[this.campoId]);
      });
      this.todosSeleccionadosPagina = true;
    }

    this.actualizarSeleccionPadre();
  }

  seleccionarTodos() {
    this.tabla.datosFiltrados.forEach((dato: any) => {
      this.registrosSeleccionados.add(dato[this.campoId]);
    });
    this.verificarTodosSeleccionados();
    this.actualizarSeleccionPadre();
  }

  limpiarSeleccion() {
    this.registrosSeleccionados.clear();
    this.todosSeleccionadosPagina = false;
    this.actualizarSeleccionPadre();
  }

  emitirSeleccion() {
    const seleccionados = this.tabla.datosFiltrados.filter((dato: any) =>
      this.registrosSeleccionados.has(dato[this.campoId])
    );
    this.seleccionCambiada.emit(seleccionados);
  }

  obtenerSeleccionados(): any[] {
    return this.tabla.datosFiltrados.filter((dato: any) =>
      this.registrosSeleccionados.has(dato[this.campoId])
    );
  }

  private actualizarSeleccionPadre() {
    if (this.seleccionMultiple) {
      const seleccionados = this.obtenerSeleccionados();
      this.seleccionCambiada.emit(seleccionados);
    }
  }

  ordenarPorColumna(clave: string) {
    if (this.columnaOrdenada === clave) {
      if (this.direccionOrden === 'asc') {
        this.direccionOrden = 'desc';
      } else if (this.direccionOrden === 'desc') {
        this.direccionOrden = '';
        this.columnaOrdenada = '';
      } else {
        this.direccionOrden = 'asc';
      }
    } else {
      this.columnaOrdenada = clave;
      this.direccionOrden = 'asc';
    }

    this.filtrarDatos();
  }

  getIconoOrden(clave: string): string {
    if (this.columnaOrdenada !== clave) {
      return 'fa-sort';
    }

    if (this.direccionOrden === 'asc') {
      return 'fa-sort-up';
    } else if (this.direccionOrden === 'desc') {
      return 'fa-sort-down';
    }

    return 'fa-sort';
  }

  getValorMostrar(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '(Sin valor)';
    }
    return valor;
  }

  verTodos(): void {
    this.registrosPagina = 0;
    this.filtrarDatos();
  }

  exportarAExcel(): void {
    if (!this.tabla.datosFiltrados || this.tabla.datosFiltrados.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'No hay datos para exportar.',
        confirmButtonColor: '#03A9F4'
      });
      return;
    }

    const datosExportar = this.tabla.datosFiltrados.map((dato: any) => {
      const fila: any = {};
      this.tabla.titulos.forEach((titulo: any) => {
        const valor = dato[titulo.clave];
        if (titulo.tipo === 'booleano') {
          fila[titulo.alias] = (valor == 1 || valor === true) ? 'Sí' : 'No';
        } else if (titulo.tipo === 'html' || titulo.tipo === 'icono' || titulo.tipo === 'progreso') {
          fila[titulo.alias] = valor ?? '';
        } else if (titulo.tipo === 'link') {
          fila[titulo.alias] = valor ?? '';
        } else if (titulo.tipo) {
          fila[titulo.alias] = this.formatValue(valor, titulo.tipo, this.formatConfig[titulo.clave]);
        } else {
          fila[titulo.alias] = valor ?? '';
        }
      });
      return fila;
    });

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    XLSX.writeFile(wb, `tabla_exportada_${new Date().getTime()}.xlsx`);
  }
}