import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../common/searchable-dropdown/searchable-dropdown.component';
import { AsistenciaEstudiantesService } from '../../../services/asistencia-estudiantes.service';
import { ConfiguracionGlobalService } from '../../../services/configuracion-global.service';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';

interface EstudianteCobro {
  id_estudiante: string;
  id_persona: string;
  nombre_estudiante: string;
  numero_identificacion: string;
  grupo_estudiante: string;
  activo: number;
}

interface ProductoServicio {
  id: string;
  nombre: string;
  detalles: string | null;
  valor_sugerido: number | null;
  nombre_clasificacion: string | null;
  nombre_categoria: string | null;
  nombre_periodicidad: string | null;
}

interface FilaCobro {
  seleccionado: boolean;
  estudiante: EstudianteCobro;
  valor: number;
  valor_formateado: string;
  detalle: string;
  // Resultado del ultimo proceso de generacion, para pintarlo en la fila.
  creadas: number;
  omitidas: number;
  fechas_omitidas: string[];
  procesado: boolean;
}

@Component({
  selector: 'app-registro-cobros-rapido',
  templateUrl: './registro-cobros-rapido.component.html',
  styleUrl: './registro-cobros-rapido.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent],
})
export class RegistroCobrosRapidoComponent implements OnInit, OnDestroy {
  public titulo = 'Registro Rápido de Cobros';
  public regresar = '/administracion/financiero';

  public productos: ProductoServicio[] = [];
  // Los items del dropdown llevan en 'descripcion' la clasificacion, la
  // categoria, la periodicidad y el detalle del producto: el buscador del
  // componente filtra por nombre + descripcion, asi que con eso se puede buscar
  // por cualquiera de esos campos.
  public productosDropdownItems: DropdownItem[] = [];

  public filas: FilaCobro[] = [];
  public filasFiltradas: FilaCobro[] = [];
  public grupos: string[] = [];

  // Configuracion del cobro a generar
  public idProductoServicio: string | null = null;
  public anio: number = new Date().getFullYear();
  public cobroUnico = false;
  public mesInicial: number = new Date().getMonth() + 1;
  public mesFinal = 12;
  public dia = 1;
  public valorGeneral = 0;
  public valorGeneralFormateado = '';
  public detalleGeneral = '';

  // Dia general de cobro del jardin (parametro 'cobros_dia_general'). Es el que
  // se propone cuando se cobra por rango de meses.
  public diaCobroGeneral: number | null = null;

  // Filtros del listado
  public busqueda = '';
  public filtroGrupo = '';
  public filtroEstado: 'activos' | 'inactivos' | 'todos' = 'activos';
  public usarFiltroAsistencia = false;
  public fechaAsistencia = '';
  public filtroAsistencia: 'asistieron' | 'no_asistieron' = 'asistieron';

  public cargando = false;
  public consultandoAsistencia = false;
  public generando = false;
  public mostrarResultados = false;

  // id_estudiante de quienes tienen asistencia en fechaAsistencia. null = aun no
  // se ha consultado, por eso el filtro de asistencia no aplica todavia.
  private asistentes: Set<string> | null = null;

  public meses = [
    { numero: 1, nombre: 'Enero' },
    { numero: 2, nombre: 'Febrero' },
    { numero: 3, nombre: 'Marzo' },
    { numero: 4, nombre: 'Abril' },
    { numero: 5, nombre: 'Mayo' },
    { numero: 6, nombre: 'Junio' },
    { numero: 7, nombre: 'Julio' },
    { numero: 8, nombre: 'Agosto' },
    { numero: 9, nombre: 'Septiembre' },
    { numero: 10, nombre: 'Octubre' },
    { numero: 11, nombre: 'Noviembre' },
    { numero: 12, nombre: 'Diciembre' },
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private productosServiciosService: ProductosServiciosService,
    private asistenciaService: AsistenciaEstudiantesService,
    private configuracionGlobalService: ConfiguracionGlobalService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    // Arranca con el dia de hoy: si el parametro existe, lo reemplaza.
    this.dia = new Date().getDate();
    this.cargarDiaCobroGeneral();
    this.cargarProductos();
    this.cargarEstudiantes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  /**
   * Dia general de cobro del jardin. Mientras no se marque cobro unico, es el
   * dia que se propone para todas las cuentas del rango. Si el parametro no
   * existe se conserva el dia de hoy.
   */
  cargarDiaCobroGeneral(): void {
    const sub = this.configuracionGlobalService.obtenerByClave('cobros_dia_general').subscribe({
      next: (response: any) => {
        const dia = parseInt(String(response.body?.valor_numero), 10);
        if (!isNaN(dia) && dia >= 1 && dia <= 31) {
          this.diaCobroGeneral = dia;
          if (!this.cobroUnico) this.dia = dia;
        }
      },
      error: () => {
        console.warn('No se pudo leer cobros_dia_general, se usa el día de hoy.');
      },
    });
    this.subscriptions.push(sub);
  }

  cargarProductos(): void {
    const sub = this.productosServiciosService.obtenerCatalogoDisponibles().subscribe({
      next: (response: any) => {
        const data = response.body || [];
        this.productos = data.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          detalles: p.detalles,
          valor_sugerido: p.valor_sugerido !== null ? parseFloat(String(p.valor_sugerido)) : null,
          nombre_clasificacion: p.nombre_clasificacion,
          nombre_categoria: p.nombre_categoria,
          nombre_periodicidad: p.nombre_periodicidad,
        }));

        this.productosDropdownItems = this.productos.map((p: ProductoServicio) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: this.armarDescripcionProducto(p),
        }));
      },
      error: (error: any) => {
        console.error('Error al cargar productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos y servicios', 'error');
      },
    });
    this.subscriptions.push(sub);
  }

  /**
   * Texto secundario del dropdown. Ademas de mostrarse debajo del nombre, es lo
   * que usa el buscador del componente para filtrar, por eso se arma con la
   * clasificacion, la categoria, la periodicidad y el detalle del producto.
   */
  private armarDescripcionProducto(producto: ProductoServicio): string {
    const partes: string[] = [];

    if (producto.nombre_clasificacion) partes.push(producto.nombre_clasificacion);
    if (producto.nombre_categoria) partes.push(producto.nombre_categoria);
    if (producto.nombre_periodicidad) partes.push(producto.nombre_periodicidad);
    if (producto.detalles && producto.detalles.trim()) partes.push(producto.detalles.trim());

    return partes.join(' · ');
  }

  cargarEstudiantes(): void {
    const sub = this.cuentasPorCobrarService.obtenerDatosCobrosRapido().subscribe({
      next: (response: any) => {
        const data = response.body;
        const estudiantes: EstudianteCobro[] = (data?.estudiantes || []).map((e: any) => ({
          ...e,
          activo: Number(e.activo),
        }));

        this.filas = estudiantes.map((est: EstudianteCobro) => ({
          seleccionado: false,
          estudiante: est,
          valor: this.valorGeneral,
          valor_formateado: this.valorGeneral ? this.formatearMoneda(this.valorGeneral) : '',
          detalle: this.detalleGeneral,
          creadas: 0,
          omitidas: 0,
          fechas_omitidas: [],
          procesado: false,
        }));

        const gruposSet = new Set<string>();
        this.filas.forEach((f: FilaCobro) => gruposSet.add(f.estudiante.grupo_estudiante || 'Sin grupo'));
        this.grupos = Array.from(gruposSet).sort();

        this.filtrarFilas();
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar estudiantes:', error);
        Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
        this.cargando = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // FILTROS
  // ============================================

  /**
   * El check prende el filtro de asistencia. Al prenderlo se propone la fecha de
   * hoy y se consulta de una, para que no queden los dos controles pidiendo
   * datos sin mostrar nada.
   */
  onUsarFiltroAsistenciaChange(): void {
    if (!this.usarFiltroAsistencia) {
      this.fechaAsistencia = '';
      this.asistentes = null;
      this.filtrarFilas();
      return;
    }

    this.filtroAsistencia = 'asistieron';
    if (!this.fechaAsistencia) {
      const hoy = new Date();
      this.fechaAsistencia = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    }
    this.onFechaAsistenciaChange();
  }

  /**
   * Consulta quienes tienen asistencia registrada en la fecha. Con esa sola
   * lista se resuelven los dos casos: los que estan asistieron y los que no
   * estan, no asistieron.
   */
  onFechaAsistenciaChange(): void {
    this.asistentes = null;

    if (!this.fechaAsistencia) {
      this.filtrarFilas();
      return;
    }

    this.consultandoAsistencia = true;
    const sub = this.asistenciaService.obtenerEstudiantesPorFecha(this.fechaAsistencia).subscribe({
      next: (respuesta: any) => {
        const lista = Array.isArray(respuesta) ? respuesta : (respuesta?.body || []);
        this.asistentes = new Set<string>(lista.map((a: any) => a.id_estudiante));
        this.consultandoAsistencia = false;
        this.filtrarFilas();
      },
      error: (error: any) => {
        console.error('Error al consultar la asistencia:', error);
        this.consultandoAsistencia = false;
        this.asistentes = null;
        Swal.fire('Advertencia', 'No se pudo consultar la asistencia de esa fecha.', 'warning');
      },
    });
    this.subscriptions.push(sub);
  }

  filtrarFilas(): void {
    let resultado = [...this.filas];

    if (this.filtroEstado === 'activos') {
      resultado = resultado.filter((f: FilaCobro) => f.estudiante.activo === 1);
    } else if (this.filtroEstado === 'inactivos') {
      resultado = resultado.filter((f: FilaCobro) => f.estudiante.activo === 0);
    }

    if (this.filtroGrupo) {
      resultado = resultado.filter((f: FilaCobro) => (f.estudiante.grupo_estudiante || 'Sin grupo') === this.filtroGrupo);
    }

    if (this.busqueda) {
      const termino = this.busqueda.toLowerCase();
      resultado = resultado.filter((f: FilaCobro) =>
        f.estudiante.nombre_estudiante.toLowerCase().includes(termino) ||
        (f.estudiante.numero_identificacion || '').toLowerCase().includes(termino) ||
        (f.estudiante.grupo_estudiante || '').toLowerCase().includes(termino)
      );
    }

    if (this.usarFiltroAsistencia && this.asistentes !== null) {
      const asistentes = this.asistentes;
      resultado = resultado.filter((f: FilaCobro) => {
        const asistio = asistentes.has(f.estudiante.id_estudiante);
        return this.filtroAsistencia === 'asistieron' ? asistio : !asistio;
      });
    }

    this.filasFiltradas = resultado;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroGrupo = '';
    this.filtroEstado = 'activos';
    this.usarFiltroAsistencia = false;
    this.fechaAsistencia = '';
    this.filtroAsistencia = 'asistieron';
    this.asistentes = null;
    this.filtrarFilas();
  }

  // ============================================
  // CONFIGURACIÓN DEL COBRO
  // ============================================

  /**
   * Al elegir producto se propone su valor sugerido como valor general y se
   * baja a las filas.
   */
  onProductoSeleccionado(item: DropdownItem | null): void {
    if (!item) {
      this.idProductoServicio = null;
      return;
    }

    this.idProductoServicio = String(item.id);

    const producto = this.productos.find((p: ProductoServicio) => p.id === this.idProductoServicio);
    if (!producto) return;

    this.valorGeneral = producto.valor_sugerido || 0;
    this.valorGeneralFormateado = this.valorGeneral ? this.formatearMoneda(this.valorGeneral) : '';
    this.aplicarValorGeneral();
  }

  /**
   * Cobro unico: una sola cuenta con la fecha de hoy (mes actual, dia de hoy).
   * Al desmarcarlo se vuelve al mes actual con el dia general del jardin, que es
   * como se cobra por rango de meses.
   */
  onCobroUnicoChange(): void {
    const hoy = new Date();

    if (this.cobroUnico) {
      this.mesInicial = hoy.getMonth() + 1;
      this.mesFinal = this.mesInicial;
      this.dia = hoy.getDate();
      return;
    }

    this.mesInicial = hoy.getMonth() + 1;
    this.dia = this.diaCobroGeneral !== null ? this.diaCobroGeneral : hoy.getDate();
  }

  onMesInicialChange(): void {
    if (this.cobroUnico) {
      this.mesFinal = this.mesInicial;
    }
  }

  onInputValorGeneral(event: any): void {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    if (inputValue === '') {
      this.valorGeneral = 0;
      this.valorGeneralFormateado = '';
    } else {
      this.valorGeneral = parseInt(inputValue, 10);
      this.valorGeneralFormateado = this.formatearMoneda(this.valorGeneral);
    }
    this.aplicarValorGeneral();
  }

  onDetalleGeneralChange(): void {
    this.aplicarDetalleGeneral();
  }

  // El valor general baja a todas las filas; el ajuste fila por fila se hace
  // despues, sobre el campo de cada estudiante.
  aplicarValorGeneral(): void {
    this.filas.forEach((fila: FilaCobro) => {
      fila.valor = this.valorGeneral;
      fila.valor_formateado = this.valorGeneral ? this.formatearMoneda(this.valorGeneral) : '';
    });
  }

  aplicarDetalleGeneral(): void {
    this.filas.forEach((fila: FilaCobro) => {
      fila.detalle = this.detalleGeneral;
    });
  }

  onInputValorFila(fila: FilaCobro, event: any): void {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    if (inputValue === '') {
      fila.valor = 0;
      fila.valor_formateado = '';
    } else {
      fila.valor = parseInt(inputValue, 10);
      fila.valor_formateado = this.formatearMoneda(fila.valor);
    }
  }

  // ============================================
  // SELECCIÓN
  // ============================================

  seleccionarTodos(event: any): void {
    const seleccionar = event.target.checked;
    this.filasFiltradas.forEach((f: FilaCobro) => { f.seleccionado = seleccionar; });
  }

  get filasSeleccionadas(): FilaCobro[] {
    return this.filas.filter((f: FilaCobro) => f.seleccionado);
  }

  get cantidadSeleccionados(): number {
    return this.filasSeleccionadas.length;
  }

  get cantidadMeses(): number {
    if (this.cobroUnico) return 1;
    if (this.mesInicial < 1 || this.mesFinal < 1 || this.mesInicial > this.mesFinal) return 0;
    return this.mesFinal - this.mesInicial + 1;
  }

  get cuentasAGenerar(): number {
    return this.cantidadSeleccionados * this.cantidadMeses;
  }

  get totalAGenerar(): number {
    return this.filasSeleccionadas.reduce((suma: number, f: FilaCobro) => suma + (f.valor || 0) * this.cantidadMeses, 0);
  }

  get nombreProductoSeleccionado(): string {
    const producto = this.productos.find((p: ProductoServicio) => p.id === this.idProductoServicio);
    return producto ? producto.nombre : '';
  }

  /**
   * Fechas que va a generar el backend. Se calculan igual aqui solo para
   * mostrarlas en el resumen antes de confirmar. Si el dia no existe en el mes
   * (31 en febrero) se ajusta al ultimo dia de ese mes, igual que en el back.
   */
  get fechasPreview(): string[] {
    const fechas: string[] = [];
    if (this.cantidadMeses === 0 || this.dia < 1 || this.dia > 31) return fechas;

    const mesFinalEfectivo = this.cobroUnico ? this.mesInicial : this.mesFinal;

    for (let mes = this.mesInicial; mes <= mesFinalEfectivo; mes++) {
      const ultimoDia = new Date(this.anio, mes, 0).getDate();
      const diaMes = Math.min(this.dia, ultimoDia);
      fechas.push(
        `${this.anio}-${String(mes).padStart(2, '0')}-${String(diaMes).padStart(2, '0')}`
      );
    }
    return fechas;
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  validar(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    if (!this.idProductoServicio) errores.push('Debe seleccionar un producto o servicio');
    if (this.mesInicial < 1) errores.push('Debe seleccionar el mes');

    if (!this.cobroUnico) {
      if (this.mesFinal < 1) errores.push('Debe seleccionar el mes final');
      if (this.mesInicial > this.mesFinal) errores.push('El mes inicial no puede ser posterior al mes final');
    }

    if (!this.dia || this.dia < 1 || this.dia > 31) errores.push('El día debe estar entre 1 y 31');
    if (this.cantidadSeleccionados === 0) errores.push('Debe marcar al menos un estudiante');

    this.filasSeleccionadas.forEach((fila: FilaCobro) => {
      if (!fila.valor || fila.valor <= 0) {
        errores.push(`${fila.estudiante.nombre_estudiante}: el valor debe ser mayor a cero`);
      }
    });

    return { valido: errores.length === 0, errores };
  }

  // ============================================
  // GENERACIÓN
  // ============================================

  async generarCobros(): Promise<void> {
    const validacion = this.validar();
    if (!validacion.valido) {
      Swal.fire({
        title: 'Errores de validación',
        html: '<ul style="text-align:left;max-height:300px;overflow-y:auto;">' +
          validacion.errores.map((e: string) => `<li>${e}</li>`).join('') + '</ul>',
        icon: 'error',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    const fechas = this.fechasPreview;
    const listaFechas = fechas.map((f: string) => this.formatearFecha(f)).join(', ');

    const confirmacion = await Swal.fire({
      title: 'Confirmar generación',
      html: `<div style="text-align:left;">`
        + `Producto: <strong>${this.nombreProductoSeleccionado}</strong><br>`
        + `Estudiantes: <strong>${this.cantidadSeleccionados}</strong><br>`
        + `Cuentas a generar: <strong>${this.cuentasAGenerar}</strong><br>`
        + `Total: <strong>$${this.formatearMoneda(this.totalAGenerar)}</strong><br><br>`
        + `<small class="text-muted">Fechas: ${listaFechas}</small><br><br>`
        + `<small class="text-muted">Las cuentas que ya existan para el mismo producto y fecha se omiten.</small>`
        + `</div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      width: '600px',
    });
    if (!confirmacion.isConfirmed) return;

    this.generando = true;

    const payload = {
      id_producto_servicio: this.idProductoServicio,
      anio: this.anio,
      mes_inicial: this.mesInicial,
      mes_final: this.cobroUnico ? this.mesInicial : this.mesFinal,
      dia: this.dia,
      id_usuario: this.utilService.obtenerIdUsuarioActual(),
      estudiantes: this.filasSeleccionadas.map((fila: FilaCobro) => ({
        id_estudiante: fila.estudiante.id_estudiante,
        id_persona: fila.estudiante.id_persona,
        valor: fila.valor,
        detalle: fila.detalle,
      })),
    };

    const sub = this.cuentasPorCobrarService.generarMasivo(payload).subscribe({
      next: (respuesta: any) => {
        this.generando = false;

        if (!respuesta || !respuesta.success) {
          Swal.fire('Error', respuesta?.error || 'No se pudieron generar las cuentas', 'error');
          return;
        }

        // Cada fila guarda su resultado para mostrar cuantas se crearon y
        // cuales fechas ya existian.
        const porEstudiante = new Map<string, any>();
        (respuesta.resultados || []).forEach((r: any) => porEstudiante.set(r.id_estudiante, r));

        this.filas.forEach((fila: FilaCobro) => {
          const resultado = porEstudiante.get(fila.estudiante.id_estudiante);
          if (!resultado) return;
          fila.creadas = resultado.creadas || 0;
          fila.omitidas = resultado.omitidas || 0;
          fila.fechas_omitidas = resultado.fechas_omitidas || [];
          fila.procesado = true;
          fila.seleccionado = false;
        });

        this.mostrarResultados = true;
        this.filtrarFilas();

        let html = `Se crearon <strong>${respuesta.total_creadas}</strong> cuenta(s) por cobrar`;
        html += ` por <strong>$${this.formatearMoneda(respuesta.total_valor || 0)}</strong>.`;
        if (respuesta.total_omitidas > 0) {
          html += `<br><br>Se omitieron <strong>${respuesta.total_omitidas}</strong> porque ya existían.`;
          html += `<br><small class="text-muted">Revise la columna Resultado del listado.</small>`;
        }

        Swal.fire({
          title: 'Proceso terminado',
          html: html,
          icon: respuesta.total_creadas > 0 ? 'success' : 'info',
          confirmButtonText: 'Entendido',
        });
      },
      error: (error: any) => {
        this.generando = false;
        console.error('Error al generar las cuentas:', error);
        Swal.fire('Error', 'Hubo un problema al generar las cuentas por cobrar', 'error');
      },
    });
    this.subscriptions.push(sub);
  }

  limpiarResultados(): void {
    this.mostrarResultados = false;
    this.filas.forEach((fila: FilaCobro) => {
      fila.creadas = 0;
      fila.omitidas = 0;
      fila.fechas_omitidas = [];
      fila.procesado = false;
    });
  }

  // ============================================
  // UTILIDADES
  // ============================================

  formatearMoneda(valor: number): string {
    if (!valor) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatearFecha(fecha: string): string {
    try {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fecha;
    }
  }

  resumenOmitidas(fila: FilaCobro): string {
    if (!fila.fechas_omitidas || fila.fechas_omitidas.length === 0) return '';
    return fila.fechas_omitidas.map((f: string) => this.formatearFecha(f)).join(', ');
  }

  trackByEstudiante(index: number, fila: FilaCobro): string {
    return fila.estudiante.id_estudiante;
  }
}
