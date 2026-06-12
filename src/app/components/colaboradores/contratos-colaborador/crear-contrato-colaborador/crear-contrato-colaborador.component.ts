import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CargosPlantillasContratosService } from '../../../../services/cargos-plantillas-contratos.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';
import { ConfiguracionGlobalService } from '../../../../services/configuracion-global.service';
import { ContratoColaborador, ContratosColaboradorService } from '../../../../services/contratos-colaborador.service';
import { ExportarPdfContratoColaboradorService, DatosContratoColaboradorPDF } from '../../../../services/exportar-pdf-contrato-colaborador.service';
import { NominaConfiguracionService } from '../../../../services/nomina-configuracion.service';
import { TiposContratoService } from '../../../../services/tipos-contrato.service';
import { CargosService } from '../../../../services/cargos.service';


@Component({
  selector: 'app-crear-contrato-colaborador',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    DocumentosPersonaComponent,
  ],
  templateUrl: './crear-contrato-colaborador.component.html',
  styleUrls: ['./crear-contrato-colaborador.component.scss'],
})
export class CrearContratoColaboradorComponent implements OnInit {
  idColaborador!: number;
  idContrato: number | null = null;
  esEdicion = false;

  public titulo = 'Crear contrato';
  public accion = 'crear';
  public regresar = '/colaboradores-contratos';
  public editable = true;

  colaborador: any = null;
  cargos: any[] = [];
  tiposContrato: any[] = [];
  mapeosPlantillas: any[] = [];

  // Modelo del formulario
  contrato: ContratoColaborador = {
    anio: new Date().getFullYear(),
    id_colaborador: 0,
    id_cargo: 0,
    id_tipo_contrato: 0,
    salario_mensual: 0,
    periodo_pago: 'Mensual',
    fecha_inicio: '',
    fecha_fin: null,
    periodo_prueba: '',
    lugar_desempeno: '',
    lugar_firma: '',
    fecha_firma: '',
    representante_firma_digital: 0,
  };

  // Datos para la sección de documentos/firma
  emailsFirmantes: string[] = [];
  firmantesExternos: any[] = [];
  representanteEmail = '';
  representanteNombre = '';

  guardando = false;
  contratoGuardado = false;
  submitted = false;
  tieneDocumentoFirmado = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private contratosService: ContratosColaboradorService,
    private colaboradoresService: ColaboradoresService,
    private cargosService: CargosService,
    private tiposContratoService: TiposContratoService,
    private cargosPlantillasService: CargosPlantillasContratosService,
    private configuracionGlobalService: ConfiguracionGlobalService,
    private nominaConfiguracionService: NominaConfiguracionService,
    private exportarPdfService: ExportarPdfContratoColaboradorService
  ) {}

  ngOnInit(): void {
    const accion = this.route.snapshot.paramMap.get('accion');
    const idParam = this.route.snapshot.paramMap.get('id');
    this.idColaborador = Number(
      this.route.snapshot.paramMap.get('idColaborador')
    );
    this.contrato.id_colaborador = this.idColaborador;
    this.regresar = '/colaboradores-contratos/' + this.idColaborador;

    if (accion === 'editar' && idParam && Number(idParam) > 0) {
      this.idContrato = Number(idParam);
      this.esEdicion = true;
      this.accion = 'editar';
      this.titulo = 'Editar contrato';
    } else {
      this.accion = 'crear';
      this.titulo = 'Nuevo contrato';
    }

    this.cargarCargos();
    this.cargarTiposContrato();
    this.cargarMapeosPlantillas();
    this.cargarColaborador();
    this.cargarConfiguracionRepresentante();

    if (!this.esEdicion) {
      this.cargarDefaultsNomina();
    }

    if (this.esEdicion && this.idContrato) {
      this.cargarContrato(this.idContrato);
    }
  }

  /**
   * Precarga la jornada laboral semanal desde nomina_configuracion.
   */
  private cargarCargos(): void {
    this.cargosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cargos = (response.body || []).map((c: any) => ({
          ...c,
          id: Number(c.id),
        }));
      },
      error: (error: any) => console.error('Error al cargar cargos:', error),
    });
  }

  private cargarMapeosPlantillas(): void {
    this.cargosPlantillasService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.mapeosPlantillas = response.body || [];
      },
      error: (error: any) =>
        console.error('Error al cargar mapeos de plantillas:', error),
    });
  }

  /**
   * Verifica que exista un mapeo activo de plantilla para el cargo y tipo
   * seleccionados (sin ir al servidor).
   */
  get existePlantilla(): boolean {
    return this.mapeosPlantillas.some(
      (m) =>
        Number(m.id_cargo) === Number(this.contrato.id_cargo) &&
        Number(m.id_tipo_contrato) === Number(this.contrato.id_tipo_contrato) &&
        Number(m.activo) === 1
    );
  }

  private cargarTiposContrato(): void {
    this.tiposContratoService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tiposContrato = (response.body || []).map((tc: any) => ({
          ...tc,
          id: Number(tc.id),
        }));
      },
      error: (error: any) =>
        console.error('Error al cargar tipos de contrato:', error),
    });
  }

  private cargarDefaultsNomina(): void {
    const anio = this.contrato.anio;

    this.nominaConfiguracionService
      .obtenerByCodigo('JORNADA_LABORAL_SEMANAL', anio)
      .subscribe({
        next: (response: any) => {
          const fila = (response.body as any[])[0];
          if (fila) {
            this.contrato.jornada_horas = Number(fila.valor);
          }
        },
        error: (error: any) =>
          console.error('Error al cargar jornada laboral:', error),
      });

    this.nominaConfiguracionService
      .obtenerByCodigo('PERIODO_PRUEBA_MESES', anio)
      .subscribe({
        next: (response: any) => {
          const fila = (response.body as any[])[0];
          if (fila && !this.contrato.periodo_prueba) {
            this.contrato.periodo_prueba = this.textoMeses(Number(fila.valor));
          }
        },
        error: (error: any) =>
          console.error('Error al cargar periodo de prueba:', error),
      });
  }

  /**
   * Arma el texto del periodo de prueba a partir de los meses (ej: "dos (2) meses").
   */
  private textoMeses(meses: number): string {
    const palabras: { [k: number]: string } = {
      1: 'un',
      2: 'dos',
      3: 'tres',
      4: 'cuatro',
      5: 'cinco',
      6: 'seis',
    };
    const palabra = palabras[meses] || meses.toString();
    const unidad = meses === 1 ? 'mes' : 'meses';
    return `${palabra} (${meses}) ${unidad}`;
  }

  private cargarColaborador(): void {
    this.colaboradoresService.obtenerById(this.idColaborador).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.colaborador = body[0];

        const nombre = [
          this.colaborador.primer_nombre,
          this.colaborador.segundo_nombre,
          this.colaborador.primer_apellido,
          this.colaborador.segundo_apellido,
        ]
          .filter(Boolean)
          .join(' ');
        this.colaborador.colaborador_nombre = nombre;
        this.titulo =
          (this.esEdicion ? 'Editar contrato: ' : 'Nuevo contrato: ') + nombre;

        // Precargar valores del colaborador en el contrato (editables luego)
        if (!this.esEdicion) {
          this.contrato.id_cargo = Number(this.colaborador.id_cargo) || 0;
          this.contrato.id_tipo_contrato =
            Number(this.colaborador.id_tipo_contrato) || 0;
          this.contrato.salario_mensual =
            this.colaborador.salario_mensual || 0;
          if (this.colaborador.fecha_ingreso) {
            // El input type=date requiere formato YYYY-MM-DD; si viene con
            // hora (YYYY-MM-DD HH:MM:SS) se toman los primeros 10 caracteres.
            const fecha = String(this.colaborador.fecha_ingreso).substring(0, 10);
            this.contrato.fecha_inicio = fecha;
            this.contrato.fecha_firma = fecha;
          }
        }

        // El correo del colaborador es el primer firmante digital
        if (this.colaborador?.correo_electronico) {
          this.actualizarFirmantes();
        }
      },
      error: (error: any) => console.error('Error al cargar colaborador:', error),
    });
  }

  private cargarConfiguracionRepresentante(): void {
    this.configuracionGlobalService
      .obtenerMultiples([
        'representante_legal_email',
        'representante_legal_nombre',
        'institucion_nombre',
        'institucion_direccion',
      ])
      .subscribe({
        next: (respuesta: any) => {
          // getMultiples devuelve un mapa { clave: { ...fila } } directo (sin .body)
          const data = respuesta || {};
          this.representanteEmail =
            data.representante_legal_email?.valor_texto || '';
          this.representanteNombre =
            data.representante_legal_nombre?.valor_texto || '';
          const institucionDireccion =
            data.institucion_direccion?.valor_texto || '';

          // Lugar de desempeño = dirección de la institución
          if (!this.esEdicion) {
            if (!this.contrato.lugar_desempeno) {
              this.contrato.lugar_desempeno = institucionDireccion;
            }
            if (!this.contrato.lugar_firma) {
              this.contrato.lugar_firma = institucionDireccion;
            }
          }

          this.actualizarFirmantes();
        },
        error: (error: any) =>
          console.error('Error al cargar configuración del representante:', error),
      });
  }

  private cargarContrato(id: number): void {
    this.contratosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const c = response.body;
        this.contrato = {
          id: c.id,
          numero: c.numero,
          anio: c.anio,
          id_colaborador: c.id_colaborador,
          id_cargo: Number(c.id_cargo),
          id_tipo_contrato: Number(c.id_tipo_contrato),
          id_plantilla: c.id_plantilla,
          salario_mensual: c.salario_mensual,
          periodo_pago: c.periodo_pago,
          fecha_inicio: c.fecha_inicio,
          fecha_fin: c.fecha_fin,
          periodo_prueba: c.periodo_prueba,
          jornada_horas: c.jornada_horas,
          lugar_desempeno: c.lugar_desempeno,
          lugar_firma: c.lugar_firma,
          fecha_firma: c.fecha_firma,
          representante_firma_digital: c.representante_firma_digital,
          observaciones: c.observaciones,
        };
        this.contratoGuardado = true;
        this.actualizarFirmantes();
      },
      error: (error: any) => {
        console.error('Error al cargar contrato:', error);
        Swal.fire('Error', 'No se pudo cargar el contrato', 'error');
      },
    });
  }

  /**
   * Recalcula los firmantes según el toggle del representante.
   * - El trabajador (colaborador) siempre es firmante digital.
   * - El representante se agrega como firmante externo solo si firma digital.
   */
  private actualizarFirmantes(): void {
    this.emailsFirmantes = [];
    this.firmantesExternos = [];

    const emailColaborador = this.colaborador?.correo_electronico;
    if (emailColaborador) {
      this.emailsFirmantes.push(emailColaborador);
    }

    if (
      this.contrato.representante_firma_digital === 1 &&
      this.representanteEmail
    ) {
      this.emailsFirmantes.push(this.representanteEmail);

      const partes = (this.representanteNombre || '').trim().split(/\s+/);
      const firstName = partes.slice(0, 2).join(' ') || this.representanteNombre;
      const lastName = partes.slice(2).join(' ') || '';

      this.firmantesExternos.push({
        email: this.representanteEmail,
        first_name: firstName,
        last_name: lastName,
        es_representante: true,
      });
    }
  }

  onToggleRepresentante(): void {
    this.actualizarFirmantes();
  }

  /**
   * Al cambiar la fecha de inicio, copia ese valor a la fecha de firma.
   * El usuario puede modificar luego la fecha de firma de forma independiente.
   */
  onFechaInicioChange(): void {
    this.contrato.fecha_firma = this.contrato.fecha_inicio;
  }

  /**
   * Muestra el salario con separador de miles (formato colombiano: 1.423.500).
   */
  get salarioFormateado(): string {
    const valor = this.contrato.salario_mensual;
    if (valor === null || valor === undefined || Number(valor) === 0) {
      return '';
    }
    return Number(valor).toLocaleString('es-CO');
  }

  /**
   * Al escribir, deja solo dígitos y guarda el número limpio en el modelo.
   */
  onSalarioChange(valor: string): void {
    const limpio = (valor || '').replace(/\D/g, '');
    this.contrato.salario_mensual = limpio ? Number(limpio) : 0;
  }

  /**
   * Indica si el tipo de contrato seleccionado requiere fecha de fin
   * (término fijo / obra), según la bandera de tipos_contrato.
   */
  get requiereFechaFin(): boolean {
    const tipo = this.tiposContrato.find(
      (t) => t.id === this.contrato.id_tipo_contrato
    );
    return !!tipo && Number(tipo.requiere_fecha_fin) === 1;
  }

  guardar(): void {
    this.submitted = true;
    if (!this.validar()) {
      return;
    }
    this.guardando = true;
    this.guardarContrato()
      .then(() => {
        this.guardando = false;
        Swal.fire('Guardado', 'Contrato guardado correctamente', 'success');
      })
      .catch((error: any) => {
        this.guardando = false;
        console.error('Error al guardar contrato:', error);
        const mensaje = error?.error?.error || 'No se pudo guardar el contrato';
        Swal.fire('Error', mensaje, 'error');
      });
  }

  /**
   * Persiste el contrato (crear o actualizar) y resuelve cuando termina.
   * No muestra mensajes: de eso se encargan quienes lo invocan.
   */
  private guardarContrato(): Promise<void> {
    const peticion = this.esEdicion
      ? this.contratosService.actualizar(this.contrato)
      : this.contratosService.crear(this.contrato);

    return new Promise<void>((resolve, reject) => {
      peticion.subscribe({
        next: (respuesta: any) => {
          // crear() devuelve { id }; actualizar() devuelve { id, message }
          if (!this.esEdicion && respuesta?.id) {
            this.idContrato = respuesta.id;
            this.contrato.id = respuesta.id;
            this.esEdicion = true;
            this.accion = 'editar';
            // Reflejar el modo edición en la URL sin recargar el componente,
            // para que aparezca la sección de documentos/firma.
            this.router.navigate(
              [
                '/colaboradores-contratos',
                'editar',
                this.idContrato,
                this.idColaborador,
              ],
              { replaceUrl: true }
            );
          }
          this.contratoGuardado = true;
          this.actualizarFirmantes();
          resolve();
        },
        error: (error: any) => reject(error),
      });
    });
  }

  private validar(): boolean {
    if (!this.contrato.id_cargo) {
      Swal.fire('Atención', 'Debe seleccionar un cargo', 'warning');
      return false;
    }
    if (!this.contrato.id_tipo_contrato) {
      Swal.fire('Atención', 'Debe seleccionar un tipo de contrato', 'warning');
      return false;
    }
    if (!this.contrato.salario_mensual || this.contrato.salario_mensual <= 0) {
      Swal.fire('Atención', 'Debe ingresar el salario mensual', 'warning');
      return false;
    }
    if (!this.contrato.fecha_inicio) {
      Swal.fire('Atención', 'Debe ingresar la fecha de inicio', 'warning');
      return false;
    }
    if (!this.contrato.fecha_firma) {
      Swal.fire('Atención', 'Debe ingresar la fecha de firma', 'warning');
      return false;
    }
    if (this.requiereFechaFin && !this.contrato.fecha_fin) {
      Swal.fire(
        'Atención',
        'Este tipo de contrato requiere fecha de fin',
        'warning'
      );
      return false;
    }
    if (
      this.contrato.fecha_fin &&
      this.contrato.fecha_inicio &&
      this.contrato.fecha_fin < this.contrato.fecha_inicio
    ) {
      Swal.fire(
        'Atención',
        'La fecha de fin no puede ser anterior a la fecha de inicio',
        'warning'
      );
      return false;
    }
    if (!this.existePlantilla) {
      Swal.fire(
        'Atención',
        'No existe una plantilla configurada para ese cargo y tipo de contrato',
        'warning'
      );
      return false;
    }
    return true;
  }

  async descargarPDF(): Promise<void> {
    this.submitted = true;
    if (!this.validar()) {
      return;
    }

    try {
      Swal.fire({
        title: 'Guardando y generando PDF...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Se guarda primero para que el PDF refleje los datos actuales del formulario
      await this.guardarContrato();

      const response: any = await this.contratosService
        .obtenerDatosContrato(this.idContrato)
        .toPromise();

      const body = response.body;

      const datosPDF: DatosContratoColaboradorPDF = {
        contrato: body.contrato,
        colaborador: body.contrato,
        configuracion: body.configuracion,
      };

      const resolverResp: any = await this.cargosPlantillasService
        .resolver(body.contrato.id_cargo, body.contrato.id_tipo_contrato)
        .toPromise();

      const clavePlantilla = resolverResp.body.plantilla_clave;

      await this.exportarPdfService.generarPDF(datosPDF, clavePlantilla);

      Swal.close();
    } catch (error) {
      console.error('Error al generar PDF:', error);
      Swal.fire('Error', 'No se pudo generar el PDF del contrato', 'error');
    }
  }

  onDocumentoSubido(evento: any): void {
    if (evento?.codigo_tipo === 'contrato_trabajo') {
      this.tieneDocumentoFirmado = !evento.eliminado;
    }
  }

  volver(): void {
    this.router.navigate(['/colaboradores-contratos', this.idColaborador]);
  }
}