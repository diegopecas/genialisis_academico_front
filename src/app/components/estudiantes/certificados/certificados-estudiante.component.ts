import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { CertificadosExpedidosService } from '../../../services/certificados-expedidos.service';
import { ExportarPdfCertificadoService } from '../../../services/exportar-pdf-certificado.service';
import { AcudientesService } from '../../../services/acudientes.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-certificados-estudiante',
  templateUrl: './certificados-estudiante.component.html',
  styleUrl: './certificados-estudiante.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CertificadosEstudianteComponent implements OnInit {

  public titulo = 'Certificados';
  public idEstudiante = '';
  public nombreEstudiante = '';

  public certificados = [] as any[];
  public acudientes = [] as any[];
  public anios = [] as number[];
  public historial = [] as any[];
  public grupos = [] as any[];
  public saldoTotal = 0;
  public saldoVencido = 0;

  public claveSeleccionada = '';
  public idAcudiente: string | null = null;
  public anioCertificado: number | null = null;
  public fechaDesde = '';
  public fechaHasta = '';
  public dirigidoA = '';
  public seleccionProductos = new Set<string>();
  public formato = 'recibo';
  public mostrarConceptos = true;
  public soloMensuales = false;

  public generando = false;
  public submitted = false;

  public pestanaActiva = 'generar';
  public menuMovilAbierto = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private certificadosService: CertificadosExpedidosService,
    private exportarPdfService: ExportarPdfCertificadoService,
    private acudientesService: AcudientesService,
    private estudiantesService: EstudiantesService,
    private productosService: ProductosServiciosService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.idEstudiante = params['id'];
      this.cargarEstudiante();
      this.cargarCertificados();
      this.cargarAcudientes();
      this.cargarAnios();
      this.cargarHistorial();
      this.cargarProductos();
    });

    this.prellenarAnioActual();
  }

  /**
   * El rango por defecto es el año en curso, que es el caso de siempre:
   * el acudiente pide el certificado para la declaración de renta.
   */
  private prellenarAnioActual(): void {
    const anio = new Date().getFullYear();
    this.fechaDesde = `${anio}-01-01`;
    // No se certifican pagos futuros: el año arranca hasta hoy.
    this.fechaHasta = this.hoy;
  }

  /** Fecha de hoy en formato yyyy-mm-dd, sin correrse por zona horaria. */
  get hoy(): string {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${ahora.getFullYear()}-${mes}-${dia}`;
  }

  cargarEstudiante(): void {
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        const estudiante = response.body;
        if (estudiante) {
          this.nombreEstudiante = estudiante.nombre_completo
            || `${estudiante.primer_nombre || ''} ${estudiante.primer_apellido || ''}`.trim();
        }
      },
      error: (error: any) => console.error('Error al cargar el estudiante', error)
    });
  }

  cargarCertificados(): void {
    this.certificadosService.obtenerDisponibles(this.idEstudiante, 'institucional').subscribe({
      next: (response: any) => {
        this.certificados = response.body as any[];

        // El saldo es del estudiante, no de cada certificado: se toma del
        // primero y se muestra arriba para que no sorprenda al confirmar.
        if (this.certificados.length > 0) {
          this.saldoTotal = Number(this.certificados[0].saldo_total) || 0;
          this.saldoVencido = Number(this.certificados[0].saldo_vencido) || 0;
        }
      },
      error: (error: any) => console.error('Error al cargar los certificados', error)
    });
  }

  cargarAcudientes(): void {
    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.acudientes = (response.body as any[]) || [];
      },
      error: (error: any) => console.error('Error al cargar los acudientes', error)
    });
  }

  cargarAnios(): void {
    this.certificadosService.obtenerAnios(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.anios = (response.body as number[]) || [];
        if (this.anios.length > 0) {
          this.anioCertificado = this.anios[0];
        }
      },
      error: (error: any) => console.error('Error al cargar los años', error)
    });
  }

  /**
   * Los productos se agrupan por clasificación para poder marcar una completa
   * o solo algunos de sus conceptos.
   */
  cargarProductos(): void {
    this.productosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const productos = (response.body as any[]) || [];
        const porClasificacion: any = {};

        productos.forEach((producto: any) => {
          const id = producto.id_clasificacion_productos_servicios || 'sin_clasificacion';
          if (!porClasificacion[id]) {
            porClasificacion[id] = {
              id,
              nombre: producto.nombre_clasificacion || 'Sin clasificación',
              abierto: false,
              busqueda: '',
              productos: []
            };
          }
          porClasificacion[id].productos.push(producto);
        });

        this.grupos = Object.keys(porClasificacion)
          .map(id => porClasificacion[id])
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));
      },
      error: (error: any) => console.error('Error al cargar los productos', error)
    });
  }

  /**
   * Productos visibles de un grupo: se filtran por texto y, si se pide, por
   * periodicidad mensual. Lo seleccionado no se pierde al filtrar.
   */
  productosVisibles(grupo: any): any[] {
    const texto = this.normalizar(grupo.busqueda || '');

    return grupo.productos.filter((producto: any) => {
      if (this.soloMensuales && !this.esMensual(producto)) {
        return false;
      }
      if (texto === '') {
        return true;
      }
      return this.normalizar(producto.nombre || '').includes(texto);
    });
  }

  /** Sin tildes, sin mayúsculas y sin espacios sobrantes, para buscar parejo. */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  esMensual(producto: any): boolean {
    const nombre = (producto.nombre_periodicidad || producto.periodicidad || '').toLowerCase();
    return nombre === 'mensual' || Number(producto.id_periodicidad_cobro) === 2;
  }

  /** Al buscar dentro de un grupo, ese grupo se abre solo. */
  filtrarGrupo(grupo: any): void {
    if ((grupo.busqueda || '').trim() !== '') {
      grupo.abierto = true;
    }
  }

  filtrarMensuales(): void {
    this.grupos.forEach((grupo: any) => (grupo.abierto = this.soloMensuales));
  }

  alternarGrupo(grupo: any): void {
    grupo.abierto = !grupo.abierto;
  }

  estaProductoSeleccionado(idProducto: string): boolean {
    return this.seleccionProductos.has(idProducto);
  }

  alternarProducto(idProducto: string): void {
    if (this.seleccionProductos.has(idProducto)) {
      this.seleccionProductos.delete(idProducto);
      return;
    }
    this.seleccionProductos.add(idProducto);
  }

  /** Marcar la clasificación marca todos sus productos. */
  grupoCompleto(grupo: any): boolean {
    const visibles = this.productosVisibles(grupo);
    return visibles.length > 0 && visibles.every((p: any) => this.seleccionProductos.has(p.id));
  }

  grupoParcial(grupo: any): boolean {
    return !this.grupoCompleto(grupo)
      && this.productosVisibles(grupo).some((p: any) => this.seleccionProductos.has(p.id));
  }

  seleccionadosDe(grupo: any): number {
    return this.productosVisibles(grupo).filter((p: any) => this.seleccionProductos.has(p.id)).length;
  }

  totalVisiblesDe(grupo: any): number {
    return this.productosVisibles(grupo).length;
  }

  /** Marca o desmarca solo lo que está a la vista con el filtro puesto. */
  alternarTodoElGrupo(grupo: any): void {
    const visibles = this.productosVisibles(grupo);

    if (this.grupoCompleto(grupo)) {
      visibles.forEach((p: any) => this.seleccionProductos.delete(p.id));
      return;
    }
    visibles.forEach((p: any) => this.seleccionProductos.add(p.id));
  }

  limpiarSeleccion(): void {
    this.seleccionProductos.clear();
  }

  cargarHistorial(): void {
    this.certificadosService.obtenerByEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.historial = (response.body as any[]) || [];
      },
      error: (error: any) => console.error('Error al cargar el historial', error)
    });
  }

  seleccionarPestana(pestana: string): void {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  seleccionarTipo(clave: string): void {
    this.claveSeleccionada = clave;
    this.submitted = false;

    // El switch arranca con lo que el jardín dejó configurado, pero se puede
    // cambiar para este certificado.
    const certificado = this.certificados.find((c: any) => c.clave_certificado === clave);
    this.formato = certificado ? certificado.formato : 'recibo';
    this.mostrarConceptos = certificado ? Number(certificado.mostrar_conceptos) === 1 : true;
    this.seleccionProductos.clear();
    this.dirigidoA = '';
    this.soloMensuales = false;
    this.grupos.forEach((grupo: any) => (grupo.busqueda = ''));
  }

  get aplicaConceptos(): boolean {
    return this.formato === 'recibo' || this.formato === 'mes';
  }

  volver(): void {
    this.router.navigate(['/estudiantes/opciones/' + this.idEstudiante]);
  }

  iconoDe(clave: string): string {
    switch (clave) {
      case 'paz_y_salvo': return 'fa-circle-check';
      case 'constancia_estudio': return 'fa-user-graduate';
      case 'constancia_anio_cursado': return 'fa-calendar-check';
      case 'pagos_estudiante': return 'fa-receipt';
      case 'pagos_acudiente': return 'fa-hand-holding-dollar';
      default: return 'fa-file-lines';
    }
  }

  descripcionDe(clave: string): string {
    switch (clave) {
      case 'paz_y_salvo': return 'Certifica que no hay saldos pendientes con la institución.';
      case 'constancia_estudio': return 'Certifica que el estudiante está matriculado actualmente.';
      case 'constancia_anio_cursado': return 'Certifica el año lectivo que cursó. Sirve también para retirados.';
      case 'pagos_estudiante': return 'Todo lo pagado por el estudiante, sin importar quién pagó.';
      case 'pagos_acudiente': return 'Solo lo que pagó un acudiente. Es el que sirve para declaración de renta.';
      default: return '';
    }
  }

  /** El formulario cambia según lo que necesite el tipo escogido. */
  get pideAcudiente(): boolean {
    return this.claveSeleccionada === 'pagos_acudiente';
  }

  get pideRangoFechas(): boolean {
    return this.claveSeleccionada === 'pagos_acudiente' || this.claveSeleccionada === 'pagos_estudiante';
  }

  get pideAnio(): boolean {
    return this.claveSeleccionada === 'constancia_anio_cursado';
  }

  nombreDe(clave: string): string {
    const certificado = this.certificados.find((c: any) => c.clave_certificado === clave);
    return certificado ? certificado.nombre : clave;
  }

  async generar(): Promise<void> {
    this.submitted = true;

    if (!this.claveSeleccionada) {
      Swal.fire('Falta información', 'Selecciona el tipo de certificado.', 'warning');
      return;
    }
    if (this.pideAcudiente && !this.idAcudiente) {
      Swal.fire('Falta información', 'Selecciona el acudiente.', 'warning');
      return;
    }
    if (this.pideAnio && !this.anioCertificado) {
      Swal.fire('Falta información', 'Selecciona el año lectivo.', 'warning');
      return;
    }
    if (this.pideRangoFechas && (!this.fechaDesde || !this.fechaHasta)) {
      Swal.fire('Falta información', 'Indica el rango de fechas.', 'warning');
      return;
    }
    if (this.pideRangoFechas && this.fechaDesde > this.fechaHasta) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser mayor que la final.', 'warning');
      return;
    }
    if (this.pideRangoFechas && this.fechaHasta > this.hoy) {
      Swal.fire('Rango inválido', 'La fecha final no puede ser posterior a hoy.', 'warning');
      return;
    }

    // El jardín puede expedir con deuda, pero no en silencio: un paz y salvo
    // con saldo pendiente es un problema para el jardín, no para el sistema.
    const certificado = this.certificados.find(
      (c: any) => c.clave_certificado === this.claveSeleccionada
    );

    if (certificado && Number(certificado.cumple) !== 1) {
      const confirmacion = await Swal.fire({
        title: 'El estudiante tiene saldo pendiente',
        html: this.textoAdvertencia(certificado),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d4af37',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Generar de todas formas',
        cancelButtonText: 'Cancelar'
      });

      if (!confirmacion.isConfirmed) {
        return;
      }
    }

    this.generando = true;

    this.certificadosService.expedir({
      clave_certificado: this.claveSeleccionada,
      id_estudiante: this.idEstudiante,
      id_acudiente: this.pideAcudiente ? this.idAcudiente : null,
      anio_certificado: this.pideAnio ? this.anioCertificado : null,
      fecha_desde: this.pideRangoFechas ? this.fechaDesde : null,
      fecha_hasta: this.pideRangoFechas ? this.fechaHasta : null,
      productos: this.pideRangoFechas ? Array.from(this.seleccionProductos) : [],
      dirigido_a: this.dirigidoA,
      formato: this.pideRangoFechas ? this.formato : null,
      mostrar_conceptos: this.pideRangoFechas ? (this.mostrarConceptos ? 1 : 0) : null,
      origen: 'institucional'
    }).subscribe({
      next: async (respuesta: any) => {
        try {
          await this.exportarPdfService.generarPDF(
            respuesta.contenido_html,
            this.nombreArchivo(respuesta.numero_certificado)
          );

          if (respuesta.advertencia) {
            Swal.fire('Certificado generado', respuesta.advertencia, 'info');
          }

          this.cargarHistorial();
          this.pestanaActiva = 'historial';
        } catch (error) {
          console.error('Error al generar el PDF', error);
          Swal.fire('Error', 'El certificado se guardó pero no se pudo generar el PDF.', 'error');
        } finally {
          this.generando = false;
        }
      },
      error: (error: any) => {
        this.generando = false;
        console.error('Error al expedir el certificado', error);
        Swal.fire('Error', error?.error?.message || 'No se pudo generar el certificado.', 'error');
      }
    });
  }

  /** Vuelve a descargar un certificado ya expedido, tal como salió. */
  async descargar(certificado: any): Promise<void> {
    this.certificadosService.obtenerById(certificado.id).subscribe({
      next: async (response: any) => {
        const expedido = response.body;
        try {
          await this.exportarPdfService.generarPDF(
            expedido.contenido_html,
            this.nombreArchivo(`${expedido.anio}-${String(expedido.numero).padStart(4, '0')}`)
          );
        } catch (error) {
          console.error('Error al generar el PDF', error);
          Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
        }
      },
      error: (error: any) => {
        console.error('Error al obtener el certificado', error);
        Swal.fire('Error', 'No se pudo obtener el certificado.', 'error');
      }
    });
  }

  private textoAdvertencia(certificado: any): string {
    const total = this.valorTexto(certificado.saldo_total);
    const vencido = this.valorTexto(certificado.saldo_vencido);

    return `Saldo total pendiente: <b>${total}</b><br>`
      + `De ese saldo, ya está vencido: <b>${vencido}</b><br><br>`
      + `Vas a expedir <b>${certificado.nombre}</b> de todas formas.`;
  }

  valorTexto(valor: any): string {
    const numero = Number(valor) || 0;
    return '$' + numero.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  private nombreArchivo(numero: string): string {
    const nombre = (this.nombreEstudiante || 'estudiante').replace(/\s+/g, '_');
    return `certificado_${numero}_${nombre}`;
  }

  fechaTexto(fecha: string): string {
    if (!fecha) {
      return '';
    }
    // Se corta la cadena en vez de usar Date para no correr el día por zona horaria.
    const soloFecha = fecha.substring(0, 10).split('-');
    return `${soloFecha[2]}/${soloFecha[1]}/${soloFecha[0]}`;
  }

  detalleHistorial(certificado: any): string {
    if (certificado.anio_certificado) {
      return `Año ${certificado.anio_certificado}`;
    }
    if (certificado.fecha_desde && certificado.fecha_hasta) {
      const acudiente = certificado.acudiente_nombre ? ` · ${certificado.acudiente_nombre}` : '';
      return `${this.fechaTexto(certificado.fecha_desde)} a ${this.fechaTexto(certificado.fecha_hasta)}${acudiente}`;
    }
    return '';
  }
}
