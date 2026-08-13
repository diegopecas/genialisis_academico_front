import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { MoraConfiguracionService } from '../../../../services/mora-configuracion.service';
import { TiposMoraService } from '../../../../services/tipos-mora.service';
import { ClasificacionProductosServiciosService } from '../../../../services/clasificacion-productos-servicios.service';
import { CategoriaProductosServiciosService } from '../../../../services/categoria-productos-servicios.service';
import { PeriodicidadCobroService } from '../../../../services/periodicidad-cobro.service';
import { UtilService } from '../../../../common/constantes/util.service';

/**
 * Registro rapido de intereses de mora por producto.
 *
 * Se filtra la lista con los mismos criterios del listado de productos, se
 * marcan varios y se les aplica (o se les quita) la misma condicion de una vez.
 * La edicion individual vive en el tab "Intereses de Mora" del producto.
 */
@Component({
  selector: 'app-mora-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './mora-configuracion.component.html',
  styleUrl: './mora-configuracion.component.scss'
})
export class MoraConfiguracionComponent implements OnInit {
  titulo = 'Registro Rápido de Intereses de Mora';
  regresar = '/administracion/financiero';

  public productos: any[] = [];
  public cargando = false;
  public guardando = false;
  public seleccionados = new Set<string>();

  public listas = {
    tiposMora: [] as any[],
    clasificaciones: [] as any[],
    categorias: [] as any[],
    periodicidades: [] as any[]
  };

  public filtros = {
    texto: '',
    id_clasificacion: '',
    id_categoria: '',
    id_periodicidad: '',
    estado: '',
    conMora: ''
  };

  /** Condiciones que se aplicaran a los productos marcados. */
  public condiciones = {
    id_tipo_mora: null as any,
    valor_recargo: null as any,
    recargo_acumulable: 0,
    porcentaje_mensual: null as any,
    /* Producto donde se cobrara la mora del lote:
         'uno_por_producto' -> se crea uno para cada producto marcado
         'uno_para_todos'   -> todos comparten el producto seleccionado */
    modo_producto_mora: 'uno_por_producto',
    id_producto_mora: null as any
  };

  constructor(
    private moraConfiguracionService: MoraConfiguracionService,
    private tiposMoraService: TiposMoraService,
    private clasificacionService: ClasificacionProductosServiciosService,
    private categoriaService: CategoriaProductosServiciosService,
    private periodicidadService: PeriodicidadCobroService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarListas();
    this.cargarProductos();
  }

  cargarListas() {
    forkJoin([
      this.tiposMoraService.obtenerTodos(),
      this.clasificacionService.obtenerTodos(),
      this.categoriaService.obtenerTodos(),
      this.periodicidadService.obtenerTodos()
    ]).subscribe({
      next: ([tipos, clasificaciones, categorias, periodicidades]: any[]) => {
        this.listas.tiposMora = tipos.body || tipos;
        this.listas.clasificaciones = clasificaciones.body || clasificaciones;
        this.listas.categorias = categorias.body || categorias;
        this.listas.periodicidades = periodicidades.body || periodicidades;
      },
      error: (error) => console.error('Error al cargar listas:', error)
    });
  }

  cargarProductos() {
    this.cargando = true;
    this.moraConfiguracionService.obtenerProductosConMora().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.productos = (body as any[]).map((p: any) => ({
          ...p,
          mora_texto: this.describirMora(p)
        }));
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al obtener los productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
      }
    });
  }

  describirMora(producto: any): string {
    if (!producto.id_tipo_mora) {
      return 'Sin mora';
    }
    if (producto.codigo_tipo_mora === 'RECARGO_FIJO') {
      const acumula = Number(producto.recargo_acumulable) === 1 ? ' (mensual)' : '';
      return '$' + Number(producto.valor_recargo).toLocaleString('es-CO') + acumula;
    }
    if (producto.codigo_tipo_mora === 'PORCENTAJE') {
      return Number(producto.porcentaje_mensual) + '% mensual';
    }
    return '';
  }

  // ================= FILTROS =================

  get productosFiltrados(): any[] {
    const texto = (this.filtros.texto || '').trim().toLowerCase();

    return this.productos.filter((p: any) => {
      if (texto && !(p.nombre || '').toLowerCase().includes(texto)) {
        return false;
      }
      if (this.filtros.id_clasificacion && p.id_clasificacion_productos_servicios !== this.filtros.id_clasificacion) {
        return false;
      }
      if (this.filtros.id_categoria && p.id_categoria_productos_servicios !== this.filtros.id_categoria) {
        return false;
      }
      if (this.filtros.id_periodicidad && String(p.id_periodicidad_cobro) !== String(this.filtros.id_periodicidad)) {
        return false;
      }
      if (this.filtros.estado !== '' && String(p.disponible) !== this.filtros.estado) {
        return false;
      }
      if (this.filtros.conMora === 'si' && !p.id_tipo_mora) {
        return false;
      }
      if (this.filtros.conMora === 'no' && p.id_tipo_mora) {
        return false;
      }
      return true;
    });
  }

  limpiarFiltros() {
    this.filtros = {
      texto: '',
      id_clasificacion: '',
      id_categoria: '',
      id_periodicidad: '',
      estado: '',
      conMora: ''
    };
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

  /** Marca o desmarca solo lo que se ve con los filtros actuales. */
  toggleSeleccionarTodos() {
    const visibles = this.productosFiltrados;
    if (this.todosVisiblesSeleccionados) {
      visibles.forEach((p: any) => this.seleccionados.delete(p.id_producto_servicio));
    } else {
      visibles.forEach((p: any) => this.seleccionados.add(p.id_producto_servicio));
    }
  }

  get todosVisiblesSeleccionados(): boolean {
    const visibles = this.productosFiltrados;
    return visibles.length > 0 && visibles.every((p: any) => this.seleccionados.has(p.id_producto_servicio));
  }

  get totalSeleccionados(): number {
    return this.seleccionados.size;
  }

  // ================= CONDICIONES =================

  get codigoTipoSeleccionado(): string {
    const tipo = this.listas.tiposMora.find((t: any) => Number(t.id) === Number(this.condiciones.id_tipo_mora));
    return tipo ? tipo.codigo : '';
  }

  get esRecargoFijo(): boolean {
    return this.codigoTipoSeleccionado === 'RECARGO_FIJO';
  }

  get esPorcentaje(): boolean {
    return this.codigoTipoSeleccionado === 'PORCENTAJE';
  }

  // ================= ACCIONES =================

  aplicar() {
    if (this.totalSeleccionados === 0) {
      Swal.fire('Sin selección', 'Marque al menos un producto', 'warning');
      return;
    }
    if (!this.condiciones.id_tipo_mora) {
      Swal.fire('Campos incompletos', 'Seleccione el tipo de mora', 'warning');
      return;
    }
    if (this.esRecargoFijo && (!this.condiciones.valor_recargo || Number(this.condiciones.valor_recargo) <= 0)) {
      Swal.fire('Campos incompletos', 'El recargo fijo debe ser mayor que cero', 'warning');
      return;
    }
    if (this.esPorcentaje && (!this.condiciones.porcentaje_mensual || Number(this.condiciones.porcentaje_mensual) <= 0)) {
      Swal.fire('Campos incompletos', 'El porcentaje mensual debe ser mayor que cero', 'warning');
      return;
    }
    if (this.condiciones.modo_producto_mora === 'uno_para_todos' && !this.condiciones.id_producto_mora) {
      Swal.fire('Campos incompletos', 'Seleccione el producto donde se cobrará la mora', 'warning');
      return;
    }

    const resumen = this.esRecargoFijo
      ? '$' + Number(this.condiciones.valor_recargo).toLocaleString('es-CO') + ' de recargo'
      : Number(this.condiciones.porcentaje_mensual) + '% mensual';

    Swal.fire({
      title: '¿Aplicar a ' + this.totalSeleccionados + ' producto(s)?',
      html: 'Se les asignará <b>' + resumen + '</b>.<br><br>' +
            'Los que ya tenían configuración quedarán con la nueva. ' +
            'Esto solo afecta las cuentas por cobrar que se creen de aquí en adelante.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aplicar',
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
      Swal.fire('Sin selección', 'Marque al menos un producto', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Quitar la mora a ' + this.totalSeleccionados + ' producto(s)?',
      text: 'Dejarán de cobrar intereses. Las cuentas ya emitidas conservan la mora que traían.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
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
      productos: Array.from(this.seleccionados),
      accion: accion,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    if (accion === 'aplicar') {
      payload.id_tipo_mora = Number(this.condiciones.id_tipo_mora);
      payload.valor_recargo = this.esRecargoFijo ? Number(this.condiciones.valor_recargo) : null;
      payload.recargo_acumulable = this.esRecargoFijo ? Number(this.condiciones.recargo_acumulable) : 0;
      payload.porcentaje_mensual = this.esPorcentaje ? Number(this.condiciones.porcentaje_mensual) : null;
      payload.modo_producto_mora = this.condiciones.modo_producto_mora;
      payload.id_producto_mora = this.condiciones.id_producto_mora;
      payload.activo = 1;
    }

    this.moraConfiguracionService.aplicarMasivo(payload).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        this.seleccionados.clear();
        this.cargarProductos();
        Swal.fire('Listo', respuesta.message || 'Cambios aplicados', 'success');
      },
      error: (error) => {
        this.guardando = false;
        console.error('Error al aplicar la configuración de mora:', error);
        const mensaje = error?.error?.error || 'No se pudieron aplicar los cambios';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }
}
