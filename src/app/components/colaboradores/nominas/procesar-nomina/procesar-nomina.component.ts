import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UtilService } from '../../../../common/constantes/util.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';
import { NominaConfiguracionService } from '../../../../services/nomina-configuracion.service';
import { NominasService } from '../../../../services/nominas.service';



interface ColaboradorNomina {
  id_colaborador: string;
  nombre_completo: string;
  tipo_contrato: string;
  aplica_nomina: boolean;
  salario_mensual: number;
  dias_trabajados: number;
  incluir: boolean;
  
  // Totales calculados
  total_salario: number;
  total_recargos: number;
  total_auxilio_transporte: number;
  total_devengado: number;
  total_salud: number;
  total_pension: number;
  total_deducciones_legales: number;
  total_productos: number;
  total_prestamos: number;
  total_otras_deducciones: number;
  neto_pagar: number;
  
  // Datos completos para procesamiento
  conceptos: any[];
  productos_vencidos: any[];
  prestamos_activos: any[];
  
  // Estados
  calculado: boolean;
  procesado: boolean;
}

@Component({
  selector: 'app-procesar-nomina',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procesar-nomina.component.html',
  styleUrl: './procesar-nomina.component.scss'
})
export class ProcesarNominaComponent implements OnInit, OnChanges {
  @Input() idNomina: any = null;
  @Input() fechaInicio: string = '';
  @Input() fechaFin: string = '';
  @Input() editable: boolean = true;

  colaboradores: ColaboradorNomina[] = [];
  configuracion: any = {};
  
  calculando: boolean = false;
  procesando: boolean = false;
  datosCalculados: boolean = false;

  Math = Math;

  constructor(
    private nominasService: NominasService,
    private colaboradoresService: ColaboradoresService,
    private configuracionService: NominaConfiguracionService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarConfiguracion();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // CRÍTICO: Limpiar datos cuando cambia la nómina
    if (changes['idNomina'] || changes['fechaInicio'] || changes['fechaFin']) {
      // Resetear estado
      this.datosCalculados = false;
      this.colaboradores = [];
      
      if (this.idNomina && this.fechaInicio && this.fechaFin) {
        this.cargarColaboradores();
      }
    }
  }

  cargarConfiguracion(): void {
    const anio = new Date().getFullYear();
    this.configuracionService.obtenerByAnio(anio).subscribe({
      next: (response: any) => {
        const configs = response.body;
        this.configuracion = {};
        configs.forEach((config: any) => {
          this.configuracion[config.codigo] = parseFloat(config.valor);
        });
      },
      error: (error: any) => {
        console.error('Error al cargar configuración:', error);
        Swal.fire('Error', 'Error al cargar la configuración de nómina', 'error');
      }
    });
  }

  cargarColaboradores(): void {
    this.colaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => {
        const todos: any[] = response.body;
        
        // Filtrar solo colaboradores activos
        const activos = todos.filter((c: any) => c.activo === 1);
        
        // Calcular días del periodo
        const dias = this.calcularDiasPeriodo();
        
        this.colaboradores = activos.map((c: any) => {
          const aplicaNomina = c.aplica_nomina === 1 || 
                               c.aplica_nomina === '1' || 
                               c.aplica_nomina === true;
          
          return {
            id_colaborador: c.id,
            nombre_completo: `${c.primer_nombre} ${c.segundo_nombre || ''} ${c.primer_apellido} ${c.segundo_apellido || ''}`.trim(),
            tipo_contrato: c.nombre_tipo_contrato || 'N/A',
            aplica_nomina: aplicaNomina,
            salario_mensual: parseFloat(c.salario_mensual) || 0,
            dias_trabajados: dias,
            incluir: aplicaNomina,
            
            total_salario: 0,
            total_recargos: 0,
            total_auxilio_transporte: 0,
            total_devengado: 0,
            total_salud: 0,
            total_pension: 0,
            total_deducciones_legales: 0,
            total_productos: 0,
            total_prestamos: 0,
            total_otras_deducciones: 0,
            neto_pagar: 0,
            
            conceptos: [],
            productos_vencidos: [],
            prestamos_activos: [],
            
            calculado: false,
            procesado: false
          };
        });
      },
      error: (error: any) => {
        console.error('Error al cargar colaboradores:', error);
        Swal.fire('Error', 'Error al cargar los colaboradores', 'error');
      }
    });
  }

  calcularDiasPeriodo(): number {
    if (!this.fechaInicio || !this.fechaFin) return 15;
    
    const inicio = new Date(this.fechaInicio);
    const fin = new Date(this.fechaFin);
    const diff = fin.getTime() - inicio.getTime();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    
    return dias > 0 ? dias : 15;
  }

  calcularNomina(): void {
    const colaboradoresIncluidos = this.colaboradores.filter(c => c.incluir);
    
    if (colaboradoresIncluidos.length === 0) {
      Swal.fire('Advertencia', 'Debe seleccionar al menos un colaborador', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Calcular nómina?',
      html: `Se calcularán los valores para <strong>${colaboradoresIncluidos.length}</strong> colaborador(es).<br>Esto no afectará la base de datos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, calcular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ffc107'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarCalculoNomina();
      }
    });
  }

  ejecutarCalculoNomina(): void {
    this.calculando = true;
    
    const body = {
      id_nomina: this.idNomina,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      colaboradores: this.colaboradores
        .filter(c => c.incluir)
        .map(c => ({
          id_colaborador: c.id_colaborador,
          dias_trabajados: c.dias_trabajados
        }))
    };

    console.log('📤 ENVIANDO AL BACKEND:', body);

    this.nominasService.calcularNomina(body).subscribe({
      next: (response: any) => {
        const resultado = response.body;
        
        console.log('📥 RESPUESTA COMPLETA DEL BACKEND:', resultado);
        console.log('📊 COLABORADORES EN RESPUESTA:', resultado.colaboradores);
        
        if (resultado.colaboradores && resultado.colaboradores.length > 0) {
          console.log('👤 PRIMER COLABORADOR DETALLADO:', resultado.colaboradores[0]);
          console.log('📋 CONCEPTOS DEL PRIMERO:', resultado.colaboradores[0].conceptos);
        }
        
        // Actualizar colaboradores con resultados
        this.colaboradores.forEach(col => {
          const calculado = resultado.colaboradores.find(
            (r: any) => r.id_colaborador === col.id_colaborador
          );
          
          if (calculado) {
            console.log(`✅ Aplicando cálculo a: ${col.nombre_completo}`);
            this.aplicarCalculoColaborador(col, calculado);
          } else {
            console.log(`❌ NO se encontró cálculo para: ${col.nombre_completo} (ID: ${col.id_colaborador})`);
          }
        });
        
        console.log('🎯 COLABORADORES DESPUÉS DEL CÁLCULO:', this.colaboradores);
        
        this.datosCalculados = true;
        this.calculando = false;
        
        Swal.fire({
          title: '¡Cálculo completado!',
          html: `
            <div style="text-align: left;">
              <p><strong>Colaboradores procesados:</strong> ${resultado.total_colaboradores}</p>
              <p><strong>Total devengado:</strong> ${this.formatearMoneda(resultado.totales.total_devengado)}</p>
              <p><strong>Total deducciones:</strong> ${this.formatearMoneda(resultado.totales.total_deducciones)}</p>
              <p><strong>Neto a pagar:</strong> ${this.formatearMoneda(resultado.totales.neto_total)}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      },
      error: (error: any) => {
        console.error('Error al calcular nómina:', error);
        this.calculando = false;
        Swal.fire('Error', error.error?.message || 'Error al calcular la nómina', 'error');
      }
    });
  }

  aplicarCalculoColaborador(colaborador: ColaboradorNomina, datos: any): void {
    console.log('🔧 APLICANDO CÁLCULO A:', colaborador.nombre_completo);
    console.log('📦 DATOS RECIBIDOS:', datos);
    
    // Guardar conceptos completos
    colaborador.conceptos = datos.conceptos.map((c: any) => ({
      id_concepto: c.id_concepto,
      codigo: c.codigo,
      nombre: c.nombre,
      es_suma: c.es_suma,
      cantidad: c.cantidad,
      valor_unitario: c.valor_unitario,
      valor_total: c.valor_total,
      editable: c.editable || false,
      seleccionado: true
    }));

    console.log('📋 CONCEPTOS MAPEADOS:', colaborador.conceptos);

    // Productos vencidos
    colaborador.productos_vencidos = datos.productos_vencidos.map((p: any) => ({
      id: p.id,
      nombre_producto_servicio: p.nombre_producto_servicio,
      fecha: p.fecha,
      valor: p.valor,
      saldo: p.saldo,
      fecha_vencimiento: p.fecha_vencimiento,
      seleccionado: true
    }));

    // Préstamos activos
    colaborador.prestamos_activos = datos.prestamos_activos.map((p: any) => ({
      id_prestamo: p.id_prestamo,
      id_cuota: p.id_cuota,
      numero_cuota: p.numero_cuota,
      monto_cuota: p.monto_cuota,
      fecha_programada: p.fecha_programada,
      seleccionado: true
    }));

    // Calcular totales por tipo de concepto
    const conceptosDevengados = colaborador.conceptos.filter(c => c.es_suma);
    const conceptosDeducciones = colaborador.conceptos.filter(c => !c.es_suma);

    console.log('💰 CONCEPTOS DEVENGADOS:', conceptosDevengados);
    console.log('💸 CONCEPTOS DEDUCCIONES:', conceptosDeducciones);

    // VERSIÓN ALTERNATIVA: Buscar por nombre en lugar de código
    // Devengados - Buscar por palabras clave en el nombre
    colaborador.total_salario = this.obtenerValorPorNombre(conceptosDevengados, ['SALARIO', 'SUELDO', 'BASICO']);
    colaborador.total_recargos = this.obtenerValorPorNombre(conceptosDevengados, ['RECARGO', 'NOCTURNO', 'DOMINICAL', 'FESTIVO', 'EXTRA']);
    colaborador.total_auxilio_transporte = this.obtenerValorPorNombre(conceptosDevengados, ['AUXILIO', 'TRANSPORTE', 'RODAMIENTO']);
    colaborador.total_devengado = datos.totales.devengado;

    // Deducciones legales - Buscar por palabras clave
    colaborador.total_salud = this.obtenerValorPorNombre(conceptosDeducciones, ['SALUD', 'EPS']);
    colaborador.total_pension = this.obtenerValorPorNombre(conceptosDeducciones, ['PENSION', 'PENSIÓN', 'AFP']);
    colaborador.total_deducciones_legales = datos.totales.deducciones_legales;

    // Otras deducciones
    colaborador.total_productos = this.calcularTotalProductosSeleccionados(colaborador);
    colaborador.total_prestamos = this.calcularTotalPrestamosSeleccionados(colaborador);
    colaborador.total_otras_deducciones = colaborador.total_productos + colaborador.total_prestamos;

    // Neto a pagar
    colaborador.neto_pagar = colaborador.total_devengado 
      - colaborador.total_deducciones_legales 
      - colaborador.total_otras_deducciones;
    
    console.log('✅ TOTALES CALCULADOS:', {
      salario: colaborador.total_salario,
      recargos: colaborador.total_recargos,
      auxilio: colaborador.total_auxilio_transporte,
      devengado: colaborador.total_devengado,
      salud: colaborador.total_salud,
      pension: colaborador.total_pension,
      deducciones: colaborador.total_deducciones_legales,
      neto: colaborador.neto_pagar
    });
    
    colaborador.calculado = true;
  }

  obtenerValorConcepto(conceptos: any[], codigoBuscado: string): number {
    const concepto = conceptos.find(c => c.codigo === codigoBuscado);
    return concepto ? Math.abs(concepto.valor_total) : 0;
  }

  // NUEVO MÉTODO: Buscar por palabras clave en nombre o código
  obtenerValorPorNombre(conceptos: any[], palabrasClave: string[]): number {
    for (const concepto of conceptos) {
      const textoCompleto = `${concepto.codigo || ''} ${concepto.nombre || ''}`.toUpperCase();
      
      for (const palabra of palabrasClave) {
        if (textoCompleto.includes(palabra.toUpperCase())) {
          console.log(`🎯 Encontrado "${palabra}" en: ${concepto.nombre} = ${Math.abs(concepto.valor_total)}`);
          return Math.abs(concepto.valor_total);
        }
      }
    }
    
    console.log(`❌ No se encontró ningún concepto con: ${palabrasClave.join(', ')}`);
    return 0;
  }

  calcularTotalProductosSeleccionados(colaborador: ColaboradorNomina): number {
    return colaborador.productos_vencidos
      .filter(p => p.seleccionado)
      .reduce((sum, p) => sum + p.saldo, 0);
  }

  calcularTotalPrestamosSeleccionados(colaborador: ColaboradorNomina): number {
    return colaborador.prestamos_activos
      .filter(p => p.seleccionado)
      .reduce((sum, p) => sum + p.monto_cuota, 0);
  }

  onDiasChange(colaborador: ColaboradorNomina): void {
    if (colaborador.calculado) {
      // Marcar como no calculado para que el usuario recalcule
      colaborador.calculado = false;
      Swal.fire({
        title: 'Días modificados',
        text: 'Debe volver a calcular la nómina para actualizar los valores',
        icon: 'info',
        confirmButtonText: 'Entendido'
      });
    }
  }

  procesarNomina(): void {
    const colaboradoresCalculados = this.colaboradores.filter(c => c.calculado && c.incluir);
    
    if (colaboradoresCalculados.length === 0) {
      Swal.fire('Advertencia', 'Debe calcular la nómina antes de procesarla', 'warning');
      return;
    }

    const totalNeto = colaboradoresCalculados.reduce((sum, c) => sum + c.neto_pagar, 0);

    Swal.fire({
      title: '¿Procesar nómina en firme?',
      html: `
        <div style="text-align: left;">
          <p><strong>Esta acción guardará los datos en la base de datos y no se puede deshacer.</strong></p>
          <p>Colaboradores: ${colaboradoresCalculados.length}</p>
          <p>Neto total a pagar: ${this.formatearMoneda(totalNeto)}</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarProcesamiento();
      }
    });
  }

  ejecutarProcesamiento(): void {
    this.procesando = true;

    Swal.fire({
      title: 'Procesando nómina',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const body = {
      id_nomina: this.idNomina,
      colaboradores: this.colaboradores
        .filter(c => c.calculado && c.incluir)
        .map(c => ({
          id_colaborador: c.id_colaborador,
          dias_trabajados: c.dias_trabajados,
          conceptos: c.conceptos
            .filter(con => con.seleccionado)
            .map(con => ({
              id_concepto: con.id_concepto,
              cantidad: con.cantidad,
              valor_unitario: con.valor_unitario,
              valor_total: con.valor_total
            })),
          productos_descontar: c.productos_vencidos
            .filter(p => p.seleccionado)
            .map(p => p.id),
          prestamos_descontar: c.prestamos_activos
            .filter(p => p.seleccionado)
            .map(p => p.id_cuota)
        }))
    };

    this.nominasService.procesarNomina(body).subscribe({
      next: (response: any) => {
        const resultado = response.body;
        this.procesando = false;

        Swal.fire({
          title: '¡Nómina procesada!',
          html: `
            <div style="text-align: left;">
              <p>✅ Registros en nómina: ${resultado.registros_nomina}</p>
              <p>✅ Actividades contabilizadas: ${resultado.actividades_contabilizadas}</p>
              <p>✅ Pagos de productos/servicios: ${resultado.pagos_productos}</p>
              <p>✅ Pagos de préstamos: ${resultado.pagos_prestamos}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          // Recargar datos limpiando todo
          this.datosCalculados = false;
          this.colaboradores = [];
          this.cargarColaboradores();
        });
      },
      error: (error: any) => {
        console.error('Error al procesar nómina:', error);
        this.procesando = false;
        Swal.fire('Error', error.error?.message || 'Error al procesar la nómina', 'error');
      }
    });
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  formatearNumero(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  getTotalesGenerales(): any {
    const colaboradoresCalculados = this.colaboradores.filter(c => c.calculado && c.incluir);
    
    return {
      total_salario: colaboradoresCalculados.reduce((sum, c) => sum + c.total_salario, 0),
      total_recargos: colaboradoresCalculados.reduce((sum, c) => sum + c.total_recargos, 0),
      total_auxilio: colaboradoresCalculados.reduce((sum, c) => sum + c.total_auxilio_transporte, 0),
      total_devengado: colaboradoresCalculados.reduce((sum, c) => sum + c.total_devengado, 0),
      total_salud: colaboradoresCalculados.reduce((sum, c) => sum + c.total_salud, 0),
      total_pension: colaboradoresCalculados.reduce((sum, c) => sum + c.total_pension, 0),
      total_deducciones_legales: colaboradoresCalculados.reduce((sum, c) => sum + c.total_deducciones_legales, 0),
      total_productos: colaboradoresCalculados.reduce((sum, c) => sum + c.total_productos, 0),
      total_prestamos: colaboradoresCalculados.reduce((sum, c) => sum + c.total_prestamos, 0),
      total_otras_deducciones: colaboradoresCalculados.reduce((sum, c) => sum + c.total_otras_deducciones, 0),
      neto_total: colaboradoresCalculados.reduce((sum, c) => sum + c.neto_pagar, 0)
    };
  }

  todosSeleccionados(): boolean {
    const aplicanNomina = this.colaboradores.filter(c => c.aplica_nomina);
    return aplicanNomina.length > 0 && aplicanNomina.every(c => c.incluir);
  }

  toggleTodosColaboradores(): void {
    const nuevoEstado = !this.todosSeleccionados();
    this.colaboradores.forEach(c => {
      if (c.aplica_nomina) {
        c.incluir = nuevoEstado;
      }
    });
  }
}