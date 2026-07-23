import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { AreasFisicasService } from '../../../../services/areas-fisicas.service';
import { EstadosRegistroLimpiezaService } from '../../../../services/estados-registro-limpieza.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-edicion-masiva-limpieza',
  templateUrl: './edicion-masiva-limpieza.component.html',
  styleUrls: ['./edicion-masiva-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class EdicionMasivaLimpiezaComponent implements OnInit {

  titulo = 'Edición Masiva de Aseo';

  procesos: any[] = [];
  areasFisicas: any[] = [];
  estados: any[] = [];
  usuarios: any[] = [];

  // Filtros de búsqueda
  fechaDesde = this.primerDiaMes();
  fechaHasta = this.hoy();
  idProceso = '';
  idArea = '';
  idEstado = '';

  registros: any[] = [];
  cargando = false;
  yaConsulto = false;
  guardando = false;

  /** Qué campos se van a modificar. Solo se envían los que estén activados. */
  aplicar = {
    fecha: false,
    hora_inicio: false,
    hora_fin: false,
    id_estado: false,
    id_usuario_ejecutor: false,
    id_usuario_supervisor: false
  };

  /** Valores nuevos para los campos activados */
  nuevos = {
    fecha: this.hoy(),
    hora_inicio: '08:00',
    hora_fin: '10:00',
    id_estado: '',
    id_usuario_ejecutor: '',
    id_usuario_supervisor: ''
  };

  constructor(
    private router: Router,
    private registrosService: RegistrosLimpiezaService,
    private procesosService: TiposProcesosLimpiezaService,
    private areasFisicasService: AreasFisicasService,
    private estadosService: EstadosRegistroLimpiezaService,
    private usuariosService: UsuariosService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarAreas();
    this.cargarEstados();
    this.cargarUsuarios();
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los procesos', 'error')
    });
  }

  cargarAreas() {
    this.areasFisicasService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.areasFisicas = (response.body || [])
          .filter((a: any) => Number(a.activo) === 1)
          .sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar las áreas', 'error')
    });
  }

  cargarEstados() {
    this.estadosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.estados = response.body || [];
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los estados', 'error')
    });
  }

  cargarUsuarios() {
    this.usuariosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.usuarios = (response.body || [])
          .filter((u: any) => Number(u.activo) === 1 && Number(u.acceso_institucional) === 1)
          .map((u: any) => ({ ...u, nombre_completo: this.armarNombre(u) }))
          .sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error')
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

  get puedeBuscar(): boolean {
    return !!this.fechaDesde && !!this.fechaHasta && !this.cargando;
  }

  buscar() {
    if (!this.puedeBuscar) return;
    if (this.fechaDesde > this.fechaHasta) {
      Swal.fire('Atención', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargando = true;
    this.yaConsulto = true;

    this.registrosService.obtenerEdicionMasivaPreview({
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      id_proceso: this.idProceso,
      id_area: this.idArea,
      id_estado: this.idEstado
    }).subscribe({
      next: (response: any) => {
        this.registros = (response.body || []).map((r: any) => ({ ...r, seleccionado: false }));
        this.cargando = false;
      },
      error: (error: any) => {
        this.cargando = false;
        this.registros = [];
        Swal.fire('Error', error.error?.error || 'No se pudieron cargar los registros', 'error');
      }
    });
  }

  // --- Selección ---
  toggleRegistro(registro: any) {
    registro.seleccionado = !registro.seleccionado;
  }

  marcarTodos() {
    this.registros.forEach(r => r.seleccionado = true);
  }

  marcarNinguno() {
    this.registros.forEach(r => r.seleccionado = false);
  }

  get seleccionados(): any[] {
    return this.registros.filter(r => r.seleccionado);
  }

  get hayCambiosActivos(): boolean {
    return this.aplicar.fecha || this.aplicar.hora_inicio || this.aplicar.hora_fin
      || this.aplicar.id_estado || this.aplicar.id_usuario_ejecutor
      || this.aplicar.id_usuario_supervisor;
  }

  get puedeAplicar(): boolean {
    return this.seleccionados.length > 0 && this.hayCambiosActivos && !this.guardando;
  }

  /** Arma solo los campos marcados para enviar */
  private construirCambios(): any {
    const cambios: any = {};
    if (this.aplicar.fecha) {
      cambios.fecha = this.nuevos.fecha;
    }
    if (this.aplicar.hora_inicio) {
      cambios.hora_inicio = this.nuevos.hora_inicio;
    }
    if (this.aplicar.hora_fin) {
      cambios.hora_fin = this.nuevos.hora_fin;
    }
    if (this.aplicar.id_estado) {
      cambios.id_estado = this.nuevos.id_estado;
    }
    if (this.aplicar.id_usuario_ejecutor) {
      cambios.id_usuario_ejecutor = this.nuevos.id_usuario_ejecutor;
    }
    if (this.aplicar.id_usuario_supervisor) {
      cambios.id_usuario_supervisor = this.nuevos.id_usuario_supervisor;
    }
    return cambios;
  }

  /** Resumen legible de lo que se va a cambiar, para la confirmación */
  private resumenCambios(cambios: any): string {
    const partes: string[] = [];
    if (cambios.fecha !== undefined) {
      partes.push('Fecha: ' + cambios.fecha);
    }
    if (cambios.hora_inicio !== undefined) {
      partes.push('Hora inicio: ' + cambios.hora_inicio);
    }
    if (cambios.hora_fin !== undefined) {
      partes.push('Hora fin: ' + cambios.hora_fin);
    }
    if (cambios.id_estado !== undefined) {
      const e = this.estados.find(x => String(x.id) === String(cambios.id_estado));
      partes.push('Estado: ' + (e ? e.nombre : cambios.id_estado));
    }
    if (cambios.id_usuario_ejecutor !== undefined) {
      const u = this.usuarios.find(x => x.id === cambios.id_usuario_ejecutor);
      partes.push('Ejecutó: ' + (u ? u.nombre_completo : 'sin asignar'));
    }
    if (cambios.id_usuario_supervisor !== undefined) {
      const u = this.usuarios.find(x => x.id === cambios.id_usuario_supervisor);
      partes.push('Supervisó: ' + (u ? u.nombre_completo : 'sin asignar'));
    }
    return partes.join('<br>');
  }

  async aplicarCambios() {
    if (!this.puedeAplicar) return;

    const cambios = this.construirCambios();

    // Marcar como Supervisado exige supervisor (el backend también lo valida)
    if (cambios.id_estado !== undefined && Number(cambios.id_estado) === 4
      && !cambios.id_usuario_supervisor) {
      const r = await Swal.fire({
        title: 'Sin supervisor en el lote',
        text: 'Va a marcar como Supervisado sin indicar quién supervisó. '
          + 'Solo funcionará si todos los registros ya tienen supervisor asignado. ¿Continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#C98A00',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!r.isConfirmed) return;
    }

    const result = await Swal.fire({
      title: '¿Aplicar los cambios?',
      html: `Se modificarán <strong>${this.seleccionados.length}</strong> registro(s):
             <div class="text-start mt-2"><small>${this.resumenCambios(cambios)}</small></div>
             <small class="text-muted d-block mt-2">No afecta el inventario ni el consumo.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C98A00',
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.guardando = true;

    this.registrosService.editarLote({
      ids: this.seleccionados.map(r => r.id),
      cambios: cambios
    }).subscribe({
      next: (response: any) => {
        this.guardando = false;
        Swal.fire('Listo', `${response.body.total_editados} registro(s) actualizado(s)`, 'success')
          .then(() => this.buscar());
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudieron aplicar los cambios', 'error');
      }
    });
  }

  async eliminar() {
    if (this.seleccionados.length === 0 || this.guardando) return;

    const result = await Swal.fire({
      title: '¿Eliminar los registros?',
      html: `Se eliminarán <strong>${this.seleccionados.length}</strong> registro(s) de forma permanente.
             <small class="text-muted d-block mt-2">
               Se devolverá al inventario el consumo que cada uno había descontado.
             </small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0392B',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.guardando = true;

    this.registrosService.eliminarLote({
      ids: this.seleccionados.map(r => r.id),
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    }).subscribe({
      next: (response: any) => {
        this.guardando = false;
        const devueltos = response.body.productos_devueltos || [];
        let detalle = '';
        if (devueltos.length > 0) {
          detalle = '<div class="text-start mt-2"><small>Devuelto al inventario:<br>'
            + devueltos.map((d: any) => `${d.producto}: ${d.cantidad}`).join('<br>')
            + '</small></div>';
        }
        Swal.fire({
          title: 'Listo',
          html: `${response.body.total_eliminados} registro(s) eliminado(s)${detalle}`,
          icon: 'success'
        }).then(() => this.buscar());
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudieron eliminar los registros', 'error');
      }
    });
  }

  hm(hora: string): string {
    return hora ? hora.substring(0, 5) : '';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const partes = fecha.split('-');
    if (partes.length !== 3) return fecha;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  regresar() {
    this.router.navigate(['/operaciones']);
  }

  private hoy(): string {
    return this.formatoLocal(new Date());
  }

  private primerDiaMes(): string {
    const f = new Date();
    return this.formatoLocal(new Date(f.getFullYear(), f.getMonth(), 1));
  }

  private formatoLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}