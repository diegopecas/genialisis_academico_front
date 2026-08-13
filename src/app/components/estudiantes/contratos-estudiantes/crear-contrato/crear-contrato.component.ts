import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilService } from '../../../../common/constantes/util.service';
import { HeaderComponent } from '../../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';
import { AcudientesService } from '../../../../services/acudientes.service';
import {
  ContratoMatricula,
  ContratosMatriculaService,
} from '../../../../services/contratos-matricula.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { ExportarPdfContratoService } from '../../../../services/exportar-pdf-contrato.service';
import { TarifasGruposService } from '../../../../services/tarifas-grupos.service';
import { DocumentosPersonasService } from '../../../../services/documentos-personas.service';
import { TiposDocumentosService } from '../../../../services/tipos-documentos.service';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { 
  ContratosMatriculaValoresService, 
  ContratoValor,
  ResumenValores 
} from '../../../../services/contratos-matricula-valores.service';
import {
  ContratosMatriculaProductosService,
  LineaContrato
} from '../../../../services/contratos-matricula-productos.service';

// Producto que aparece como columna en la grilla mensual
interface ColumnaProducto {
  id_producto_servicio: string;
  nombre_producto: string;
  codigo_tipo_cobro: string;
  orden: number;
}

// Interfaz para agrupar valores por mes.
// Las celdas son dinámicas: una por producto que tenga cuota en ese mes.
interface ValorMensual {
  fecha: string;
  fechaFormateada: string;
  mes: number;
  anio: number;
  celdas: { [idProducto: string]: ContratoValor };
  totalMes: number;
}

@Component({
  selector: 'app-crear-contrato',
  templateUrl: './crear-contrato.component.html',
  styleUrl: './crear-contrato.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule, DocumentosPersonaComponent],
})
export class CrearContratoComponent implements OnInit {
  public id = '0';
  public idEstudiante = '0';
  public accion = '';
  public editable = false;
  public submitted = false;
  public guardando = false;
  public tieneDocumentoFirmado = false;
  public estudiante: any;
  public nombre_estudiante = '';
  public titulo = 'Contrato de matrícula';
  public regresar = '/estudiantes/contratos/';

  public acudientesDisponibles = [] as any[];
  /** Filas de la tarifa del grupo para el año del contrato */
  public tarifaGrupo: any[] = [];
  public emailsFirmantes: string[] = [];

  // Nuevas propiedades para valores detallados
  public valores: ContratoValor[] = [];
  public valoresMensuales: ValorMensual[] = [];
  public resumenValores: ResumenValores = {
    total_matricula: 0,
    total_pension: 0,
    total_otros: 0,
    numero_cuotas: 0,
    valor_total: 0
  };
  public cuotasMatricula: number = 1;
  public valoresGenerados: boolean = false;

  // Líneas del contrato: un producto por línea, con su descuento y su recargo.
  // En las líneas de PENSION el valor es el mensual, igual que en la tarifa.
  public lineas: LineaContrato[] = [];
  // Columnas de la grilla mensual, en el orden de la tarifa
  public columnasProductos: ColumnaProducto[] = [];

  public razon_descuento: string = '';
  public razon_recargo: string = '';

  // Propiedad para controlar estado de generación de cuentas por cobrar
  public generandoCuentas: boolean = false;

  public model: ContratoMatricula = {
    id_estudiante: '',
    anio: new Date().getFullYear(),
    id_grupo: '',
    valor_matricula: 0,
    valor_pension: 0,
    numero_cuotas: 0,
    valor_total: 0,
    fecha_firma: '',
    fecha_inicio: '',
    fecha_fin: '',
    dia_vencimiento: 1,
    lugar_firma: 'Chía',
    autoriza_imagenes: 1,
    autoriza_pagare: 1,
    observaciones: '',
    acudientes: [],
    firmado: 0,
    ruta_documento_firmado: undefined,
  };

  // Nombres de meses en español
  private nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private acudientesService: AcudientesService,
    private contratosMatriculaService: ContratosMatriculaService,
    private tarifasGruposService: TarifasGruposService,
    private exportarPdfContratoService: ExportarPdfContratoService,
    private utilService: UtilService,
    private documentosPersonasService: DocumentosPersonasService,
    private tiposDocumentosService: TiposDocumentosService,
    private contratosMatriculaValoresService: ContratosMatriculaValoresService,
    private contratosMatriculaProductosService: ContratosMatriculaProductosService,
    private cuentasPorCobrarService: CuentasPorCobrarService
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idEstudiante = params['idEstudiante'];
      this.regresar = this.regresar + this.idEstudiante;

      const hoy = new Date();
      this.model.fecha_firma = hoy.toISOString().split('T')[0];

      this.calcularFechaInicioPorDefecto();
      this.calcularFechaFinPorDefecto();

      this.obtenerEstudiante(this.idEstudiante);
      this.obtenerAcudientes(this.idEstudiante);

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = 'Nuevo contrato de matrícula';
          break;
        case 'editar':
          this.editable = true;
          this.titulo = 'Editar contrato de matrícula';
          this.obtenerContrato(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = 'Consultar contrato de matrícula';
          this.obtenerContrato(this.id);
          break;
      }
    });
  }

  calcularFechaInicioPorDefecto() {
    const mes = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const anioServicio = mes >= 11 ? anioActual + 1 : anioActual;
    this.model.fecha_inicio = `${anioServicio}-02-01`;
  }

  calcularFechaFinPorDefecto() {
    if (!this.model.fecha_inicio) return;
    const inicio = new Date(this.model.fecha_inicio + 'T00:00:00');
    const anioFin = inicio.getFullYear();
    this.model.fecha_fin = `${anioFin}-11-30`;
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService
      .obtenerById(id_estudiante)
      .subscribe((response: any) => {
        const body = response.body as any[];
        this.estudiante = body[0];
        this.model.id_estudiante = this.idEstudiante;
        this.model.id_grupo = this.estudiante.id_grupo;

        this.nombre_estudiante = [
          this.estudiante.primer_nombre,
          this.estudiante.segundo_nombre,
          this.estudiante.primer_apellido,
          this.estudiante.segundo_apellido,
        ]
          .filter(Boolean)
          .join(' ');

        this.titulo = this.titulo + ' - ' + this.nombre_estudiante;

        // Cargar tarifas en cualquier acción (crear, editar, consultar)
        this.cargarTarifasGrupo();
      });
  }

  obtenerAcudientes(id_estudiante: any) {
    this.acudientesService
      .obtenerPorEstudiante(id_estudiante)
      .subscribe((response: any) => {
        const body = response.body as any[];
        console.log('=== ACUDIENTES RAW ===', body);
        
        this.acudientesDisponibles = body
          .filter((a: any) => a.activo == 1)
          .map((a: any) => ({
            ...a,
            nombre_completo: a.nombre_persona?.trim() || 'Sin nombre',
          }));

        console.log('=== ACUDIENTES PROCESADOS ===', this.acudientesDisponibles);

        this.emailsFirmantes = this.acudientesDisponibles
          .map((a: any) => a.correo_electronico)
          .filter((email: string) => email && email.trim().length > 0);

        if (this.accion === 'crear') {
          this.acudientesDisponibles.forEach((a) => {
            if (a.es_responsable_pago == 1) {
              this.model.acudientes?.push(a.id);
            }
          });
        }
      });
  }

  obtenerContrato(id: any) {
    this.contratosMatriculaService
      .obtenerById(id)
      .subscribe((response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const contrato = body[0];
          console.log('=== CONTRATO RAW ===', contrato);
          console.log('=== DESCUENTOS EN CONTRATO ===', {
            descuento_matricula: contrato.descuento_matricula,
            recargo_matricula: contrato.recargo_matricula,
            descuento_pension: contrato.descuento_pension,
            recargo_pension: contrato.recargo_pension,
            razon_descuento: contrato.razon_descuento,
            razon_recargo: contrato.razon_recargo
          });
          
          this.model = {
            ...contrato,
            acudientes: [],
          };

          const estaFirmado = contrato.firmado == 1 || contrato.firmado === '1';
          
          if (estaFirmado && this.accion === 'editar') {
            this.editable = false;
            Swal.fire(
              'Información',
              'Este contrato ya está firmado y no puede ser editado.',
              'info'
            );
          }

          // Cargar acudientes
          this.contratosMatriculaService
            .obtenerAcudientesByContrato(id)
            .subscribe((respAcudientes: any) => {
              const acudientes = respAcudientes.body as any[];
              this.model.acudientes = acudientes.map(
                (a: any) => a.id_acudiente
              );
            });

          // Cargar las lineas del contrato y despues el calendario
          this.cargarLineasContrato(id);
          this.cargarValoresContrato(id);

          // Cargar cuotas matrícula del contrato
          if (contrato.cuotas_matricula) {
            this.cuotasMatricula = parseInt(contrato.cuotas_matricula);
          }

          // Dia del mes en que vencen las cuotas. Los contratos anteriores a
          // la mora no lo traen: se asume 1, que es como se generaban antes.
          this.model.dia_vencimiento = contrato.dia_vencimiento
            ? parseInt(contrato.dia_vencimiento)
            : 1;

          // El descuento y el recargo de cada producto viven en su línea.
          // De la cabecera solo se conservan las razones.
          this.razon_descuento = contrato.razon_descuento || '';
          this.razon_recargo = contrato.razon_recargo || '';

          this.verificarDocumentoFirmado();
        }
      });
  }

  // Cargar tarifas después de tener el estudiante cargado (para edición)
  cargarTarifasParaEdicion() {
    this.cargarTarifasGrupo();
  }

  /**
   * Trae las líneas ya guardadas del contrato. Manda lo guardado sobre lo que
   * diga la tarifa: un contrato firmado no cambia porque suban la tarifa.
   */
  cargarLineasContrato(idContrato: string) {
    this.contratosMatriculaProductosService
      .obtenerByContrato(idContrato)
      .subscribe({
        next: (response: any) => {
          const guardadas = (response.body || []) as LineaContrato[];
          if (guardadas.length === 0) return;

          this.lineas = guardadas.map((l: any) => ({
            ...l,
            valor_base: parseFloat(l.valor_base) || 0,
            descuento: parseFloat(l.descuento) || 0,
            recargo: parseFloat(l.recargo) || 0,
            valor_final: parseFloat(l.valor_final) || 0,
            orden: parseInt(l.orden) || 1,
            id_periodicidad_cobro: l.id_periodicidad_cobro ? parseInt(l.id_periodicidad_cobro) : undefined,
            // El obligatorio lo dice la tarifa del grupo, no el hecho de estar
            // ya guardada: en un contrato sin firmar se debe poder cambiar de
            // jornada. Lo que protege un contrato firmado es `editable`.
            obligatorio: this.obligatorioEnTarifa(l.id_producto_servicio),
            seleccionado: true
          }));

          this.completarLineasOpcionales();
          this.actualizarFormatosLineas();
        },
        error: (error) => {
          console.log('No se encontraron líneas del contrato:', error);
        }
      });
  }

  cargarValoresContrato(idContrato: string) {
    this.contratosMatriculaValoresService
      .obtenerByContrato(idContrato)
      .subscribe({
        next: (response: any) => {
          this.valores = response.body || [];
          if (this.valores.length > 0) {
            this.valoresGenerados = true;
            this.agruparValoresPorMes();
            this.calcularResumen();
          }
        },
        error: (error) => {
          console.log('No se encontraron valores detallados:', error);
        }
      });
  }

  cargarTarifasGrupo() {
    if (!this.estudiante?.id_grupo || !this.model.anio) return;

    this.tarifasGruposService
      .obtenerByGrupoAnio(this.estudiante.id_grupo, this.model.anio)
      .subscribe({
        next: (response: any) => {
          this.tarifaGrupo = (response.body || []) as any[];

          if (this.accion === 'crear') {
            // Las obligatorias entran solas, las demás las escoge el acudiente
            this.lineas = this.tarifaGrupo.map((t: any) => this.lineaDesdeTarifa(t));
            this.actualizarFormatosLineas();
          } else {
            // En editar y consultar mandan las líneas guardadas; la tarifa solo
            // sirve para ofrecer los productos opcionales que no se escogieron.
            this.completarLineasOpcionales();
          }
        },
        error: (error) => {
          console.log('No se encontraron tarifas para el grupo');
          this.tarifaGrupo = [];
        },
      });
  }

  /**
   * Dice si el producto es obligatorio segun la tarifa vigente del grupo.
   * Un producto que ya no esta en la tarifa queda opcional, para poder
   * sacarlo del contrato.
   */
  private obligatorioEnTarifa(idProducto: string): number {
    const fila = (this.tarifaGrupo || []).find(
      (t: any) => t.id_producto_servicio === idProducto
    );
    return fila && parseInt(fila.obligatorio) === 1 ? 1 : 0;
  }

  /** Arma una línea del contrato a partir de una fila de la tarifa */
  private lineaDesdeTarifa(t: any): LineaContrato {
    const valorBase = parseFloat(t.valor) || 0;
    return {
      id_producto_servicio: t.id_producto_servicio,
      nombre_producto: t.nombre_producto,
      id_tipo_cobro: t.id_tipo_cobro,
      codigo_tipo_cobro: t.codigo_tipo_cobro,
      nombre_tipo_cobro: t.nombre_tipo_cobro,
      id_periodicidad_cobro: t.id_periodicidad_cobro ? parseInt(t.id_periodicidad_cobro) : undefined,
      nombre_periodicidad: t.nombre_periodicidad,
      valor_base: valorBase,
      descuento: 0,
      recargo: 0,
      valor_final: valorBase,
      orden: parseInt(t.orden) || 1,
      obligatorio: parseInt(t.obligatorio) === 1 ? 1 : 0,
      seleccionado: parseInt(t.obligatorio) === 1
    };
  }

  /**
   * Agrega a la lista los productos de la tarifa que el contrato no tiene,
   * desmarcados, para poder sumarlos sin salir de la pantalla.
   */
  private completarLineasOpcionales() {
    if (!this.tarifaGrupo || this.tarifaGrupo.length === 0) return;

    this.tarifaGrupo.forEach((t: any) => {
      const yaEsta = this.lineas.some(
        l => l.id_producto_servicio === t.id_producto_servicio
      );
      if (!yaEsta) {
        const linea = this.lineaDesdeTarifa(t);
        linea.seleccionado = false;
        this.lineas.push(linea);
      }
    });

    // La tarifa puede llegar despues que las lineas guardadas: se refresca
    // el obligatorio de las que ya estaban.
    this.lineas.forEach(l => {
      l.obligatorio = this.obligatorioEnTarifa(l.id_producto_servicio);
    });

    this.lineas.sort((a, b) => a.orden - b.orden);
    this.actualizarFormatosLineas();
  }

  // ==================== GESTIÓN DE DESCUENTOS Y RECARGOS ====================

  /** Recalcula el valor final de una línea: base menos descuento más recargo */
  calcularValorFinalLinea(linea: LineaContrato) {
    let final = (linea.valor_base || 0) - (linea.descuento || 0) + (linea.recargo || 0);
    if (final < 0) final = 0;
    linea.valor_final = final;
  }

  calcularValoresFinales() {
    this.lineas.forEach(l => this.calcularValorFinalLinea(l));
  }

  actualizarFormatosLineas() {
    this.lineas.forEach(l => {
      l.descuentoFormateado = this.formatearNumeroInput(l.descuento);
      l.recargoFormateado = this.formatearNumeroInput(l.recargo);
    });
  }

  formatearNumeroInput(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  onDescuentoLineaInput(event: any, linea: LineaContrato) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    linea.descuento = valorStr ? parseInt(valorStr) : 0;
    this.calcularValorFinalLinea(linea);
    linea.descuentoFormateado = this.formatearNumeroInput(linea.descuento);
    event.target.value = linea.descuentoFormateado;
  }

  onRecargoLineaInput(event: any, linea: LineaContrato) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    linea.recargo = valorStr ? parseInt(valorStr) : 0;
    this.calcularValorFinalLinea(linea);
    linea.recargoFormateado = this.formatearNumeroInput(linea.recargo);
    event.target.value = linea.recargoFormateado;
  }

  /** Marca o desmarca un producto opcional del contrato */
  toggleLinea(linea: LineaContrato) {
    if (linea.obligatorio === 1) return;
    linea.seleccionado = !linea.seleccionado;
  }

  /** Líneas que efectivamente entran al contrato */
  lineasSeleccionadas(): LineaContrato[] {
    return this.lineas.filter(l => l.seleccionado);
  }

  hayLineas(): boolean {
    return this.lineasSeleccionadas().length > 0;
  }

  hayDescuentos(): boolean {
    return this.lineasSeleccionadas().some(l => (l.descuento || 0) > 0);
  }

  hayRecargos(): boolean {
    return this.lineasSeleccionadas().some(l => (l.recargo || 0) > 0);
  }

  // Métodos para la tabla de valores mensuales
  formatearNumeroTabla(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  /** Cuota de un producto en un mes, si la tiene */
  celdaDe(vm: ValorMensual, idProducto: string): ContratoValor | null {
    return vm.celdas[idProducto] || null;
  }

  onInputValorTabla(event: any, vm: ValorMensual, idProducto: string) {
    // Obtener solo dígitos
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    const nuevoValor = valorStr ? parseInt(valorStr) : 0;

    const celda = vm.celdas[idProducto];
    if (!celda) return;

    celda.valor = nuevoValor;

    // Actualizar el total del mes
    vm.totalMes = this.totalDelMes(vm);

    // Recalcular el resumen
    this.calcularResumen();

    // Formatear mientras escribe
    if (nuevoValor > 0) {
      const cursorPos = event.target.selectionStart;
      const valorFormateado = nuevoValor.toLocaleString('es-CO');
      const diffLength = valorFormateado.length - event.target.value.length;
      event.target.value = valorFormateado;
      // Intentar mantener posición del cursor
      const newPos = cursorPos + diffLength;
      event.target.setSelectionRange(newPos, newPos);
    }
  }

  onBlurValorTabla(event: any, vm: ValorMensual, idProducto: string) {
    // Al salir, asegurar formato correcto
    const celda = vm.celdas[idProducto];
    event.target.value = this.formatearNumeroTabla(celda ? celda.valor : 0);
  }

  private totalDelMes(vm: ValorMensual): number {
    return Object.keys(vm.celdas)
      .reduce((suma, idProducto) => suma + (vm.celdas[idProducto].valor || 0), 0);
  }

  // ==================== GESTIÓN DE VALORES ====================

  generarValores() {
    if (!this.model.fecha_inicio || !this.model.fecha_fin) {
      Swal.fire('Error', 'Debe seleccionar fecha de inicio y fin', 'error');
      return;
    }

    if (!this.estudiante?.id_grupo || !this.model.anio) {
      Swal.fire('Error', 'Faltan datos del estudiante o año', 'error');
      return;
    }

    // Si ya hay valores, confirmar antes de regenerar
    if (this.valoresGenerados && this.valores.length > 0) {
      Swal.fire({
        title: '¿Regenerar valores?',
        text: 'Esto reemplazará los valores actuales. ¿Desea continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, regenerar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarGeneracionValores();
        }
      });
    } else {
      this.ejecutarGeneracionValores();
    }
  }

  private ejecutarGeneracionValores() {
    // Asegurar que los valores finales estén calculados
    this.calcularValoresFinales();

    this.contratosMatriculaValoresService
      .generarValoresPorDefecto({
        id_grupo: this.estudiante.id_grupo,
        anio: this.model.anio,
        fecha_inicio: this.model.fecha_inicio!,
        fecha_fin: this.model.fecha_fin!,
        cuotas_matricula: this.cuotasMatricula,
        // Dia en que vence cada cuota: define desde cuando corre la mora
        dia_vencimiento: this.model.dia_vencimiento || 1,
        // Las lineas escogidas, con su descuento y recargo ya aplicados
        lineas: this.lineasSeleccionadas().map(l => ({
          id_producto_servicio: l.id_producto_servicio,
          id_tipo_cobro: l.id_tipo_cobro,
          codigo_tipo_cobro: l.codigo_tipo_cobro,
          valor_final: l.valor_final,
          orden: l.orden
        }))
      })
      .subscribe({
        next: (response) => {
          this.valores = response.valores;
          // NO sobrescribir tarifaGrupo para mantener los valores base
          // this.tarifaGrupo = response.tarifa;
          this.resumenValores = response.resumen;
          this.valoresGenerados = true;
          this.agruparValoresPorMes();
          this.actualizarModeloDesdeResumen();
        },
        error: (error) => {
          console.error('Error al generar valores:', error);
          Swal.fire('Error', 'No se pudieron generar los valores. Verifique que existan tarifas configuradas.', 'error');
        }
      });
  }

  agruparValoresPorMes() {
    const grupos: Map<string, ValorMensual> = new Map();

    this.valores.forEach(valor => {
      const fecha = valor.fecha;

      if (!grupos.has(fecha)) {
        const fechaObj = new Date(fecha + 'T00:00:00');
        grupos.set(fecha, {
          fecha: fecha,
          fechaFormateada: this.formatearMesAnio(fechaObj),
          mes: fechaObj.getMonth() + 1,
          anio: fechaObj.getFullYear(),
          celdas: {},
          totalMes: 0
        });
      }

      const grupo = grupos.get(fecha)!;

      // Una celda por producto: el tipo de tarifa ya no define la columna
      grupo.celdas[valor.id_producto_servicio] = valor;
      grupo.totalMes = this.totalDelMes(grupo);
    });

    this.valoresMensuales = Array.from(grupos.values()).sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
    );

    this.armarColumnasProductos();
  }

  /**
   * Columnas de la grilla: un producto por columna, en el orden de la tarifa.
   * Se arma desde los valores para que un contrato viejo también pinte bien.
   */
  armarColumnasProductos() {
    const columnas: Map<string, ColumnaProducto> = new Map();

    this.valores.forEach((valor: any) => {
      if (columnas.has(valor.id_producto_servicio)) return;

      const linea = this.lineas.find(
        l => l.id_producto_servicio === valor.id_producto_servicio
      );

      columnas.set(valor.id_producto_servicio, {
        id_producto_servicio: valor.id_producto_servicio,
        nombre_producto: valor.nombre_producto || linea?.nombre_producto || 'Producto',
        codigo_tipo_cobro: valor.codigo_tipo_cobro || linea?.codigo_tipo_cobro || '',
        orden: valor.orden != null ? parseInt(valor.orden) : (linea?.orden || 99)
      });
    });

    this.columnasProductos = Array.from(columnas.values())
      .sort((a, b) => a.orden - b.orden);
  }

  formatearMesAnio(fecha: Date): string {
    const mes = this.nombresMeses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${mes} ${anio}`;
  }

  onValorChange(valorMensual: ValorMensual, idProducto: string, event: any) {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    const nuevoValor = inputValue === '' ? 0 : parseFloat(inputValue);

    const celda = valorMensual.celdas[idProducto];
    if (celda) {
      celda.valor = nuevoValor;
    }

    valorMensual.totalMes = this.totalDelMes(valorMensual);

    // Formatear el input
    event.target.value = nuevoValor > 0 ? nuevoValor.toLocaleString('es-CO') : '';

    this.calcularResumen();
    this.actualizarModeloDesdeResumen();
  }

  formatearValorInput(valor: number | undefined): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  calcularResumen() {
    let totalMatricula = 0;
    let totalPension = 0;
    let totalOtros = 0;
    let numeroCuotas = 0;

    this.valoresMensuales.forEach(vm => {
      Object.keys(vm.celdas).forEach(idProducto => {
        const celda: any = vm.celdas[idProducto];
        const codigo = this.codigoTipoDeProducto(idProducto, celda);

        if (codigo === 'MATRICULA') {
          totalMatricula += celda.valor || 0;
        } else if (codigo === 'PENSION') {
          totalPension += celda.valor || 0;
          numeroCuotas++;
        } else {
          totalOtros += celda.valor || 0;
        }
      });
    });

    this.resumenValores = {
      total_matricula: totalMatricula,
      total_pension: totalPension,
      total_otros: totalOtros,
      numero_cuotas: numeroCuotas,
      valor_total: totalMatricula + totalPension + totalOtros
    };
  }

  /**
   * Tipo de cobro de una cuota. Sale de la línea del contrato; si el contrato
   * es viejo y no tiene líneas, se cae a la periodicidad como se hacía antes.
   */
  private codigoTipoDeProducto(idProducto: string, celda: any): string {
    if (celda?.codigo_tipo_cobro) {
      return celda.codigo_tipo_cobro;
    }

    const linea = this.lineas.find(l => l.id_producto_servicio === idProducto);
    if (linea?.codigo_tipo_cobro) {
      return linea.codigo_tipo_cobro;
    }

    return celda?.id_periodicidad_cobro == 1 ? 'MATRICULA' : 'PENSION';
  }

  actualizarModeloDesdeResumen() {
    this.model.valor_matricula = this.resumenValores.total_matricula;
    this.model.valor_pension = this.resumenValores.total_pension;
    (this.model as any).valor_otros = this.resumenValores.total_otros;
    this.model.numero_cuotas = this.resumenValores.numero_cuotas;
    this.model.valor_total = this.resumenValores.valor_total;
  }

  onFechaInicioChange() {
    // Ajustar fecha fin si es necesario
    if (this.model.fecha_inicio && this.model.fecha_fin) {
      const inicio = new Date(this.model.fecha_inicio);
      const fin = new Date(this.model.fecha_fin);
      if (fin < inicio) {
        this.calcularFechaFinPorDefecto();
      }
    }
  }

  onFechaFinChange() {
    // Validar que fecha fin sea mayor que fecha inicio
    if (this.model.fecha_inicio && this.model.fecha_fin) {
      const inicio = new Date(this.model.fecha_inicio);
      const fin = new Date(this.model.fecha_fin);
      if (fin < inicio) {
        Swal.fire('Error', 'La fecha fin debe ser mayor que la fecha inicio', 'error');
        this.calcularFechaFinPorDefecto();
      }
    }
  }

  onAnioCambiado() {
    this.cargarTarifasGrupo();
    this.verificarContratoExistente();
    
    // Limpiar valores si cambia el año
    if (this.valoresGenerados) {
      Swal.fire({
        title: 'Año modificado',
        text: '¿Desea regenerar los valores con las nuevas tarifas?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, regenerar',
        cancelButtonText: 'No, mantener'
      }).then((result) => {
        if (result.isConfirmed) {
          this.valores = [];
          this.valoresMensuales = [];
          this.valoresGenerados = false;
        }
      });
    }
  }

  onCuotasMatriculaChange() {
    // Si ya hay valores generados, ofrecer regenerar
    if (this.valoresGenerados && this.valores.length > 0) {
      Swal.fire({
        title: 'Cuotas de matrícula modificadas',
        text: '¿Desea redistribuir el valor de la matrícula?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, redistribuir',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
          this.redistribuirMatricula();
        }
      });
    }
  }

  redistribuirMatricula() {
    if (this.cuotasMatricula < 1) return;

    const lineasMatricula = this.lineasSeleccionadas()
      .filter(l => l.codigo_tipo_cobro === 'MATRICULA');

    if (lineasMatricula.length === 0) return;

    lineasMatricula.forEach(linea => {
      const valorCuota = Math.round(linea.valor_final / this.cuotasMatricula);
      let cuotasAsignadas = 0;

      this.valoresMensuales.forEach(vm => {
        const celda = vm.celdas[linea.id_producto_servicio];

        if (cuotasAsignadas < this.cuotasMatricula) {
          // Agregar o actualizar la cuota de matrícula del mes
          if (!celda) {
            const nueva: ContratoValor = {
              id_producto_servicio: linea.id_producto_servicio,
              nombre_producto: linea.nombre_producto,
              fecha: vm.fecha,
              valor: valorCuota,
              id_periodicidad_cobro: linea.id_periodicidad_cobro,
              id_tipo_cobro: linea.id_tipo_cobro,
              codigo_tipo_cobro: linea.codigo_tipo_cobro,
              orden: linea.orden,
              es_matricula: true
            };
            vm.celdas[linea.id_producto_servicio] = nueva;
            this.valores.push(nueva);
          } else {
            celda.valor = valorCuota;
          }
          cuotasAsignadas++;
        } else if (celda) {
          // Quitar la matrícula de este mes
          const idx = this.valores.indexOf(celda);
          if (idx > -1) {
            this.valores.splice(idx, 1);
          }
          delete vm.celdas[linea.id_producto_servicio];
        }

        vm.totalMes = this.totalDelMes(vm);
      });
    });

    this.armarColumnasProductos();
    this.calcularResumen();
    this.actualizarModeloDesdeResumen();
  }

  // ==================== GENERACIÓN DE CUENTAS POR COBRAR ====================

  generarCuentasPorCobrar() {
    if (!this.model.id || !this.valoresGenerados || this.valores.length === 0) {
      Swal.fire('Error', 'No hay valores generados para crear cuentas por cobrar', 'error');
      return;
    }

    const totalCuentas = this.valores.length;
    const totalValor = this.resumenValores.valor_total;

    Swal.fire({
      title: 'Generar Cuentas por Cobrar',
      html: `Se generarán <strong>${totalCuentas}</strong> cuentas por cobrar por un total de <strong>${this.formatearMoneda(totalValor)}</strong>.<br><br>¿Desea continuar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#26a69a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarGeneracionCuentas();
      }
    });
  }

  private ejecutarGeneracionCuentas() {
    this.generandoCuentas = true;

    Swal.fire({
      title: 'Generando cuentas...',
      text: 'Por favor espere',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    this.cuentasPorCobrarService
      .generarDesdeContrato(this.model.id!, idUsuario)
      .subscribe({
        next: (response: any) => {
          this.generandoCuentas = false;
          Swal.close();

          if (response.error) {
            Swal.fire('Error', response.error, 'error');
            return;
          }

          if (response.duplicados && response.duplicados.length > 0) {
            let tablaHTML = '<table class="table table-sm table-bordered" style="font-size: 0.85rem;">';
            tablaHTML += '<thead><tr><th>Producto</th><th>Fecha</th></tr></thead><tbody>';
            response.duplicados.forEach((dup: any) => {
              tablaHTML += `<tr><td>${dup.nombre_producto}</td><td>${dup.fecha}</td></tr>`;
            });
            tablaHTML += '</tbody></table>';

            Swal.fire({
              title: 'No se pudieron generar las cuentas',
              html: `Ya existen cuentas por cobrar para los siguientes conceptos:<br><br>${tablaHTML}<br>Debe generar las cuentas de forma manual desde el módulo de Productos y Servicios.`,
              icon: 'warning',
              width: 600
            });
            return;
          }

          Swal.fire({
            title: 'Cuentas generadas exitosamente',
            html: `Se crearon <strong>${response.cuentas_creadas}</strong> cuentas por cobrar:<br><br>
                   Matrícula: <strong>${this.formatearMoneda(response.total_matricula)}</strong><br>
                   Pensiones: <strong>${this.formatearMoneda(response.total_pension)}</strong><br>
                   <hr>
                   <strong>Total: ${this.formatearMoneda(response.total_general)}</strong>`,
            icon: 'success',
            confirmButtonColor: '#26a69a'
          });
        },
        error: (error: any) => {
          this.generandoCuentas = false;
          Swal.close();
          console.error('Error al generar cuentas por cobrar:', error);
          Swal.fire('Error', 'No se pudieron generar las cuentas por cobrar', 'error');
        }
      });
  }

  // ==================== RESTO DE MÉTODOS EXISTENTES ====================

  verificarContratoExistente() {
    if (!this.model.id_estudiante || !this.model.anio) return;

    this.contratosMatriculaService
      .verificarExistente(this.model.id_estudiante, this.model.anio)
      .subscribe({
        next: (response: any) => {
          if (response.existe && this.accion === 'crear') {
            Swal.fire({
              title: 'Contrato existente',
              html: `Ya existe un contrato activo para el año ${this.model.anio}.<br>
                     ¿Desea ver el contrato existente?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, ver contrato',
              cancelButtonText: 'Continuar de todas formas',
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate([
                  '/estudiantes/contratos/consultar/' +
                    response.id_contrato +
                    '/' +
                    this.idEstudiante,
                ]);
              }
            });
          }
        },
        error: (error) => {
          console.log('Error verificando contrato:', error);
        },
      });
  }

  toggleAcudiente(idAcudiente: string) {
    if (!this.model.acudientes) {
      this.model.acudientes = [];
    }
    const index = this.model.acudientes.indexOf(idAcudiente);
    if (index > -1) {
      this.model.acudientes.splice(index, 1);
    } else {
      this.model.acudientes.push(idAcudiente);
    }
  }

  isAcudienteSeleccionado(idAcudiente: string): boolean {
    return this.model.acudientes?.includes(idAcudiente) || false;
  }

  formularioValido(): boolean {
    return !!(
      this.model.anio &&
      this.model.fecha_firma &&
      this.model.fecha_inicio &&
      this.model.fecha_fin &&
      this.model.lugar_firma &&
      this.hayLineas() &&
      this.valoresGenerados &&
      this.valores.length > 0 &&
      this.model.acudientes &&
      this.model.acudientes.length > 0
    );
  }

  validarSumaCuotasMatricula(): boolean {
    // Cada línea de matrícula tiene que cuadrar contra sus cuotas
    const lineasMatricula = this.lineasSeleccionadas()
      .filter(l => l.codigo_tipo_cobro === 'MATRICULA');

    for (const linea of lineasMatricula) {
      const sumaCuotas = this.valores
        .filter(v => v.id_producto_servicio === linea.id_producto_servicio)
        .reduce((sum, v) => sum + (v.valor || 0), 0);

      // Tolerancia de 1 peso por el redondeo del reparto en cuotas
      const diferencia = Math.abs(sumaCuotas - linea.valor_final);

      if (diferencia > 1) {
        Swal.fire({
          title: 'Error en valores de matrícula',
          html: `La suma de las cuotas de ${linea.nombre_producto} (<strong>${this.formatearMoneda(sumaCuotas)}</strong>) 
                 no coincide con el valor de la línea (<strong>${this.formatearMoneda(linea.valor_final)}</strong>).
                 <br><br>Diferencia: ${this.formatearMoneda(diferencia)}
                 <br><br>Por favor regenere los valores o ajuste manualmente.`,
          icon: 'error'
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Deja el modelo listo para guardar. Los totales de la cabecera salen de las
   * líneas y el back los vuelve a derivar del calendario al guardar.
   * Los descuentos y recargos de la cabecera se conservan como suma de las
   * líneas, para no romper lo que ya los lee.
   */
  prepararModeloParaGuardar() {
    const seleccionadas = this.lineasSeleccionadas();
    const deTipo = (codigo: string) =>
      seleccionadas.filter(l => l.codigo_tipo_cobro === codigo);

    const sumar = (lineas: LineaContrato[], campo: 'descuento' | 'recargo') =>
      lineas.reduce((suma, l) => suma + (l[campo] || 0), 0);

    (this.model as any).cuotas_matricula = this.cuotasMatricula;
    (this.model as any).descuento_matricula = sumar(deTipo('MATRICULA'), 'descuento');
    (this.model as any).recargo_matricula = sumar(deTipo('MATRICULA'), 'recargo');
    (this.model as any).descuento_pension = sumar(deTipo('PENSION'), 'descuento');
    (this.model as any).recargo_pension = sumar(deTipo('PENSION'), 'recargo');
    (this.model as any).razon_descuento = this.razon_descuento;
    (this.model as any).razon_recargo = this.razon_recargo;

    // Totales derivados del calendario que ya está en pantalla
    this.actualizarModeloDesdeResumen();
  }

  async grabar() {
    this.submitted = true;
    if (!this.formularioValido()) {
      Swal.fire(
        'Error',
        'Por favor complete todos los campos requeridos y genere los valores del contrato',
        'error'
      );
      return;
    }

    // Validar suma de cuotas de matrícula
    if (!this.validarSumaCuotasMatricula()) {
      return;
    }

    this.guardando = true;
    this.model.id_usuario_genera =
      this.utilService.obtenerIdUsuarioActual() ?? undefined;
    
    this.prepararModeloParaGuardar();

    try {
      if (this.accion === 'crear') {
        // Crear contrato
        const responseContrato: any = await this.contratosMatriculaService
          .crear(this.model)
          .toPromise();
        
        const idContrato = responseContrato.id;

        // Primero las lineas y despues el calendario: los totales de la
        // cabecera se derivan del calendario contra las lineas.
        await this.contratosMatriculaProductosService
          .guardarLineas(idContrato, this.lineasSeleccionadas())
          .toPromise();

        // Guardar valores detallados
        await this.contratosMatriculaValoresService
          .guardarValores(idContrato, this.valores)
          .toPromise();

        this.guardando = false;
        Swal.fire({
          title: 'Contrato creado',
          text: 'El contrato se ha guardado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        }).then(() => {
          this.volver();
        });
      } else {
        // Actualizar contrato
        await this.contratosMatriculaService.actualizar(this.model).toPromise();

        await this.contratosMatriculaProductosService
          .guardarLineas(this.model.id!, this.lineasSeleccionadas())
          .toPromise();

        // Guardar valores detallados
        await this.contratosMatriculaValoresService
          .guardarValores(this.model.id!, this.valores)
          .toPromise();

        this.guardando = false;
        Swal.fire({
          title: 'Contrato actualizado',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        }).then(() => {
          this.volver();
        });
      }
    } catch (error) {
      this.guardando = false;
      console.error('Error al guardar contrato:', error);
      Swal.fire('Error', 'No se pudo guardar el contrato', 'error');
    }
  }

  async grabarYGenerarPDF() {
    this.submitted = true;
    if (!this.formularioValido()) {
      Swal.fire(
        'Error',
        'Por favor complete todos los campos requeridos y genere los valores del contrato',
        'error'
      );
      return;
    }

    // Validar suma de cuotas de matrícula
    if (!this.validarSumaCuotasMatricula()) {
      return;
    }

    this.guardando = true;
    this.model.id_usuario_genera =
      this.utilService.obtenerIdUsuarioActual() ?? undefined;
    
    this.prepararModeloParaGuardar();

    try {
      // Crear contrato
      const responseContrato: any = await this.contratosMatriculaService
        .crear(this.model)
        .toPromise();
      
      const idContrato = responseContrato.id;

      await this.contratosMatriculaProductosService
        .guardarLineas(idContrato, this.lineasSeleccionadas())
        .toPromise();

      // Guardar valores detallados
      await this.contratosMatriculaValoresService
        .guardarValores(idContrato, this.valores)
        .toPromise();

      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      this.contratosMatriculaService
        .obtenerDatosContrato(idContrato)
        .subscribe({
          next: async (datos: any) => {
            await this.exportarPdfContratoService.generarPDF(datos);
            this.guardando = false;
            Swal.close();

            Swal.fire({
              title: 'Contrato creado y PDF generado',
              icon: 'success',
              confirmButtonText: 'Aceptar',
            }).then(() => {
              this.volver();
            });
          },
          error: (error: any) => {
            this.guardando = false;
            Swal.close();
            console.error('Error al generar PDF:', error);
            Swal.fire({
              title: 'Contrato guardado',
              text: 'El contrato se guardó pero hubo un error al generar el PDF',
              icon: 'warning',
            }).then(() => {
              this.volver();
            });
          },
        });
    } catch (error) {
      this.guardando = false;
      console.error('Error:', error);
      Swal.fire('Error', 'No se pudo crear el contrato', 'error');
    }
  }

  marcarComoFirmado() {
    Swal.fire({
      title: '¿Marcar como firmado?',
      text: 'Una vez marcado como firmado, el contrato no podrá ser editado.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como firmado',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.tiposDocumentosService.obtenerPorTipoPersona('estudiante').subscribe({
          next: (responseTipos: any) => {
            const tiposDocumentos = responseTipos.body;
            const tipoContratoFirmado = tiposDocumentos.find(
              (td: any) => td.codigo === 'contrato_matricula_firmado'
            );

            if (!tipoContratoFirmado) {
              console.error('No se encontró el tipo de documento contrato_matricula_firmado');
              this.marcarSinDocumento();
              return;
            }

            this.documentosPersonasService
              .obtenerPorPersona(this.estudiante.id_persona, this.model.id, tipoContratoFirmado.id)
              .subscribe({
                next: (responseDoc: any) => {
                  const documentos = responseDoc.body;
                  let rutaDocumento: string | undefined = undefined;

                  if (documentos && documentos.length > 0) {
                    rutaDocumento = documentos[0].ruta_archivo;
                  }

                  this.contratosMatriculaService
                    .marcarFirmado(this.model.id!, rutaDocumento)
                    .subscribe({
                      next: () => {
                        this.model.firmado = 1;
                        if (rutaDocumento) {
                          this.model.ruta_documento_firmado = rutaDocumento;
                        }
                        Swal.fire(
                          'Éxito',
                          'El contrato ha sido marcado como firmado',
                          'success'
                        );
                        this.editable = false;
                      },
                      error: (error: any) => {
                        console.error('Error:', error);
                        Swal.fire(
                          'Error',
                          'No se pudo actualizar el estado del contrato',
                          'error'
                        );
                      },
                    });
                },
                error: (error: any) => {
                  console.error('Error al buscar documentos:', error);
                  this.marcarSinDocumento();
                },
              });
          },
          error: (error: any) => {
            console.error('Error al obtener tipos de documentos:', error);
            this.marcarSinDocumento();
          },
        });
      }
    });
  }

  private marcarSinDocumento() {
    this.contratosMatriculaService
      .marcarFirmado(this.model.id!)
      .subscribe({
        next: () => {
          this.model.firmado = 1;
          Swal.fire(
            'Éxito',
            'El contrato ha sido marcado como firmado',
            'success'
          );
          this.editable = false;
        },
        error: (error: any) => {
          console.error('Error:', error);
          Swal.fire(
            'Error',
            'No se pudo actualizar el estado del contrato',
            'error'
          );
        },
      });
  }

  volver() {
    this.router.navigate(['/estudiantes/contratos/' + this.idEstudiante]);
  }

  formatearMoneda(valor: number): string {
    return (
      valor?.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }) || '$0'
    );
  }

  formatearFecha(fechaStr: string | undefined): string {
    if (!fechaStr) return '';
    const [fecha] = fechaStr.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  verificarDocumentoFirmado() {
    if (!this.estudiante?.id_persona || !this.model.id) return;

    this.tiposDocumentosService.obtenerPorTipoPersona('estudiante').subscribe({
      next: (responseTipos: any) => {
        const tiposDocumentos = responseTipos.body;
        const tipoContratoFirmado = tiposDocumentos.find(
          (td: any) => td.codigo === 'contrato_matricula_firmado'
        );

        if (!tipoContratoFirmado) return;

        this.documentosPersonasService
          .obtenerPorPersona(this.estudiante.id_persona, this.model.id, tipoContratoFirmado.id)
          .subscribe({
            next: (responseDoc: any) => {
              const documentos = responseDoc.body;
              this.tieneDocumentoFirmado = documentos && documentos.length > 0;
            },
            error: () => {
              this.tieneDocumentoFirmado = false;
            }
          });
      }
    });
  }

  onDocumentoSubido(evento: any) {
    if (evento.codigo_tipo === 'contrato_matricula_firmado') {
      if (evento.eliminado) {
        this.verificarDocumentoFirmado();
      } else {
        this.tieneDocumentoFirmado = true;
      }
    }
  }

  async generarPDF() {
    if (!this.model.id) {
      Swal.fire('Error', 'No hay contrato para generar PDF', 'error');
      return;
    }

    this.submitted = true;
    if (!this.formularioValido()) {
      Swal.fire(
        'Error',
        'Por favor complete todos los campos requeridos antes de generar el PDF',
        'error'
      );
      return;
    }

    this.guardando = true;

    try {
      this.prepararModeloParaGuardar();

      await this.contratosMatriculaService.actualizar(this.model).toPromise();

      await this.contratosMatriculaProductosService
        .guardarLineas(this.model.id, this.lineasSeleccionadas())
        .toPromise();

      await this.contratosMatriculaValoresService
        .guardarValores(this.model.id, this.valores)
        .toPromise();

      Swal.fire({
        title: 'Generando PDF...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      this.contratosMatriculaService
        .obtenerDatosContrato(this.model.id)
        .subscribe({
          next: async (datos: any) => {
            await this.exportarPdfContratoService.generarPDF(datos);
            this.guardando = false;
            Swal.close();

            Swal.fire({
              title: 'PDF generado',
              text: 'Los cambios se guardaron y el PDF fue generado correctamente',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error: any) => {
            this.guardando = false;
            Swal.close();
            console.error('Error al generar PDF:', error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
          },
        });
    } catch (error) {
      this.guardando = false;
      console.error('Error al guardar contrato:', error);
      Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
    }
  }
}