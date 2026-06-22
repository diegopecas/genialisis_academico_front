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

// Interfaz para agrupar valores por mes
interface ValorMensual {
  fecha: string;
  fechaFormateada: string;
  mes: number;
  anio: number;
  matricula: ContratoValor | null;
  pension: ContratoValor | null;
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
  public regresar = '/estudiantes-contratos/';

  public acudientesDisponibles = [] as any[];
  public tarifaGrupo: any = null;
  public emailsFirmantes: string[] = [];

  // Nuevas propiedades para valores detallados
  public valores: ContratoValor[] = [];
  public valoresMensuales: ValorMensual[] = [];
  public resumenValores: ResumenValores = {
    total_matricula: 0,
    total_pension: 0,
    numero_cuotas: 0,
    valor_total: 0
  };
  public cuotasMatricula: number = 1;
  public valoresGenerados: boolean = false;

  public valorMatriculaFormateado: string = '';
  public valorPensionFormateado: string = '';

  // Propiedades para descuentos y recargos
  public matriculaBase: number = 0;
  public pensionBase: number = 0;
  public descuento_matricula: number = 0;
  public recargo_matricula: number = 0;
  public descuento_pension: number = 0;
  public recargo_pension: number = 0;
  public razon_descuento: string = '';
  public razon_recargo: string = '';
  public matriculaFinal: number = 0;
  public pensionFinal: number = 0;
  public formateados = {
    descuentoMatricula: '',
    recargoMatricula: '',
    descuentoPension: '',
    recargoPension: '',
    matriculaFinal: '',
    pensionFinal: ''
  };

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

          // Cargar valores detallados
          this.cargarValoresContrato(id);

          // Cargar cuotas matrícula del contrato
          if (contrato.cuotas_matricula) {
            this.cuotasMatricula = parseInt(contrato.cuotas_matricula);
          }

          // Cargar descuentos y recargos del contrato
          this.descuento_matricula = parseFloat(contrato.descuento_matricula) || 0;
          this.recargo_matricula = parseFloat(contrato.recargo_matricula) || 0;
          this.descuento_pension = parseFloat(contrato.descuento_pension) || 0;
          this.recargo_pension = parseFloat(contrato.recargo_pension) || 0;
          this.razon_descuento = contrato.razon_descuento || '';
          this.razon_recargo = contrato.razon_recargo || '';
          
          console.log('=== DESCUENTOS CARGADOS ===', {
            descuento_matricula: this.descuento_matricula,
            recargo_matricula: this.recargo_matricula,
            descuento_pension: this.descuento_pension,
            recargo_pension: this.recargo_pension
          });
          
          // Los valores finales del contrato
          this.matriculaFinal = parseFloat(contrato.valor_matricula) || 0;
          this.pensionFinal = parseFloat(contrato.valor_pension) || 0;
          
          // Actualizar formatos para mostrar en los inputs
          this.actualizarFormatos();
          
          console.log('=== FORMATOS ACTUALIZADOS ===', this.formateados);

          this.verificarDocumentoFirmado();
        }
      });
  }

  // Cargar tarifas después de tener el estudiante cargado (para edición)
  cargarTarifasParaEdicion() {
    if (!this.estudiante?.id_grupo || !this.model.anio) return;

    this.tarifasGruposService
      .obtenerByGrupoAnio(this.estudiante.id_grupo, this.model.anio)
      .subscribe({
        next: (response: any) => {
          this.tarifaGrupo = response.body;
          if (this.tarifaGrupo) {
            this.matriculaBase = parseFloat(this.tarifaGrupo.valor_matricula) || 0;
            this.pensionBase = parseFloat(this.tarifaGrupo.valor_pension) || 0;
            // Actualizar formatos
            this.calcularValoresFinales();
            this.actualizarFormatos();
          }
        },
        error: (error) => {
          console.log('No se encontraron tarifas para el grupo');
          this.tarifaGrupo = null;
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
          this.tarifaGrupo = response.body;
          if (this.tarifaGrupo) {
            // Inicializar valores base desde tarifas
            this.matriculaBase = parseFloat(this.tarifaGrupo.valor_matricula) || 0;
            this.pensionBase = parseFloat(this.tarifaGrupo.valor_pension) || 0;
            
            // Si es crear, inicializar valores finales = base
            if (this.accion === 'crear') {
              this.matriculaFinal = this.matriculaBase;
              this.pensionFinal = this.pensionBase;
              this.descuento_matricula = 0;
              this.recargo_matricula = 0;
              this.descuento_pension = 0;
              this.recargo_pension = 0;
            }
            // Calcular valores finales y actualizar formatos
            this.calcularValoresFinales();
            this.actualizarFormatos();
          }
        },
        error: (error) => {
          console.log('No se encontraron tarifas para el grupo');
          this.tarifaGrupo = null;
        },
      });
  }

  // ==================== GESTIÓN DE DESCUENTOS Y RECARGOS ====================

  calcularValoresFinales() {
    this.matriculaFinal = this.matriculaBase - this.descuento_matricula + this.recargo_matricula;
    this.pensionFinal = this.pensionBase - this.descuento_pension + this.recargo_pension;
    if (this.matriculaFinal < 0) this.matriculaFinal = 0;
    if (this.pensionFinal < 0) this.pensionFinal = 0;
  }

  actualizarFormatos() {
    this.formateados.descuentoMatricula = this.formatearNumeroInput(this.descuento_matricula);
    this.formateados.recargoMatricula = this.formatearNumeroInput(this.recargo_matricula);
    this.formateados.descuentoPension = this.formatearNumeroInput(this.descuento_pension);
    this.formateados.recargoPension = this.formatearNumeroInput(this.recargo_pension);
    this.formateados.matriculaFinal = this.formatearNumeroInput(this.matriculaFinal);
    this.formateados.pensionFinal = this.formatearNumeroInput(this.pensionFinal);
  }

  formatearNumeroInput(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  onDescuentoMatriculaInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.descuento_matricula = valorStr ? parseInt(valorStr) : 0;
    this.calcularValoresFinales();
    this.actualizarFormatos();
    event.target.value = this.formatearNumeroInput(this.descuento_matricula);
  }

  onRecargoMatriculaInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.recargo_matricula = valorStr ? parseInt(valorStr) : 0;
    this.calcularValoresFinales();
    this.actualizarFormatos();
    event.target.value = this.formatearNumeroInput(this.recargo_matricula);
  }

  onDescuentoPensionInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.descuento_pension = valorStr ? parseInt(valorStr) : 0;
    this.calcularValoresFinales();
    this.actualizarFormatos();
    event.target.value = this.formatearNumeroInput(this.descuento_pension);
  }

  onRecargoPensionInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.recargo_pension = valorStr ? parseInt(valorStr) : 0;
    this.calcularValoresFinales();
    this.actualizarFormatos();
    event.target.value = this.formatearNumeroInput(this.recargo_pension);
  }

  hayDescuentos(): boolean {
    return this.descuento_matricula > 0 || this.descuento_pension > 0;
  }

  hayRecargos(): boolean {
    return this.recargo_matricula > 0 || this.recargo_pension > 0;
  }

  // Métodos para la tabla de valores mensuales
  formatearNumeroTabla(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  onInputValorTabla(event: any, vm: any, tipo: string) {
    // Obtener solo dígitos
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    const nuevoValor = valorStr ? parseInt(valorStr) : 0;
    
    // Actualizar el valor en el objeto
    if (tipo === 'matricula' && vm.matricula) {
      vm.matricula.valor = nuevoValor;
    } else if (tipo === 'pension' && vm.pension) {
      vm.pension.valor = nuevoValor;
    }
    
    // Actualizar el total del mes
    vm.totalMes = (vm.matricula?.valor || 0) + (vm.pension?.valor || 0);
    
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

  onBlurValorTabla(event: any, vm: any, tipo: string) {
    // Al salir, asegurar formato correcto
    let valor = 0;
    if (tipo === 'matricula' && vm.matricula) {
      valor = vm.matricula.valor || 0;
    } else if (tipo === 'pension' && vm.pension) {
      valor = vm.pension.valor || 0;
    }
    event.target.value = this.formatearNumeroTabla(valor);
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
        // Enviar valores finales (con descuentos/recargos aplicados)
        valor_matricula: this.matriculaFinal,
        valor_pension: this.pensionFinal
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
          matricula: null,
          pension: null,
          totalMes: 0
        });
      }

      const grupo = grupos.get(fecha)!;
      
      // Periodicidad 1 = Anual (Matrícula), 2 = Mensual (Pensión)
      if (valor.id_periodicidad_cobro === 1 || valor.es_matricula) {
        grupo.matricula = valor;
      } else {
        grupo.pension = valor;
      }
      
      grupo.totalMes = (grupo.matricula?.valor || 0) + (grupo.pension?.valor || 0);
    });

    this.valoresMensuales = Array.from(grupos.values()).sort((a, b) => 
      a.fecha.localeCompare(b.fecha)
    );
  }

  formatearMesAnio(fecha: Date): string {
    const mes = this.nombresMeses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${mes} ${anio}`;
  }

  onValorChange(valorMensual: ValorMensual, tipo: 'matricula' | 'pension', event: any) {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    const nuevoValor = inputValue === '' ? 0 : parseFloat(inputValue);

    if (tipo === 'matricula' && valorMensual.matricula) {
      valorMensual.matricula.valor = nuevoValor;
    } else if (tipo === 'pension' && valorMensual.pension) {
      valorMensual.pension.valor = nuevoValor;
    }

    valorMensual.totalMes = (valorMensual.matricula?.valor || 0) + (valorMensual.pension?.valor || 0);
    
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
    let numeroCuotas = 0;

    this.valoresMensuales.forEach(vm => {
      if (vm.matricula) {
        totalMatricula += vm.matricula.valor;
      }
      if (vm.pension) {
        totalPension += vm.pension.valor;
        numeroCuotas++;
      }
    });

    this.resumenValores = {
      total_matricula: totalMatricula,
      total_pension: totalPension,
      numero_cuotas: numeroCuotas,
      valor_total: totalMatricula + totalPension
    };
  }

  actualizarModeloDesdeResumen() {
    this.model.valor_matricula = this.resumenValores.total_matricula;
    this.model.valor_pension = this.resumenValores.total_pension;
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
    if (!this.tarifaGrupo || this.cuotasMatricula < 1) return;

    const valorCuotaMatricula = Math.round(this.tarifaGrupo.valor_matricula / this.cuotasMatricula);
    let cuotasAsignadas = 0;

    this.valoresMensuales.forEach((vm, index) => {
      if (cuotasAsignadas < this.cuotasMatricula) {
        // Agregar o actualizar cuota de matrícula
        if (!vm.matricula) {
          vm.matricula = {
            id_producto_servicio: this.tarifaGrupo.id_producto_matricula,
            nombre_producto: this.tarifaGrupo.nombre_matricula,
            fecha: vm.fecha,
            valor: valorCuotaMatricula,
            id_periodicidad_cobro: 1,
            es_matricula: true
          };
          this.valores.push(vm.matricula);
        } else {
          vm.matricula.valor = valorCuotaMatricula;
        }
        cuotasAsignadas++;
      } else if (vm.matricula) {
        // Quitar matrícula de este mes
        const idx = this.valores.indexOf(vm.matricula);
        if (idx > -1) {
          this.valores.splice(idx, 1);
        }
        vm.matricula = null;
      }
      
      vm.totalMes = (vm.matricula?.valor || 0) + (vm.pension?.valor || 0);
    });

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
                  '/estudiantes-contratos/consultar/' +
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
      this.valoresGenerados &&
      this.valores.length > 0 &&
      this.model.acudientes &&
      this.model.acudientes.length > 0
    );
  }

  validarSumaCuotasMatricula(): boolean {
    // Sumar todos los valores de matrícula en los valores detallados
    const sumaMatricula = this.valores
      .filter(v => v.id_periodicidad_cobro === 1) // Solo matrícula
      .reduce((sum, v) => sum + (v.valor || 0), 0);
    
    // Comparar con el valor final de matrícula (con tolerancia de 1 peso por redondeo)
    const diferencia = Math.abs(sumaMatricula - this.matriculaFinal);
    
    if (diferencia > 1) {
      Swal.fire({
        title: 'Error en valores de matrícula',
        html: `La suma de las cuotas de matrícula (<strong>${this.formatearMoneda(sumaMatricula)}</strong>) 
               no coincide con el valor de matrícula (<strong>${this.formatearMoneda(this.matriculaFinal)}</strong>).
               <br><br>Diferencia: ${this.formatearMoneda(diferencia)}
               <br><br>Por favor regenere los valores o ajuste manualmente.`,
        icon: 'error'
      });
      return false;
    }
    return true;
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
    
    // Agregar campos adicionales al modelo
    (this.model as any).cuotas_matricula = this.cuotasMatricula;
    (this.model as any).descuento_matricula = this.descuento_matricula;
    (this.model as any).recargo_matricula = this.recargo_matricula;
    (this.model as any).descuento_pension = this.descuento_pension;
    (this.model as any).recargo_pension = this.recargo_pension;
    (this.model as any).razon_descuento = this.razon_descuento;
    (this.model as any).razon_recargo = this.razon_recargo;
    
    // Actualizar valores del modelo con los finales
    this.model.valor_matricula = this.matriculaFinal;
    this.model.valor_pension = this.pensionFinal;

    try {
      if (this.accion === 'crear') {
        // Crear contrato
        const responseContrato: any = await this.contratosMatriculaService
          .crear(this.model)
          .toPromise();
        
        const idContrato = responseContrato.id;

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
    
    // Agregar campos adicionales al modelo
    (this.model as any).cuotas_matricula = this.cuotasMatricula;
    (this.model as any).descuento_matricula = this.descuento_matricula;
    (this.model as any).recargo_matricula = this.recargo_matricula;
    (this.model as any).descuento_pension = this.descuento_pension;
    (this.model as any).recargo_pension = this.recargo_pension;
    (this.model as any).razon_descuento = this.razon_descuento;
    (this.model as any).razon_recargo = this.razon_recargo;
    
    // Actualizar valores del modelo con los finales
    this.model.valor_matricula = this.matriculaFinal;
    this.model.valor_pension = this.pensionFinal;

    try {
      // Crear contrato
      const responseContrato: any = await this.contratosMatriculaService
        .crear(this.model)
        .toPromise();
      
      const idContrato = responseContrato.id;

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
    this.router.navigate(['/estudiantes-contratos/' + this.idEstudiante]);
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
      await this.contratosMatriculaService.actualizar(this.model).toPromise();

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