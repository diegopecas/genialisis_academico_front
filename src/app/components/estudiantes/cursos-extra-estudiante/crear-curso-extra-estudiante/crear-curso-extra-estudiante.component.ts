import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { UtilService } from '../../../../common/constantes/util.service';
import { CursosExtraService } from '../../../../services/cursos-extra.service';
import { EstudiantesXCursosExtraService } from '../../../../services/estudiantes-x-cursos-extra.service';
import { TarifasCursosExtraService } from '../../../../services/tarifas-cursos-extra.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import Swal from 'sweetalert2';

interface ValorGenerado {
  id_producto_servicio: number;
  nombre_producto: string;
  fecha: string;
  valor: number;
  tipo: string;
  detalle: string;
}

@Component({
  selector: 'app-crear-curso-extra-estudiante',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule],
  templateUrl: './crear-curso-extra-estudiante.component.html',
  styleUrl: './crear-curso-extra-estudiante.component.scss'
})
export class CrearCursoExtraEstudianteComponent implements OnInit {

  public idEstudiante = "0";
  public idInscripcion: any = null;
  public accion = "";
  public editable = true;
  public submitted = false;
  public guardando = false;
  public generandoCuentas = false;
  public titulo = "Inscribir a Curso Extracurricular";
  public regresar = '/estudiantes-cursos-extra';

  public estudiante: any;
  public nombre_estudiante = "";
  public cursosDisponibles: any[] = [];
  public tarifa: any = null;
  public cursoSeleccionado: any = null;

  public model = {
    id_curso_extra: null,
    fecha_inicio: '',
    fecha_fin: '',
  } as any;

  // Valores editables de tarifa
  public valorMatricula: number = 0;
  public valorMatriculaFormateado: string = '';
  public cuotasMatricula: number = 1;
  public valorPension: number = 0;
  public valorPensionFormateado: string = '';
  public valorUnico: number = 0;
  public valorUnicoFormateado: string = '';
  public cuotasUnico: number = 1;

  // Valores generados
  public valoresGenerados: boolean = false;
  public valores: ValorGenerado[] = [];
  public resumen = {
    total_matricula: 0,
    total_pension: 0,
    total_unico: 0,
    total_general: 0,
    cuentas: 0
  };

  nombresMeses: any = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cursosExtraService: CursosExtraService,
    private estudiantesXCursosExtraService: EstudiantesXCursosExtraService,
    private tarifasCursosExtraService: TarifasCursosExtraService,
    private estudiantesService: EstudiantesService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private institucionConfigService: InstitucionConfigService,
    private utilService: UtilService,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['idEstudiante'];
      this.regresar = '/estudiantes-cursos-extra/' + this.idEstudiante;

      if (this.accion === 'crear') {
        this.titulo = "Inscribir a Curso Extracurricular";
        this.editable = true;
      }

      this.obtenerEstudiante(this.idEstudiante);
      this.cargarCursosDisponibles();
    });
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      if (this.accion === 'crear') {
        this.titulo = "Inscribir a " + this.nombre_estudiante;
      }
    });
  }

  cargarCursosDisponibles() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.cursosDisponibles = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar cursos", error);
      }
    });
  }

  onCursoChange() {
    this.valoresGenerados = false;
    this.valores = [];
    this.tarifa = null;

    if (!this.model.id_curso_extra) {
      this.cursoSeleccionado = null;
      return;
    }

    this.cursoSeleccionado = this.cursosDisponibles.find((c: any) => c.id == this.model.id_curso_extra);

    if (this.cursoSeleccionado) {
      this.model.fecha_inicio = this.cursoSeleccionado.fecha_inicio;
      this.model.fecha_fin = this.cursoSeleccionado.fecha_fin;
      this.cargarTarifa();
    }
  }

  cargarTarifa() {
    const anio = this.cursoSeleccionado?.anio || this.institucionConfigService.getAnioAcademicoActual();
    this.tarifasCursosExtraService.obtenerByCurso(this.model.id_curso_extra).subscribe({
      next: (response: any) => {
        const tarifas = response.body || [];
        this.tarifa = tarifas.find((t: any) => t.anio == anio) || null;
        if (this.tarifa) {
          this.valorMatricula = parseFloat(this.tarifa.valor_matricula) || 0;
          this.valorMatriculaFormateado = this.formatearNumero(this.valorMatricula);
          this.cuotasMatricula = this.tarifa.cuotas_matricula || 1;
          this.valorPension = parseFloat(this.tarifa.valor_pension) || 0;
          this.valorPensionFormateado = this.formatearNumero(this.valorPension);
          this.valorUnico = parseFloat(this.tarifa.valor_unico) || 0;
          this.valorUnicoFormateado = this.formatearNumero(this.valorUnico);
          this.cuotasUnico = this.tarifa.cuotas_unico || 1;
        } else {
          Swal.fire('Advertencia', `No hay tarifa configurada para el curso en el año ${anio}`, 'warning');
        }
      },
      error: (error: any) => {
        console.error("Error al cargar tarifa", error);
      }
    });
  }

  // ==================== INPUTS DE VALORES ====================

  onValorMatriculaInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.valorMatricula = valorStr ? parseInt(valorStr) : 0;
    event.target.value = this.valorMatricula > 0 ? this.valorMatricula.toLocaleString('es-CO') : '';
  }

  onValorPensionInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.valorPension = valorStr ? parseInt(valorStr) : 0;
    event.target.value = this.valorPension > 0 ? this.valorPension.toLocaleString('es-CO') : '';
  }

  onValorUnicoInput(event: any) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.valorUnico = valorStr ? parseInt(valorStr) : 0;
    event.target.value = this.valorUnico > 0 ? this.valorUnico.toLocaleString('es-CO') : '';
  }

  // ==================== GENERACIÓN DE VALORES ====================

  generarValores() {
    if (!this.model.id_curso_extra) {
      Swal.fire('Advertencia', 'Seleccione un curso', 'warning');
      return;
    }
    if (!this.model.fecha_inicio || !this.model.fecha_fin) {
      Swal.fire('Advertencia', 'Debe indicar fecha de inicio y fin', 'warning');
      return;
    }
    if (this.valorMatricula === 0 && this.valorPension === 0 && this.valorUnico === 0) {
      Swal.fire('Advertencia', 'Debe configurar al menos un valor (matrícula, pensión o cobro único)', 'warning');
      return;
    }

    if (this.valoresGenerados && this.valores.length > 0) {
      Swal.fire({
        title: '¿Regenerar valores?',
        text: 'Esto reemplazará los valores actuales.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, regenerar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.ejecutarGeneracion();
        }
      });
    } else {
      this.ejecutarGeneracion();
    }
  }

  private ejecutarGeneracion() {
    this.valores = [];
    const fechaInicio = new Date(this.model.fecha_inicio + 'T00:00:00');
    const fechaFin = new Date(this.model.fecha_fin + 'T00:00:00');
    const nombreCurso = this.cursoSeleccionado?.nombre || 'Curso';

    // Matrícula (diferida desde fecha inicio)
    if (this.tarifa?.id_producto_matricula && this.valorMatricula > 0) {
      const cuotas = this.cuotasMatricula || 1;
      const valorCuota = Math.round((this.valorMatricula / cuotas) * 100) / 100;

      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        const fechaStr = this.formatearFechaISO(fechaCuota);

        this.valores.push({
          id_producto_servicio: this.tarifa.id_producto_matricula,
          nombre_producto: this.tarifa.nombre_producto_matricula || 'Matrícula',
          fecha: fechaStr,
          valor: valorCuota,
          tipo: 'matricula',
          detalle: `Matrícula ${nombreCurso} - Cuota ${i + 1}/${cuotas}`
        });
      }
    }

    // Pensión mensual (desde fecha inicio, no día 1)
    if (this.tarifa?.id_producto_pension && this.valorPension > 0) {
      const current = new Date(fechaInicio);
      while (current <= fechaFin) {
        const fechaStr = this.formatearFechaISO(current);

        this.valores.push({
          id_producto_servicio: this.tarifa.id_producto_pension,
          nombre_producto: this.tarifa.nombre_producto_pension || 'Pensión',
          fecha: fechaStr,
          valor: this.valorPension,
          tipo: 'pension',
          detalle: `Pensión ${nombreCurso} - ${this.formatearMesAnio(current)}`
        });

        const siguiente = new Date(current);
        siguiente.setMonth(siguiente.getMonth() + 1);
        current.setTime(siguiente.getTime());
      }
    }

    // Cobro único (diferido desde fecha inicio)
    if (this.tarifa?.id_producto_unico && this.valorUnico > 0) {
      const cuotas = this.cuotasUnico || 1;
      const valorCuota = Math.round((this.valorUnico / cuotas) * 100) / 100;

      for (let i = 0; i < cuotas; i++) {
        const fechaCuota = new Date(fechaInicio);
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
        const fechaStr = this.formatearFechaISO(fechaCuota);

        this.valores.push({
          id_producto_servicio: this.tarifa.id_producto_unico,
          nombre_producto: this.tarifa.nombre_producto_unico || 'Cobro Único',
          fecha: fechaStr,
          valor: valorCuota,
          tipo: 'unico',
          detalle: `${nombreCurso} - Cuota ${i + 1}/${cuotas}`
        });
      }
    }

    this.valores.sort((a, b) => a.fecha.localeCompare(b.fecha));
    this.valoresGenerados = true;
    this.calcularResumen();
  }

  calcularResumen() {
    this.resumen = { total_matricula: 0, total_pension: 0, total_unico: 0, total_general: 0, cuentas: this.valores.length };
    this.valores.forEach(v => {
      if (v.tipo === 'matricula') this.resumen.total_matricula += v.valor;
      else if (v.tipo === 'pension') this.resumen.total_pension += v.valor;
      else this.resumen.total_unico += v.valor;
    });
    this.resumen.total_general = this.resumen.total_matricula + this.resumen.total_pension + this.resumen.total_unico;
  }

  // ==================== EDICIÓN DE VALORES EN TABLA ====================

  onValorTablaInput(event: any, valor: ValorGenerado) {
    let valorStr = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    valor.valor = valorStr ? parseInt(valorStr) : 0;
    if (valor.valor > 0) {
      event.target.value = valor.valor.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
    this.calcularResumen();
  }

  onBlurValorTabla(event: any, valor: ValorGenerado) {
    event.target.value = this.formatearNumero(valor.valor);
  }

  onFechaChange(valor: ValorGenerado) {
    this.calcularResumen();
  }

  eliminarValor(index: number) {
    this.valores.splice(index, 1);
    this.calcularResumen();
  }

  // ==================== VALIDACIONES ====================

  validarSumas(): boolean {
    // Validar matrícula
    if (this.valorMatricula > 0) {
      const sumaMatricula = this.valores.filter(v => v.tipo === 'matricula').reduce((s, v) => s + v.valor, 0);
      const diffMatricula = Math.abs(sumaMatricula - this.valorMatricula);
      if (diffMatricula > 1) {
        Swal.fire({
          title: 'Error en valores de matrícula',
          html: `La suma de cuotas de matrícula (<strong>${this.formatearMoneda(sumaMatricula)}</strong>) no coincide con el valor configurado (<strong>${this.formatearMoneda(this.valorMatricula)}</strong>).<br>Diferencia: ${this.formatearMoneda(diffMatricula)}`,
          icon: 'error'
        });
        return false;
      }
    }

    // Validar cobro único
    if (this.valorUnico > 0) {
      const sumaUnico = this.valores.filter(v => v.tipo === 'unico').reduce((s, v) => s + v.valor, 0);
      const diffUnico = Math.abs(sumaUnico - this.valorUnico);
      if (diffUnico > 1) {
        Swal.fire({
          title: 'Error en valores de cobro único',
          html: `La suma de cuotas (<strong>${this.formatearMoneda(sumaUnico)}</strong>) no coincide con el valor configurado (<strong>${this.formatearMoneda(this.valorUnico)}</strong>).<br>Diferencia: ${this.formatearMoneda(diffUnico)}`,
          icon: 'error'
        });
        return false;
      }
    }

    return true;
  }

  async validarFechas(): Promise<boolean> {
    const inicio = new Date(this.model.fecha_inicio + 'T00:00:00');
    const fin = new Date(this.model.fecha_fin + 'T00:00:00');
    const fueraDeRango: ValorGenerado[] = [];

    this.valores.forEach(v => {
      const fecha = new Date(v.fecha + 'T00:00:00');
      if (fecha < inicio || fecha > fin) {
        fueraDeRango.push(v);
      }
    });

    if (fueraDeRango.length > 0) {
      const result = await Swal.fire({
        title: 'Fechas fuera de rango',
        html: `Hay <strong>${fueraDeRango.length}</strong> cobro(s) con fecha fuera del período ${this.model.fecha_inicio} al ${this.model.fecha_fin}.<br><br>¿Desea continuar de todas formas?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      return result.isConfirmed;
    }

    return true;
  }

  // ==================== GUARDAR INSCRIPCIÓN ====================

  guardar() {
    this.submitted = true;

    if (!this.model.id_curso_extra) {
      Swal.fire('Advertencia', 'Debe seleccionar un curso', 'warning');
      return;
    }

    this.guardando = true;

    const data = {
      id_estudiante: parseInt(this.idEstudiante),
      id_curso_extra: parseInt(this.model.id_curso_extra),
      fecha_inscripcion: new Date().toISOString().split('T')[0],
      anio: this.cursoSeleccionado?.anio || this.institucionConfigService.getAnioAcademicoActual()
    };

    this.estudiantesXCursosExtraService.crear(data).subscribe({
      next: (response: any) => {
        this.guardando = false;
        this.idInscripcion = response.id;
        Swal.fire({
          toast: true, position: 'top-end', icon: 'success',
          title: 'Estudiante inscrito correctamente',
          showConfirmButton: false, timer: 2000
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error("Error al inscribir", error);
        Swal.fire('Error', 'No se pudo inscribir al estudiante', 'error');
      }
    });
  }

  // ==================== GENERAR CUENTAS POR COBRAR ====================

  async generarCuentasPorCobrar() {
    if (!this.idInscripcion || !this.valoresGenerados || this.valores.length === 0) {
      Swal.fire('Error', 'Primero debe guardar la inscripción y generar los valores', 'error');
      return;
    }

    if (!this.validarSumas()) return;

    const fechasOk = await this.validarFechas();
    if (!fechasOk) return;

    Swal.fire({
      title: 'Generar Cuentas por Cobrar',
      html: `Se generarán <strong>${this.valores.length}</strong> cuentas por un total de <strong>${this.formatearMoneda(this.resumen.total_general)}</strong>.<br><br>¿Desea continuar?`,
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
      didOpen: () => { Swal.showLoading(); }
    });

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    console.log('DEBUG idInscripcion antes de data:', this.idInscripcion);
    
    const data = {
      id_persona: this.estudiante.id_persona,
      id_usuario: idUsuario,
      id_curso_extra: parseInt(this.model.id_curso_extra),
      id_inscripcion: this.idInscripcion,
      valores: this.valores.map(v => ({
        id_producto_servicio: v.id_producto_servicio,
        nombre_producto: v.nombre_producto,
        fecha: v.fecha,
        valor: v.valor,
        tipo: v.tipo,
        detalle: v.detalle
      }))
    };

    console.log('DEBUG data completo:', JSON.stringify(data));

    this.cuentasPorCobrarService.generarDesdeCursoExtra(data).subscribe({
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
            title: 'Cuentas duplicadas',
            html: `Ya existen cuentas por cobrar para:<br><br>${tablaHTML}`,
            icon: 'warning',
            width: 600
          });
          return;
        }

        Swal.fire({
          title: 'Cuentas generadas',
          html: `Se crearon <strong>${response.cuentas_creadas}</strong> cuentas por cobrar:<br><br>
                 ${response.total_matricula > 0 ? 'Matrícula: <strong>' + this.formatearMoneda(response.total_matricula) + '</strong><br>' : ''}
                 ${response.total_pension > 0 ? 'Pensiones: <strong>' + this.formatearMoneda(response.total_pension) + '</strong><br>' : ''}
                 ${response.total_unico > 0 ? 'Cobro único: <strong>' + this.formatearMoneda(response.total_unico) + '</strong><br>' : ''}
                 <hr>
                 <strong>Total: ${this.formatearMoneda(response.total_general)}</strong>`,
          icon: 'success',
          confirmButtonColor: '#26a69a'
        });
      },
      error: (error: any) => {
        this.generandoCuentas = false;
        Swal.close();
        console.error('Error al generar cuentas:', error);
        Swal.fire('Error', 'No se pudieron generar las cuentas por cobrar', 'error');
      }
    });
  }

  // ==================== UTILIDADES ====================

  formatearFechaISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatearMesAnio(fecha: Date): string {
    const mes = this.nombresMeses[fecha.getMonth() + 1];
    return `${mes} ${fecha.getFullYear()}`;
  }

  formatearNumero(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }) || '$0';
  }

  getTipoLabel(tipo: string): string {
    switch (tipo) {
      case 'matricula': return 'Matrícula';
      case 'pension': return 'Pensión';
      case 'unico': return 'Cobro Único';
      default: return tipo;
    }
  }

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'matricula': return 'bg-primary';
      case 'pension': return 'bg-success';
      case 'unico': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  volver() {
    this.router.navigate(['/estudiantes-cursos-extra/' + this.idEstudiante]);
  }
}