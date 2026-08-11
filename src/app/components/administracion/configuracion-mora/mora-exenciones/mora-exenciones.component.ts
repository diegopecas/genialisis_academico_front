import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { MoraExencionesService } from '../../../../services/mora-exenciones.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { UtilService } from '../../../../common/constantes/util.service';

/**
 * Registro rapido de exenciones de mora por persona.
 *
 * Se filtra la lista por nombre, grado y grupo, se marcan varias personas y se
 * les crea (o se les desactiva) la exencion de una sola vez. La gestion
 * individual vive en la pestana "Exenciones de Mora" del estudiante.
 */
@Component({
  selector: 'app-mora-exenciones',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './mora-exenciones.component.html',
  styleUrl: './mora-exenciones.component.scss'
})
export class MoraExencionesComponent implements OnInit {
  titulo = 'Registro Rápido de Exenciones de Mora';
  regresar = '/administracion/financiero';

  public personas: any[] = [];
  public productos: any[] = [];
  public cargando = false;
  public guardando = false;
  public seleccionados = new Set<string>();

  public filtros = {
    texto: '',
    id_grado: '',
    id_grupo: '',
    exentos: ''
  };

  /** Condiciones de la exencion que se creara. */
  public condiciones = {
    id_producto_servicio: null as any,
    fecha_desde: '',
    fecha_hasta: null as any,
    motivo: ''
  };

  constructor(
    private moraExencionesService: MoraExencionesService,
    private productosServiciosService: ProductosServiciosService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarPersonas();
    this.cargarProductos();
  }

  cargarPersonas() {
    this.cargando = true;
    this.moraExencionesService.obtenerPersonas().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.personas = body as any[];
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al obtener las personas:', error);
        Swal.fire('Error', 'No se pudieron cargar las personas', 'error');
      }
    });
  }

  cargarProductos() {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.productos = (body as any[]).filter((p: any) => Number(p.disponible) === 1);
      },
      error: (error) => console.error('Error al cargar productos:', error)
    });
  }

  // ================= FILTROS =================

  /** Grados presentes en la lista, sin repetir, para armar el filtro. */
  get grados(): any[] {
    const mapa = new Map<string, string>();
    this.personas.forEach((p: any) => {
      if (p.id_grado && !mapa.has(p.id_grado)) {
        mapa.set(p.id_grado, p.nombre_grado);
      }
    });
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  /** Grupos disponibles; si hay un grado elegido, solo los de ese grado. */
  get grupos(): any[] {
    const mapa = new Map<string, string>();
    this.personas
      .filter((p: any) => !this.filtros.id_grado || p.id_grado === this.filtros.id_grado)
      .forEach((p: any) => {
        if (p.id_grupo && !mapa.has(p.id_grupo)) {
          mapa.set(p.id_grupo, p.nombre_grupo);
        }
      });
    return Array.from(mapa, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  get personasFiltradas(): any[] {
    const texto = (this.filtros.texto || '').trim().toLowerCase();

    return this.personas.filter((p: any) => {
      if (texto) {
        const nombre = (p.nombre_persona || '').toLowerCase();
        const documento = (p.numero_identificacion || '').toString().toLowerCase();
        if (!nombre.includes(texto) && !documento.includes(texto)) {
          return false;
        }
      }
      if (this.filtros.id_grado && p.id_grado !== this.filtros.id_grado) {
        return false;
      }
      if (this.filtros.id_grupo && p.id_grupo !== this.filtros.id_grupo) {
        return false;
      }
      if (this.filtros.exentos === 'si' && Number(p.exenciones_activas) === 0) {
        return false;
      }
      if (this.filtros.exentos === 'no' && Number(p.exenciones_activas) > 0) {
        return false;
      }
      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = { texto: '', id_grado: '', id_grupo: '', exentos: '' };
  }

  /** Al cambiar de grado el grupo elegido puede dejar de existir. */
  onCambioGrado() {
    this.filtros.id_grupo = '';
  }

  // ================= SELECCION =================

  estaSeleccionado(id: string): boolean {
    return this.seleccionados.has(id);
  }

  toggleSeleccion(id: string) {
    if (this.seleccionados.has(id)) {
      this.seleccionados.delete(id);
    } else {
      this.seleccionados.add(id);
    }
  }

  toggleSeleccionarTodos() {
    const visibles = this.personasFiltradas;
    if (this.todosVisiblesSeleccionados) {
      visibles.forEach((p: any) => this.seleccionados.delete(p.id_persona));
    } else {
      visibles.forEach((p: any) => this.seleccionados.add(p.id_persona));
    }
  }

  get todosVisiblesSeleccionados(): boolean {
    const visibles = this.personasFiltradas;
    return visibles.length > 0 && visibles.every((p: any) => this.seleccionados.has(p.id_persona));
  }

  get totalSeleccionados(): number {
    return this.seleccionados.size;
  }

  // ================= ACCIONES =================

  aplicar() {
    if (this.totalSeleccionados === 0) {
      Swal.fire('Sin selección', 'Marque al menos una persona', 'warning');
      return;
    }
    if (!this.condiciones.fecha_desde) {
      Swal.fire('Campos incompletos', 'Indique desde qué fecha aplica la exención', 'warning');
      return;
    }
    if (this.condiciones.fecha_hasta && this.condiciones.fecha_hasta < this.condiciones.fecha_desde) {
      Swal.fire('Fechas inválidas', 'La fecha hasta no puede ser anterior a la fecha desde', 'warning');
      return;
    }

    const alcance = this.condiciones.id_producto_servicio ? 'un producto' : '<b>todos los productos</b>';
    const vigencia = this.condiciones.fecha_hasta
      ? 'hasta el ' + this.condiciones.fecha_hasta
      : '<b>de forma indefinida</b>';

    Swal.fire({
      title: '¿Exonerar a ' + this.totalSeleccionados + ' persona(s)?',
      html: 'Quedarán exentas de mora en ' + alcance + ', desde el ' +
            this.condiciones.fecha_desde + ' ' + vigencia + '.<br><br>' +
            'La mora causada dentro del rango desaparece en el siguiente cálculo, ' +
            'salvo la que ya esté pagada.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, exonerar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }
      this.enviar('aplicar');
    });
  }

  quitar() {
    if (this.totalSeleccionados === 0) {
      Swal.fire('Sin selección', 'Marque al menos una persona', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Desactivar las exenciones de ' + this.totalSeleccionados + ' persona(s)?',
      text: 'Volverán a causar intereses. El registro queda guardado, solo se desactiva.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }
      this.enviar('quitar');
    });
  }

  private enviar(accion: string) {
    this.guardando = true;

    const payload: any = {
      personas: Array.from(this.seleccionados),
      accion: accion,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    if (accion === 'aplicar') {
      payload.id_producto_servicio = this.condiciones.id_producto_servicio || null;
      payload.fecha_desde = this.condiciones.fecha_desde;
      payload.fecha_hasta = this.condiciones.fecha_hasta || null;
      payload.motivo = this.condiciones.motivo || null;
    }

    this.moraExencionesService.aplicarMasivo(payload).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        this.seleccionados.clear();
        this.cargarPersonas();
        Swal.fire('Listo', respuesta.message || 'Cambios aplicados', 'success');
      },
      error: (error) => {
        this.guardando = false;
        console.error('Error al aplicar las exenciones:', error);
        const mensaje = error?.error?.error || 'No se pudieron aplicar los cambios';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }
}
