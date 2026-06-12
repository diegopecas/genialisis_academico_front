import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reporte-estudiantes',
  templateUrl: './reporte-estudiantes.component.html',
  styleUrls: ['./reporte-estudiantes.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteEstudiantesComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  titulo = 'Reporte General de Estudiantes';
  titulos: any[] = [];
  datos: any[] = [];
  columnasFiltro: string[] = [
    'Grupo',
    'Estado',
    'Mes Cumpleaños',
    'Estado Contrato',
    'Año',
    'Alimentación',
    'Permanente',
    'Docs. Pendientes',
  ];

  cargando = false;
  exportando = false;
  acciones: any[] = [];
  mostrarModalAyuda = false;

  cantidadSeleccionada = 0;
  resumen: any = {
    total: 0,
    activos: 0,
    inactivos: 0,
    conAlimentacion: 0,
    sinAlimentacion: 0,
    sumaMatricula: 0,
    sumaPension: 0,
    sumaTotal: 0,
    sumaMatriculaMes: 0,
    sumaPensionMes: 0,
    sumaTotalMes: 0,
    porGrupo: [] as any[],
    contratosEstado: { firmados: 0, pendientes: 0, sinContrato: 0 },
    carteraActual: {} as any,
    carteraAnterior: {} as any,
    totalActual: { cobrado: 0, pagado: 0, saldo: 0 },
    totalAnterior: { cobrado: 0, pagado: 0, saldo: 0 },
    docsCompletos: 0,
    docsConPendientes: 0,
    totalDocsPendientes: 0,
    promedioDocsPendientes: 0,
  };

  mesActual = '';

  conceptosCartera = [
    { key: 'matricula', label: 'Matrícula', campo: 'matricula' },
    { key: 'pension', label: 'Pensión', campo: 'pension' },
    { key: 'almuerzo', label: 'Almuerzo', campo: 'almuerzo' },
    { key: 'onces', label: 'Onces', campo: 'onces' },
    { key: 'horasExtras', label: 'Hr Ext.', campo: 'horas_extras' },
    { key: 'vestuario', label: 'Vestuario', campo: 'vestuario' },
  ];

  // Campos de cartera que vienen del backend
  private camposCartera = [
    'matricula_cobrado_actual',
    'matricula_pagado_actual',
    'matricula_saldo_actual',
    'matricula_cobrado_anterior',
    'matricula_pagado_anterior',
    'matricula_saldo_anterior',
    'pension_cobrado_actual',
    'pension_pagado_actual',
    'pension_saldo_actual',
    'pension_cobrado_anterior',
    'pension_pagado_anterior',
    'pension_saldo_anterior',
    'almuerzo_cobrado_actual',
    'almuerzo_pagado_actual',
    'almuerzo_saldo_actual',
    'almuerzo_cobrado_anterior',
    'almuerzo_pagado_anterior',
    'almuerzo_saldo_anterior',
    'onces_cobrado_actual',
    'onces_pagado_actual',
    'onces_saldo_actual',
    'onces_cobrado_anterior',
    'onces_pagado_anterior',
    'onces_saldo_anterior',
    'horas_extras_cobrado_actual',
    'horas_extras_pagado_actual',
    'horas_extras_saldo_actual',
    'horas_extras_cobrado_anterior',
    'horas_extras_pagado_anterior',
    'horas_extras_saldo_anterior',
    'vestuario_cobrado_actual',
    'vestuario_pagado_actual',
    'vestuario_saldo_actual',
    'vestuario_cobrado_anterior',
    'vestuario_pagado_anterior',
    'vestuario_saldo_anterior',
  ];

  // Definición de ayuda por columna
  ayudaColumnas = [
    { seccion: 'Información Básica', columnas: [
      { nombre: 'ID', descripcion: 'Identificador único del estudiante en el sistema.' },
      { nombre: 'Nombre Completo', descripcion: 'Nombre completo del estudiante (nombres y apellidos).' },
      { nombre: 'Tipo Doc.', descripcion: 'Tipo de documento de identidad (RC, TI, CC, etc.).' },
      { nombre: 'Número Doc.', descripcion: 'Número del documento de identidad.' },
      { nombre: 'F. Nacimiento', descripcion: 'Fecha de nacimiento del estudiante.' },
      { nombre: 'Edad Actual', descripcion: 'Edad actual calculada en años cumplidos.' },
      { nombre: 'Edad a Cumplir', descripcion: 'Edad que cumplirá en su próximo cumpleaños.' },
      { nombre: 'Mes Cumpleaños', descripcion: 'Mes en el que el estudiante cumple años.' },
      { nombre: 'Género', descripcion: 'Género del estudiante.' },
      { nombre: 'Dirección', descripcion: 'Dirección de residencia.' },
      { nombre: 'Grupo', descripcion: 'Grupo o curso al que está asignado actualmente.' },
      { nombre: 'F. Ingreso', descripcion: 'Fecha en que el estudiante ingresó a la institución.' },
      { nombre: 'Año', descripcion: 'Año académico de vinculación.' },
      { nombre: 'Alimentación', descripcion: 'Indica si tiene servicio de alimentación (Sí/No).' },
      { nombre: 'Permanente', descripcion: 'Indica si el estudiante es de jornada permanente (Sí/No).' },
      { nombre: 'Tel. Emergencia', descripcion: 'Teléfono de contacto para emergencias.' },
      { nombre: 'EPS', descripcion: 'Entidad Promotora de Salud del estudiante.' },
      { nombre: 'Estado', descripcion: 'Estado del estudiante: Activo o Inactivo.' },
      { nombre: 'Estado Contrato', descripcion: 'Estado del contrato de matrícula: Firmado, Pendiente o Sin contrato.' },
      { nombre: 'Acudientes', descripcion: 'Lista de acudientes registrados con su tipo de relación.' },
      { nombre: 'Docs. Pendientes', descripcion: 'Cantidad y detalle de documentos obligatorios que aún no han sido entregados.' },
    ]},
    { seccion: 'Valores del Contrato', columnas: [
      { nombre: 'Matrícula', descripcion: 'Valor total de matrícula según el contrato del año actual.' },
      { nombre: 'Pensión', descripcion: 'Valor mensual de pensión según el contrato del año actual.' },
      { nombre: 'Matr. Mes / Pens. Mes', descripcion: 'Valores de matrícula y pensión correspondientes al mes en curso.' },
    ]},
    { seccion: 'Cartera Año Actual', columnas: [
      { nombre: 'Cobrado', descripcion: 'Total facturado/generado en cuentas por cobrar para el año actual.' },
      { nombre: 'Pagado', descripcion: 'Total de pagos aplicados a cuentas del año actual.' },
      { nombre: 'Saldo', descripcion: 'Diferencia entre cobrado y pagado. En rojo si hay deuda pendiente.' },
    ]},
    { seccion: 'Cartera Años Anteriores', columnas: [
      { nombre: 'Cobrado Ant.', descripcion: 'Total facturado en años anteriores al actual.' },
      { nombre: 'Pagado Ant.', descripcion: 'Total de pagos aplicados a cuentas de años anteriores.' },
      { nombre: 'Saldo Ant.', descripcion: 'Deuda pendiente de años anteriores. En rojo si hay saldo.' },
    ]},
    { seccion: 'Conceptos de Cartera', columnas: [
      { nombre: 'Matr.', descripcion: 'Matrícula: pago único anual por vinculación.' },
      { nombre: 'Pens.', descripcion: 'Pensión: pago mensual por servicio educativo.' },
      { nombre: 'Alm.', descripcion: 'Almuerzo: servicio de alimentación principal.' },
      { nombre: 'Onc.', descripcion: 'Onces: servicio de merienda/refrigerio.' },
      { nombre: 'Hr Ext.', descripcion: 'Horas Extras: servicio de cuidado en horario extendido.' },
      { nombre: 'Vest.', descripcion: 'Vestuario: uniformes y dotación.' },
    ]},
  ];

  constructor(private estudiantesService: EstudiantesService) {}

  ngOnInit(): void {
    this.mesActual = this.obtenerNombreMesActual();
    this.crearTitulos();
    this.cargarDatos();
  }

  private obtenerNombreMesActual(): string {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    return meses[new Date().getMonth()];
  }

  crearTitulos() {
    this.titulos = [
      // Información básica
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      {
        clave: 'nombre_completo',
        alias: 'Nombre Completo',
        alinear: 'izquierda',
      },
      { clave: 'tipo_identificacion', alias: 'Tipo Doc.', alinear: 'centrado' },
      {
        clave: 'numero_identificacion',
        alias: 'Número Doc.',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_nacimiento',
        alias: 'F. Nacimiento',
        alinear: 'centrado',
      },
      { clave: 'edad', alias: 'Edad Actual', alinear: 'centrado' },
      { clave: 'edad_a_cumplir', alias: 'Edad a Cumplir', alinear: 'centrado' },
      { clave: 'mes_cumpleanos', alias: 'Mes Cumpleaños', alinear: 'centrado' },
      { clave: 'nombre_genero', alias: 'Género', alinear: 'centrado' },
      { clave: 'direccion', alias: 'Dirección', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'fecha_ingreso', alias: 'F. Ingreso', alinear: 'centrado' },
      { clave: 'anno', alias: 'Año', alinear: 'centrado' },
      {
        clave: 'alimentacion_texto',
        alias: 'Alimentación',
        alinear: 'centrado',
      },
      {
        clave: 'permanente_texto',
        alias: 'Permanente',
        alinear: 'centrado',
      },
      {
        clave: 'telefono_emergencia',
        alias: 'Tel. Emergencia',
        alinear: 'centrado',
      },
      { clave: 'eps', alias: 'EPS', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
      {
        clave: 'estado_contrato',
        alias: 'Estado Contrato',
        alinear: 'centrado',
      },
      { clave: 'acudientes', alias: 'Acudientes', alinear: 'izquierda' },
      {
        clave: 'docs_pendientes_texto',
        alias: 'Docs. Pendientes',
        alinear: 'izquierda',
      },

      // Contrato y mes actual
      {
        clave: 'valor_matricula',
        alias: 'Matrícula',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'valor_pension',
        alias: 'Pensión',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'matricula_mes_actual',
        alias: 'Matr. Mes',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_mes_actual',
        alias: 'Pens. Mes',
        alinear: 'centrado',
        tipo: 'money',
      },

      // Cartera año actual
      {
        clave: 'matricula_cobrado_actual',
        alias: 'Matr. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'matricula_pagado_actual',
        alias: 'Matr. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'matricula_saldo_actual',
        alias: 'Matr. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_cobrado_actual',
        alias: 'Pens. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_pagado_actual',
        alias: 'Pens. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_saldo_actual',
        alias: 'Pens. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_cobrado_actual',
        alias: 'Alm. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_pagado_actual',
        alias: 'Alm. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_saldo_actual',
        alias: 'Alm. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_cobrado_actual',
        alias: 'Onc. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_pagado_actual',
        alias: 'Onc. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_saldo_actual',
        alias: 'Onc. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_cobrado_actual',
        alias: 'Hr Ext. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_pagado_actual',
        alias: 'Hr Ext. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_saldo_actual',
        alias: 'Hr Ext. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_cobrado_actual',
        alias: 'Vest. Cobrado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_pagado_actual',
        alias: 'Vest. Pagado',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_saldo_actual',
        alias: 'Vest. Saldo',
        alinear: 'centrado',
        tipo: 'money',
      },

      // Cartera años anteriores
      {
        clave: 'matricula_cobrado_anterior',
        alias: 'Matr. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'matricula_pagado_anterior',
        alias: 'Matr. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'matricula_saldo_anterior',
        alias: 'Matr. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_cobrado_anterior',
        alias: 'Pens. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_pagado_anterior',
        alias: 'Pens. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'pension_saldo_anterior',
        alias: 'Pens. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_cobrado_anterior',
        alias: 'Alm. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_pagado_anterior',
        alias: 'Alm. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'almuerzo_saldo_anterior',
        alias: 'Alm. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_cobrado_anterior',
        alias: 'Onc. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_pagado_anterior',
        alias: 'Onc. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'onces_saldo_anterior',
        alias: 'Onc. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_cobrado_anterior',
        alias: 'Hr Ext. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_pagado_anterior',
        alias: 'Hr Ext. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'horas_extras_saldo_anterior',
        alias: 'Hr Ext. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_cobrado_anterior',
        alias: 'Vest. Cobrado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_pagado_anterior',
        alias: 'Vest. Pagado Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
      {
        clave: 'vestuario_saldo_anterior',
        alias: 'Vest. Saldo Ant.',
        alinear: 'centrado',
        tipo: 'money',
      },
    ];
  }

  private obtenerNombreMes(fecha: string): string {
    if (!fecha) return '';
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    try {
      const partes = fecha.split('-');
      if (partes.length >= 2) {
        const mes = parseInt(partes[1], 10) - 1;
        return meses[mes] || '';
      }
      return '';
    } catch (error) {
      return '';
    }
  }
  private calcularEdadACumplir(
    fechaNacimiento: string,
    edadActual: number,
  ): number {
    if (!fechaNacimiento) return 0;
    try {
      const cumpleanos = new Date(fechaNacimiento);
      if (isNaN(cumpleanos.getTime())) return edadActual + 1;
      return edadActual === 0 ? 1 : edadActual + 1;
    } catch (error) {
      return edadActual + 1;
    }
  }

  cargarDatos() {
    this.cargando = true;

    this.estudiantesService.obtenerReporteCompleto().subscribe({
      next: (response) => {
        const datos = response.body;
        console.log('datos', datos);
        if (Array.isArray(datos)) {
          this.datos = datos.map((est) => {
            const cantPendientes = parseInt(est.docs_pendientes_cantidad) || 0;
            const detallePendientes = est.docs_pendientes_detalle || '';

            const mapped: any = {
              ...est,
              valor_matricula: parseFloat(est.valor_matricula) || 0,
              valor_pension: parseFloat(est.valor_pension) || 0,
              matricula_mes_actual: parseFloat(est.matricula_mes_actual) || 0,
              pension_mes_actual: parseFloat(est.pension_mes_actual) || 0,
              mes_cumpleanos: this.obtenerNombreMes(est.fecha_nacimiento),
              edad_a_cumplir: this.calcularEdadACumplir(
                est.fecha_nacimiento,
                est.edad,
              ),
              docs_pendientes_cantidad: cantPendientes,
              docs_pendientes_detalle: detallePendientes,
              docs_pendientes_texto: cantPendientes > 0
                ? cantPendientes + ' pendiente' + (cantPendientes > 1 ? 's' : '') + ': ' + detallePendientes
                : 'Completo',
              color: est.activo === 0 ? '#e2e9f3' : '',
            };
            // Parsear los 36 campos de cartera
            this.camposCartera.forEach((campo) => {
              mapped[campo] = parseFloat(est[campo]) || 0;
            });
            return mapped;
          });
        } else {
          this.datos = [];
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.cargando = false;
      },
    });
  }

  onSeleccionCambiada(seleccionados: any[]) {
    this.cantidadSeleccionada = seleccionados.length;
    this.calcularResumen(seleccionados);
  }

  private sumar(arr: any[], campo: string): number {
    return arr.reduce((acc, e) => acc + (parseFloat(e[campo]) || 0), 0);
  }

  calcularResumen(seleccionados: any[]) {
    this.resumen.total = seleccionados.length;
    this.resumen.activos = seleccionados.filter(
      (e) => e.activo === 1 || e.activo === '1',
    ).length;
    this.resumen.inactivos = seleccionados.filter(
      (e) => e.activo === 0 || e.activo === '0',
    ).length;
    this.resumen.conAlimentacion = seleccionados.filter(
      (e) => e.alimentacion === 1 || e.alimentacion === '1',
    ).length;
    this.resumen.sinAlimentacion = seleccionados.filter(
      (e) => e.alimentacion === 0 || e.alimentacion === '0',
    ).length;
    this.resumen.sumaMatricula = this.sumar(seleccionados, 'valor_matricula');
    this.resumen.sumaPension = this.sumar(seleccionados, 'valor_pension');
    this.resumen.sumaTotal =
      this.resumen.sumaMatricula + this.resumen.sumaPension;
    this.resumen.sumaMatriculaMes = this.sumar(
      seleccionados,
      'matricula_mes_actual',
    );
    this.resumen.sumaPensionMes = this.sumar(
      seleccionados,
      'pension_mes_actual',
    );
    this.resumen.sumaTotalMes =
      this.resumen.sumaMatriculaMes + this.resumen.sumaPensionMes;

    this.resumen.contratosEstado = {
      firmados: seleccionados.filter((e) => e.estado_contrato === 'Firmado')
        .length,
      pendientes: seleccionados.filter((e) => e.estado_contrato === 'Pendiente')
        .length,
      sinContrato: seleccionados.filter(
        (e) => e.estado_contrato === 'Sin contrato',
      ).length,
    };

    // Documentos pendientes
    this.resumen.docsCompletos = seleccionados.filter(
      (e) => (parseInt(e.docs_pendientes_cantidad) || 0) === 0,
    ).length;
    this.resumen.docsConPendientes = seleccionados.filter(
      (e) => (parseInt(e.docs_pendientes_cantidad) || 0) > 0,
    ).length;
    this.resumen.totalDocsPendientes = seleccionados.reduce(
      (acc, e) => acc + (parseInt(e.docs_pendientes_cantidad) || 0), 0,
    );
    this.resumen.promedioDocsPendientes = seleccionados.length > 0
      ? Math.round((this.resumen.totalDocsPendientes / seleccionados.length) * 10) / 10
      : 0;

    // Cartera por concepto - actual y anterior
    this.resumen.totalActual = { cobrado: 0, pagado: 0, saldo: 0 };
    this.resumen.totalAnterior = { cobrado: 0, pagado: 0, saldo: 0 };

    this.conceptosCartera.forEach((c) => {
      const actual = {
        cobrado: this.sumar(seleccionados, c.campo + '_cobrado_actual'),
        pagado: this.sumar(seleccionados, c.campo + '_pagado_actual'),
        saldo: this.sumar(seleccionados, c.campo + '_saldo_actual'),
      };
      const anterior = {
        cobrado: this.sumar(seleccionados, c.campo + '_cobrado_anterior'),
        pagado: this.sumar(seleccionados, c.campo + '_pagado_anterior'),
        saldo: this.sumar(seleccionados, c.campo + '_saldo_anterior'),
      };
      this.resumen.carteraActual[c.key] = actual;
      this.resumen.carteraAnterior[c.key] = anterior;

      this.resumen.totalActual.cobrado += actual.cobrado;
      this.resumen.totalActual.pagado += actual.pagado;
      this.resumen.totalActual.saldo += actual.saldo;
      this.resumen.totalAnterior.cobrado += anterior.cobrado;
      this.resumen.totalAnterior.pagado += anterior.pagado;
      this.resumen.totalAnterior.saldo += anterior.saldo;
    });

    // Desglose por grupo
    const gruposMap = new Map<string, any>();

    seleccionados.forEach((e) => {
      const grupo = e.nombre_grupo || 'Sin grupo';
      const actual = gruposMap.get(grupo) || {
        cantidad: 0,
        matricula: 0,
        pension: 0,
        total: 0,
        alimentacion: 0,
        matriculaMes: 0,
        pensionMes: 0,
        totalMes: 0,
        cobradoActual: 0,
        pagadoActual: 0,
        saldoActual: 0,
        cobradoAnterior: 0,
        pagadoAnterior: 0,
        saldoAnterior: 0,
        docsCompletos: 0,
        docsPendientes: 0,
      };

      actual.cantidad++;
      actual.matricula += parseFloat(e.valor_matricula) || 0;
      actual.pension += parseFloat(e.valor_pension) || 0;
      actual.total +=
        (parseFloat(e.valor_matricula) || 0) +
        (parseFloat(e.valor_pension) || 0);
      actual.matriculaMes += parseFloat(e.matricula_mes_actual) || 0;
      actual.pensionMes += parseFloat(e.pension_mes_actual) || 0;
      actual.totalMes +=
        (parseFloat(e.matricula_mes_actual) || 0) +
        (parseFloat(e.pension_mes_actual) || 0);
      if (e.alimentacion === 1 || e.alimentacion === '1') actual.alimentacion++;

      const cantDocs = parseInt(e.docs_pendientes_cantidad) || 0;
      if (cantDocs === 0) {
        actual.docsCompletos++;
      } else {
        actual.docsPendientes++;
      }

      this.conceptosCartera.forEach((c) => {
        actual.cobradoActual += parseFloat(e[c.campo + '_cobrado_actual']) || 0;
        actual.pagadoActual += parseFloat(e[c.campo + '_pagado_actual']) || 0;
        actual.saldoActual += parseFloat(e[c.campo + '_saldo_actual']) || 0;
        actual.cobradoAnterior +=
          parseFloat(e[c.campo + '_cobrado_anterior']) || 0;
        actual.pagadoAnterior +=
          parseFloat(e[c.campo + '_pagado_anterior']) || 0;
        actual.saldoAnterior += parseFloat(e[c.campo + '_saldo_anterior']) || 0;
      });

      gruposMap.set(grupo, actual);
    });

    this.resumen.porGrupo = Array.from(gruposMap.entries())
      .map(([grupo, datos]) => ({ grupo, ...datos }))
      .sort((a: any, b: any) => a.grupo.localeCompare(b.grupo));
  }

  getCarteraConcepto(
    periodo: string,
    key: string,
  ): { cobrado: number; pagado: number; saldo: number } {
    const cartera =
      periodo === 'actual'
        ? this.resumen.carteraActual
        : this.resumen.carteraAnterior;
    return cartera[key] || { cobrado: 0, pagado: 0, saldo: 0 };
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  }

  abrirAyuda() {
    this.mostrarModalAyuda = true;
  }

  cerrarAyuda() {
    this.mostrarModalAyuda = false;
  }

  cerrarAyudaBackdrop(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrarAyuda();
    }
  }

  exportarExcel() {
    this.exportando = true;

    let datosParaExportar = this.datos;

    if (
      this.tablasComponent &&
      this.tablasComponent.tabla &&
      this.tablasComponent.tabla.datosFiltrados
    ) {
      datosParaExportar = this.tablasComponent.tabla.datosFiltrados;
    }

    const datosExportar = datosParaExportar.map((e) => {
      const row: any = {
        ID: e.id,
        'Nombre Completo': e.nombre_completo,
        'Tipo Identificación': e.tipo_identificacion,
        'Número Identificación': e.numero_identificacion,
        'Fecha Nacimiento': e.fecha_nacimiento,
        'Edad Actual': e.edad,
        'Edad a Cumplir': e.edad_a_cumplir,
        'Mes Cumpleaños': e.mes_cumpleanos,
        Género: e.nombre_genero,
        Dirección: e.direccion,
        Grupo: e.nombre_grupo,
        'Fecha Ingreso': e.fecha_ingreso,
        Año: e.anno,
        Alimentación: e.alimentacion_texto,
        Permanente: e.permanente_texto,
        'Teléfono Emergencia': e.telefono_emergencia,
        EPS: e.eps,
        Estado: e.estado,
        'Estado Contrato': e.estado_contrato,
        'ID Contrato': e.id_contrato || '',
        Acudientes: e.acudientes,
        'Docs. Pendientes': e.docs_pendientes_texto,
        'Matrícula Contrato': e.valor_matricula,
        'Pensión Contrato': e.valor_pension,
        ['Matrícula ' + this.mesActual]: e.matricula_mes_actual,
        ['Pensión ' + this.mesActual]: e.pension_mes_actual,
      };

      // Año actual
      row['Matr. Cobrado Actual'] = e.matricula_cobrado_actual;
      row['Matr. Pagado Actual'] = e.matricula_pagado_actual;
      row['Matr. Saldo Actual'] = e.matricula_saldo_actual;
      row['Pens. Cobrado Actual'] = e.pension_cobrado_actual;
      row['Pens. Pagado Actual'] = e.pension_pagado_actual;
      row['Pens. Saldo Actual'] = e.pension_saldo_actual;
      row['Alm. Cobrado Actual'] = e.almuerzo_cobrado_actual;
      row['Alm. Pagado Actual'] = e.almuerzo_pagado_actual;
      row['Alm. Saldo Actual'] = e.almuerzo_saldo_actual;
      row['Onc. Cobrado Actual'] = e.onces_cobrado_actual;
      row['Onc. Pagado Actual'] = e.onces_pagado_actual;
      row['Onc. Saldo Actual'] = e.onces_saldo_actual;
      row['Hr Ext. Cobrado Actual'] = e.horas_extras_cobrado_actual;
      row['Hr Ext. Pagado Actual'] = e.horas_extras_pagado_actual;
      row['Hr Ext. Saldo Actual'] = e.horas_extras_saldo_actual;
      row['Vest. Cobrado Actual'] = e.vestuario_cobrado_actual;
      row['Vest. Pagado Actual'] = e.vestuario_pagado_actual;
      row['Vest. Saldo Actual'] = e.vestuario_saldo_actual;

      // Años anteriores
      row['Matr. Cobrado Ant.'] = e.matricula_cobrado_anterior;
      row['Matr. Pagado Ant.'] = e.matricula_pagado_anterior;
      row['Matr. Saldo Ant.'] = e.matricula_saldo_anterior;
      row['Pens. Cobrado Ant.'] = e.pension_cobrado_anterior;
      row['Pens. Pagado Ant.'] = e.pension_pagado_anterior;
      row['Pens. Saldo Ant.'] = e.pension_saldo_anterior;
      row['Alm. Cobrado Ant.'] = e.almuerzo_cobrado_anterior;
      row['Alm. Pagado Ant.'] = e.almuerzo_pagado_anterior;
      row['Alm. Saldo Ant.'] = e.almuerzo_saldo_anterior;
      row['Onc. Cobrado Ant.'] = e.onces_cobrado_anterior;
      row['Onc. Pagado Ant.'] = e.onces_pagado_anterior;
      row['Onc. Saldo Ant.'] = e.onces_saldo_anterior;
      row['Hr Ext. Cobrado Ant.'] = e.horas_extras_cobrado_anterior;
      row['Hr Ext. Pagado Ant.'] = e.horas_extras_pagado_anterior;
      row['Hr Ext. Saldo Ant.'] = e.horas_extras_saldo_anterior;
      row['Vest. Cobrado Ant.'] = e.vestuario_cobrado_anterior;
      row['Vest. Pagado Ant.'] = e.vestuario_pagado_anterior;
      row['Vest. Saldo Ant.'] = e.vestuario_saldo_anterior;

      return row;
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');

    // Anchos de columna
    const colWidths: any[] = [];
    for (let i = 0; i < 62; i++) {
      colWidths.push({ wch: i < 2 ? (i === 0 ? 5 : 30) : 16 });
    }
    ws['!cols'] = colWidths;

    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_estudiantes_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}