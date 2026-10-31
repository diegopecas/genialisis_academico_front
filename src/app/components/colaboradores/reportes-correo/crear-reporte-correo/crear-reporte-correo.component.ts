import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../../common/searchable-dropdown/searchable-dropdown.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { FechaInputComponent } from '../../../../common/fecha-input/fecha-input.component';
import { HistorialReportesCorreoService } from '../../../../services/historial-reportes-correo.service';
import { ReportesCorreoColaboradoresService } from '../../../../services/reportes-correo-colaboradores.service';
import { TiposReporteCorreoService } from '../../../../services/tipos-reporte-correo.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';

/**
 * Crear y editar la asociación de un tipo de reporte por correo con un
 * colaborador. Solo se listan colaboradores activos; el correo sale al
 * correo electrónico de su ficha. Al crear queda activo; en la edición se
 * puede inactivar.
 *
 * Si la ruta trae idColaborador (se entra desde las opciones del
 * colaborador), el colaborador queda fijo y se vuelve a su listado. En ese
 * caso, al crear solo se ofrecen los tipos que todavía no tiene; al editar
 * o consultar la pantalla va en pestañas: el formulario, los reportes que ya
 * tiene (para quitarlos ahí mismo) y su historial de envíos.
 */
@Component({
  selector: 'app-crear-reporte-correo',
  templateUrl: './crear-reporte-correo.component.html',
  styleUrl: './crear-reporte-correo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent, TablasComponent, FechaInputComponent]
})
export class CrearReporteCorreoComponent implements OnInit {

  titulo = "Asociar Reporte por Correo";
  accion: string = "";
  raiz = '/colaboradores/reportes-correo';
  regresar = '/colaboradores/reportes-correo';
  idColaboradorFijo: any = null;
  nombreColaboradorFijo = '';
  editable: boolean = true;
  submitted: boolean = false;

  colaboradores = [] as any[];
  colaboradoresItems: DropdownItem[] = [];
  colaboradoresCargados = false;
  tipos = [] as any[];

  // Pestañas: solo al editar o consultar desde las opciones del colaborador.
  // En los demás casos la pantalla es solo el formulario ('asignar').
  pestanaActiva: string = 'asignar';
  menuMovilAbierto: boolean = false;

  // Secciones que solo aparecen desde las opciones del colaborador
  asignados = [] as any[];
  titulosAsignados = [
    { clave: 'nombre_tipo', alias: 'Tipo de reporte', alinear: 'izquierda' },
    { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
    { clave: 'ultimo_envio_texto', alias: 'Último envío', alinear: 'izquierda' },
  ];
  historial = [] as any[];
  titulosHistorial = [] as any[];
  histDesde = '';
  histHasta = '';

  model = {
    id: null,
    id_colaborador: null,
    id_tipo_reporte_correo: null,
    activo: 1
  } as any;

  constructor(
    private reportesCorreoService: ReportesCorreoColaboradoresService,
    private tiposReporteCorreoService: TiposReporteCorreoService,
    private colaboradoresService: ColaboradoresService,
    private historialService: HistorialReportesCorreoService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.obtenerTipos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];
      this.idColaboradorFijo = params['idColaborador'] || null;
      if (this.idColaboradorFijo) {
        this.regresar = this.raiz + '/' + this.idColaboradorFijo;
        this.iniciarSecciones();
      }

      if (this.accion === 'crear') {
        this.titulo = "Asociar Reporte por Correo";
        this.editable = true;
        if (this.idColaboradorFijo) {
          this.model.id_colaborador = this.idColaboradorFijo;
          this.obtenerColaboradorFijo();
        } else {
          this.obtenerColaboradores();
        }
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Reporte por Correo";
        this.editable = true;
        this.cargarReporte(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Reporte por Correo";
        this.editable = false;
        this.cargarReporte(id);
      }
    });
  }

  obtenerTipos() {
    this.tiposReporteCorreoService.obtenerTodos().subscribe((response: any) => {
      this.tipos = (response.body || []) as any[];
    });
  }

  /**
   * Colaboradores activos para escoger. En la edición también entra el
   * colaborador ya asociado aunque esté inactivo, para no perderlo de la lista.
   */
  obtenerColaboradores(idActual: any = null) {
    this.colaboradoresService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.colaboradores = body.filter((c: any) => c.activo == 1 || c.id === idActual);
      this.colaboradoresItems = this.colaboradores.map((c: any) => ({
        id: c.id,
        nombre: (c.nombre_completo || '').replace(/\s+/g, ' ').trim(),
        descripcion: c.correo_electronico || 'Sin correo registrado'
      }));
      // El dropdown toma los items al iniciar, por eso se pinta después de cargarlos
      this.colaboradoresCargados = true;
    });
  }

  /**
   * Los asignados se cargan siempre (al crear sirven para no ofrecer los
   * tipos que ya tiene). El historial solo se ve en las pestañas; por
   * defecto muestra el mes en curso.
   */
  iniciarSecciones() {
    this.cargarAsignados();
    if (!this.conPestanas) {
      return;
    }
    const hoy = new Date();
    this.histDesde = this.formatoIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.histHasta = this.formatoIso(hoy);
    this.titulosHistorial = this.historialService.titulosTabla(false);
    this.cargarHistorial();
  }

  /** Reportes que ya tiene el colaborador. */
  cargarAsignados() {
    this.reportesCorreoService.obtenerByColaborador(this.idColaboradorFijo).subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.asignados = body.map((r: any) => ({
        ...r,
        estado_texto: r.activo == 1 ? 'Activo' : 'Inactivo',
        ultimo_envio_texto: this.textoUltimoEnvio(r),
        // Pastel: verde los activos, gris los inactivos
        color: r.activo == 1 ? '#e3f1ea' : '#f1f1f1'
      }));
    });
  }

  get conPestanas(): boolean {
    return !!this.idColaboradorFijo && this.accion !== 'crear';
  }

  // Seleccionar pestaña y cerrar menú móvil
  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  get etiquetaPestanaAsignar(): string {
    return this.accion === 'crear' ? 'Asignar reporte' : 'Datos del reporte';
  }

  cargarHistorial() {
    if (!this.histDesde || !this.histHasta || this.histDesde > this.histHasta) {
      Swal.fire('Rango inválido', 'Revisa las fechas del historial', 'warning');
      return;
    }
    this.historialService.obtener(this.histDesde, this.histHasta, this.idColaboradorFijo).subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.historial = body.map((item: any) => this.historialService.paraTabla(item));
    });
  }

  clicAsignado($event: any) {
    if ($event.accion === 'eliminar') {
      this.quitarAsignado($event.registro);
    }
  }

  async quitarAsignado(reporte: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea quitar el reporte "${reporte.nombre_tipo}"? También se borra su historial de envíos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.reportesCorreoService.eliminar({ id: reporte.id }).subscribe({
        next: () => {
          Swal.fire('Listo', 'El reporte por correo se quitó.', 'success');
          // Si estaba escogido en el formulario se suelta, y se refrescan las dos secciones
          if (this.model.id_tipo_reporte_correo === reporte.id_tipo_reporte_correo && this.accion === 'crear') {
            this.model.id_tipo_reporte_correo = null;
          }
          this.cargarAsignados();
          if (this.conPestanas) {
            this.cargarHistorial();
          }
        },
        error: (error: any) => {
          console.error("Error al quitar el reporte por correo", error);
        }
      });
    }
  }

  /**
   * Tipos que se pueden escoger. Al crear desde las opciones del colaborador
   * no salen los que ya tiene.
   */
  get tiposDisponibles(): any[] {
    if (this.accion !== 'crear' || !this.idColaboradorFijo) {
      return this.tipos;
    }
    const yaTiene = new Set(this.asignados.map((a: any) => a.id_tipo_reporte_correo));
    return this.tipos.filter((t: any) => !yaTiene.has(t.id));
  }

  get todosAsignados(): boolean {
    return this.accion === 'crear' && !!this.idColaboradorFijo
      && this.tipos.length > 0 && this.tiposDisponibles.length === 0;
  }

  textoUltimoEnvio(reporte: any): string {
    if (!reporte.ultimo_envio) {
      return 'Sin envíos';
    }
    const [fecha, hora] = String(reporte.ultimo_envio).split(' ');
    const [anio, mes, dia] = fecha.split('-');
    const texto = `${dia}/${mes}/${anio} ${(hora || '').substring(0, 5)}`;
    return reporte.ultimo_exito == 1 ? `✅ ${texto}` : `❌ ${texto} - ${reporte.ultimo_error || 'Falló'}`;
  }

  private formatoIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /** Desde las opciones del colaborador solo hace falta ese colaborador. */
  obtenerColaboradorFijo() {
    this.colaboradoresService.obtenerById(this.idColaboradorFijo).subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.colaboradores = body;
      if (body.length > 0) {
        const c = body[0];
        this.nombreColaboradorFijo = [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ');
      }
    });
  }

  cargarReporte(id: any) {
    this.reportesCorreoService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = {
            id: body[0].id,
            id_colaborador: body[0].id_colaborador,
            id_tipo_reporte_correo: body[0].id_tipo_reporte_correo,
            activo: body[0].activo == 1 ? 1 : 0
          };
          if (this.idColaboradorFijo) {
            this.obtenerColaboradorFijo();
          } else {
            this.obtenerColaboradores(this.model.id_colaborador);
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar el reporte por correo", error);
      }
    });
  }

  get colaboradorSeleccionado(): any {
    return this.colaboradores.find((c: any) => c.id === this.model.id_colaborador) || null;
  }

  get tipoSeleccionado(): any {
    return this.tipos.find((t: any) => t.id === this.model.id_tipo_reporte_correo) || null;
  }

  get sinCorreo(): boolean {
    const colaborador = this.colaboradorSeleccionado;
    return !!colaborador && !colaborador.correo_electronico;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.id_colaborador || !this.model.id_tipo_reporte_correo) {
      Swal.fire('Advertencia', 'El colaborador y el tipo de reporte son obligatorios', 'warning');
      return;
    }

    if (this.sinCorreo) {
      Swal.fire('Advertencia', 'El colaborador no tiene correo registrado. Actualízalo en su ficha antes de asociarle el reporte.', 'warning');
      return;
    }

    const data = {
      id_colaborador: this.model.id_colaborador,
      id_tipo_reporte_correo: this.model.id_tipo_reporte_correo
    } as any;

    if (this.accion === 'crear') {
      this.reportesCorreoService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Reporte por correo asociado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          // El mensaje del backend lo muestra el interceptor
          console.error("Error al crear el reporte por correo", error);
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      data.activo = this.model.activo;
      this.reportesCorreoService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Reporte por correo actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al actualizar el reporte por correo", error);
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}