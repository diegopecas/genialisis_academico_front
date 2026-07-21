import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-supervision-limpieza',
  templateUrl: './supervision-limpieza.component.html',
  styleUrls: ['./supervision-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class SupervisionLimpiezaComponent implements OnInit {

  titulo = 'Supervisión de Aseo';

  procesos: any[] = [];
  usuarios: any[] = [];

  // Filtros: los tres opcionales, vacíos = todos los pendientes
  fechaDesde = '';
  fechaHasta = '';
  filtroProceso = '';

  grupos: any[] = [];
  cargando = false;
  guardando = false;

  idSupervisor = '';
  observaciones = '';

  constructor(
    private router: Router,
    private registrosService: RegistrosLimpiezaService,
    private procesosService: TiposProcesosLimpiezaService,
    private usuariosService: UsuariosService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarUsuarios();
    this.cargarPendientes();
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los tipos de proceso', 'error');
      }
    });
  }

  cargarUsuarios() {
    this.usuariosService.obtenerTodos().subscribe({
      next: (response: any) => {
        // Solo personal institucional activo
        this.usuarios = (response.body || [])
          .filter((u: any) => Number(u.activo) === 1 && Number(u.acceso_institucional) === 1)
          .map((u: any) => ({ ...u, nombre_completo: this.armarNombre(u) }))
          .sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));

        const idActual = this.utilService.obtenerIdUsuarioActual();
        if (idActual && this.usuarios.some((u: any) => u.id === idActual)) {
          this.idSupervisor = idActual;
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
      }
    });
  }

  private armarNombre(usuario: any): string {
    const nombre = [
      usuario.primer_nombre,
      usuario.segundo_nombre,
      usuario.primer_apellido,
      usuario.segundo_apellido
    ].filter(Boolean).join(' ').trim();

    return nombre || usuario.usuario;
  }

  cargarPendientes() {
    this.cargando = true;

    const filtros = {
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      id_proceso: this.filtroProceso
    };

    this.registrosService.obtenerPendientesSupervision(filtros).subscribe({
      next: (response: any) => {
        this.grupos = this.agrupar(response.body || []);
        this.cargando = false;
      },
      error: (error: any) => {
        this.cargando = false;
        Swal.fire('Error', error.error?.error || 'No se pudieron cargar los pendientes', 'error');
      }
    });
  }

  limpiarFiltros() {
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.filtroProceso = '';
    this.cargarPendientes();
  }

  /**
   * El registro rápido crea una fila por área con la misma fecha y proceso, así que
   * se agrupan por fecha + proceso. Cada registro entra marcado; se desmarca lo que
   * no se quiera supervisar.
   */
  private agrupar(registros: any[]): any[] {
    const mapa = new Map<string, any>();

    registros.forEach(registro => {
      const clave = `${registro.fecha}|${registro.id_tipo_proceso_limpieza}`;
      let grupo = mapa.get(clave);

      if (!grupo) {
        grupo = {
          clave,
          fecha: registro.fecha,
          proceso: registro.proceso,
          expandido: false,
          registros: []
        };
        mapa.set(clave, grupo);
      }

      grupo.registros.push({ ...registro, seleccionado: true });
    });

    return Array.from(mapa.values());
  }

  toggleExpandir(grupo: any) {
    grupo.expandido = !grupo.expandido;
  }

  toggleGrupo(grupo: any, event: Event) {
    event.stopPropagation();
    if (this.guardando) return;

    const marcar = !this.grupoCompleto(grupo);
    grupo.registros.forEach((r: any) => r.seleccionado = marcar);
  }

  toggleRegistro(registro: any) {
    if (this.guardando) return;
    registro.seleccionado = !registro.seleccionado;
  }

  grupoCompleto(grupo: any): boolean {
    return grupo.registros.every((r: any) => r.seleccionado);
  }

  grupoParcial(grupo: any): boolean {
    const marcados = this.seleccionadosDe(grupo);
    return marcados > 0 && marcados < grupo.registros.length;
  }

  seleccionadosDe(grupo: any): number {
    return grupo.registros.filter((r: any) => r.seleccionado).length;
  }

  marcarTodos() {
    this.grupos.forEach(g => g.registros.forEach((r: any) => r.seleccionado = true));
  }

  marcarNinguno() {
    this.grupos.forEach(g => g.registros.forEach((r: any) => r.seleccionado = false));
  }

  get totalPendientes(): number {
    return this.grupos.reduce((total, g) => total + g.registros.length, 0);
  }

  get idsSeleccionados(): string[] {
    return this.grupos
      .flatMap(g => g.registros)
      .filter((r: any) => r.seleccionado)
      .map((r: any) => r.id);
  }

  get puedeSupervisar(): boolean {
    return this.idsSeleccionados.length > 0 && !!this.idSupervisor && !this.guardando;
  }

  async supervisar() {
    if (!this.puedeSupervisar) return;

    const total = this.idsSeleccionados.length;
    const gruposAfectados = this.grupos.filter(g => this.seleccionadosDe(g) > 0).length;

    const result = await Swal.fire({
      title: '¿Marcar como supervisados?',
      html: `
        <div class="text-start">
          <p class="mb-1">
            <strong>${total}</strong> registro(s) de <strong>${gruposAfectados}</strong> jornada(s)
            pasarán a estado <strong>Supervisado</strong>.
          </p>
          <p class="mb-0 text-muted small">Esta acción no se puede deshacer desde la aplicación.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      confirmButtonText: 'Sí, supervisar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.guardando = true;

    const datos = {
      ids: this.idsSeleccionados,
      id_usuario_supervisor: this.idSupervisor,
      observaciones: this.observaciones || null
    };

    this.registrosService.supervisarLote(datos).subscribe({
      next: (response: any) => {
        const body = response.body;
        this.guardando = false;

        const avisoOmitidos = body.omitidos
          ? `<br><small class="text-muted">${body.omitidos} registro(s) se omitieron: ya no estaban pendientes.</small>`
          : '';

        Swal.fire({
          title: 'Supervisión registrada',
          html: `${body.total_supervisados} registro(s) supervisado(s)${avisoOmitidos}`,
          icon: 'success'
        }).then(() => {
          this.observaciones = '';
          this.cargarPendientes();
        });
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudo registrar la supervisión', 'error');
      }
    });
  }

  regresar() {
    this.router.navigate(['/operaciones/registros-limpieza']);
  }
}