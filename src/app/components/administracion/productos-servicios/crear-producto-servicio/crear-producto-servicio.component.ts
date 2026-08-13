import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CategoriaProductosServiciosService } from '../../../../services/categoria-productos-servicios.service';
import { ClasificacionProductosServiciosService } from '../../../../services/clasificacion-productos-servicios.service';
import { HorariosAlimentacionService } from '../../../../services/horarios-alimentacion.service';
import { PeriodicidadCobroService } from '../../../../services/periodicidad-cobro.service';
import { TiposCobroProductoService } from '../../../../services/tipos-cobro-producto.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { MoraConfiguracionService } from '../../../../services/mora-configuracion.service';
import { TiposMoraService } from '../../../../services/tipos-mora.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-crear-producto-servicio',
  templateUrl: './crear-producto-servicio.component.html',
  styleUrl: './crear-producto-servicio.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearProductoServicioComponent implements OnInit {

  titulo = "Crear Producto/Servicio";
  accion = "crear";
  regresar = "/administracion/datos-maestros/productos-servicios";
  editable = true;
  submitted = false;
  productoServicioActivoSwitch = true;
  valorSugeridoFormateado = '';
  tabActiva = 'datos';
  listasProductos: any[] = [];

  /* Configuracion de mora del producto. `cobra` es solo de pantalla: cuando
     queda en false se borra la configuracion al grabar. */
  mora = {
    id: '',
    cobra: false,
    id_tipo_mora: null as any,
    valor_recargo: null as any,
    recargo_acumulable: 0,
    porcentaje_mensual: null as any,
    /* Producto bajo el cual nacen las cuentas por cobrar de mora.
       modo: 'crear' genera uno nuevo, 'existente' usa el seleccionado. */
    modo_producto_mora: 'crear',
    id_producto_mora: null as any,
    nombre_producto_mora: ''
  };

  model = {
    id: null,
    nombre: '',
    detalles: '',
    id_clasificacion_productos_servicios: '',
    id_categoria_productos_servicios: '',
    id_periodicidad_cobro: '',
    id_tipo_cobro: '',
    valor_sugerido: '',
    id_horario_alimentacion_sugerido: '',
    disponible: 1,
    anio: new Date().getFullYear()
  } as any;

  listas = {
    clasificaciones: [] as any[],
    categorias: [] as any[],
    periodicidades: [] as any[],
    tiposCobro: [] as any[],
    horarios: [] as any[],
    tiposMora: [] as any[]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosServiciosService: ProductosServiciosService,
    private clasificacionService: ClasificacionProductosServiciosService,
    private categoriaService: CategoriaProductosServiciosService,
    private periodicidadService: PeriodicidadCobroService,
    private tiposCobroProductoService: TiposCobroProductoService,
    private horariosService: HorariosAlimentacionService,
    private moraConfiguracionService: MoraConfiguracionService,
    private tiposMoraService: TiposMoraService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarListas();
    
    const accion = this.route.snapshot.paramMap.get('accion');
    const id = this.route.snapshot.paramMap.get('id');
    
    if (accion && id) {
      this.accion = accion;
      
      if (this.accion === 'editar') {
        this.titulo = "Editar Producto/Servicio";
        this.cargarProductoServicio(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Producto/Servicio";
        this.editable = false;
        this.cargarProductoServicio(id);
      }
    }
  }

  cargarListas() {
    this.clasificacionService.obtenerTodos().subscribe((response: any) => {
      this.listas.clasificaciones = response.body;
    });

    this.categoriaService.obtenerTodos().subscribe((response: any) => {
      this.listas.categorias = response.body;
    });

    this.periodicidadService.obtenerTodos().subscribe((response: any) => {
      this.listas.periodicidades = response.body;
    });

    this.tiposCobroProductoService.obtenerActivos().subscribe((response: any) => {
      this.listas.tiposCobro = response.body;
    });

    this.horariosService.obtenerTodos().subscribe((response: any) => {
      this.listas.horarios = response.body;
    });

    this.tiposMoraService.obtenerTodos().subscribe((response: any) => {
      this.listas.tiposMora = response.body;
    });

    this.productosServiciosService.obtenerTodos().subscribe((response: any) => {
      this.listasProductos = response.body || response;
    });
  }

  cambiarTab(tab: string) {
    this.tabActiva = tab;
  }

  /** Codigo del tipo elegido; el HTML lo usa para mostrar solo lo que aplica. */
  get codigoTipoMora(): string {
    const tipo = this.listas.tiposMora.find((t: any) => Number(t.id) === Number(this.mora.id_tipo_mora));
    return tipo ? tipo.codigo : '';
  }

  get esRecargoFijo(): boolean {
    return this.codigoTipoMora === 'RECARGO_FIJO';
  }

  get esPorcentaje(): boolean {
    return this.codigoTipoMora === 'PORCENTAJE';
  }

  /** Al apagar el cobro se limpian los valores para no grabar datos sueltos. */
  onCambioCobraMora() {
    if (!this.mora.cobra) {
      this.mora.id_tipo_mora = null;
      this.mora.valor_recargo = null;
      this.mora.recargo_acumulable = 0;
      this.mora.porcentaje_mensual = null;
      return;
    }

    // Al prender el cobro se sugiere el nombre del producto de mora.
    if (!this.mora.nombre_producto_mora) {
      this.mora.nombre_producto_mora = 'Mora - ' + (this.model.nombre || '');
    }
  }

  /** Productos que se pueden elegir como producto de mora (excluye el propio). */
  get productosParaMora(): any[] {
    return this.listasProductos.filter((p: any) => p.id !== this.model.id);
  }

  /** Trae la configuracion de mora del producto, si la tiene. */
  cargarMora(idProducto: string) {
    this.moraConfiguracionService.obtenerPorProducto(idProducto).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        const config = Array.isArray(body) ? body[0] : body;

        if (!config) {
          this.mora.cobra = false;
          return;
        }

        this.mora = {
          id: config.id,
          cobra: true,
          id_tipo_mora: config.id_tipo_mora !== null ? Number(config.id_tipo_mora) : null,
          valor_recargo: config.valor_recargo,
          recargo_acumulable: Number(config.recargo_acumulable),
          porcentaje_mensual: config.porcentaje_mensual,
          /* Ya tiene producto de mora: por defecto se conserva ese. */
          modo_producto_mora: config.id_producto_mora ? 'existente' : 'crear',
          id_producto_mora: config.id_producto_mora || null,
          nombre_producto_mora: ''
        };
      },
      error: (error: any) => {
        console.error('Error al cargar la configuración de mora', error);
      }
    });
  }

  cargarProductoServicio(id: string) {
    this.productosServiciosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const data = response.body;
        
        this.model = {
          id: data.id,
          nombre: data.nombre || '',
          detalles: data.detalles || '',
          id_clasificacion_productos_servicios: data.id_clasificacion_productos_servicios || '',
          id_categoria_productos_servicios: data.id_categoria_productos_servicios || '',
          id_periodicidad_cobro: data.id_periodicidad_cobro || '',
          id_tipo_cobro: data.id_tipo_cobro || '',
          valor_sugerido: data.valor_sugerido || '',
          id_horario_alimentacion_sugerido: data.id_horario_alimentacion_sugerido || '',
          disponible: data.disponible,
          anio: data.anio || new Date().getFullYear()
        };
        
        if (this.accion === 'editar') {
          this.titulo = `Editar Producto/Servicio: ${data.nombre}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar Producto/Servicio: ${data.nombre}`;
        }
        
        if (this.model.valor_sugerido) {
          this.valorSugeridoFormateado = this.formatearNumero(this.model.valor_sugerido);
        }
        
        this.productoServicioActivoSwitch = data.disponible === 1;

        this.cargarMora(data.id);
      },
      error: (error: any) => {
        console.error("Error al cargar producto/servicio", error);
        Swal.fire('Error', 'No se pudo cargar el producto/servicio', 'error');
      }
    });
  }

  cambiarEstado() {
    this.model.disponible = this.productoServicioActivoSwitch ? 1 : 0;
  }

  formatearNumero(valor: any): string {
    if (!valor) return '';
    const numero = valor.toString().replace(/\D/g, '');
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  onValorChange(event: any) {
    let valor = event.target.value.replace(/\D/g, '');
    
    if (valor === '') {
      this.valorSugeridoFormateado = '';
      this.model.valor_sugerido = '';
      return;
    }
    
    this.valorSugeridoFormateado = this.formatearNumero(valor);
    this.model.valor_sugerido = valor;
  }

  guardar() {
    this.submitted = true;

    if (!this.validarFormulario()) {
      Swal.fire('Campos requeridos', 'Por favor complete todos los campos obligatorios', 'warning');
      return;
    }

    this.model.anio = new Date().getFullYear();

    const payload = {
      ...this.model,
      id_categoria_productos_servicios: this.model.id_categoria_productos_servicios || null,
      id_periodicidad_cobro: this.model.id_periodicidad_cobro || null,
      id_tipo_cobro: this.model.id_tipo_cobro || null,
      id_horario_alimentacion_sugerido: this.model.id_horario_alimentacion_sugerido || null,
      valor_sugerido: this.model.valor_sugerido || null
    };

    if (this.accion === 'crear') {
      this.productosServiciosService.crear(payload).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Producto/Servicio creado correctamente', 'success');
          this.router.navigate(['/administracion/datos-maestros/productos-servicios']);
        },
        error: (error: any) => {
          console.error("Error al crear producto/servicio", error);
          Swal.fire('Error', 'No se pudo crear el producto/servicio', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      this.productosServiciosService.actualizar(payload).subscribe({
        next: (response: any) => {
          this.guardarMora();
        },
        error: (error: any) => {
          console.error("Error al actualizar producto/servicio", error);
          Swal.fire('Error', 'No se pudo actualizar el producto/servicio', 'error');
        }
      });
    }
  }

  /**
   * Guarda la configuracion de mora del producto y cierra el flujo de grabado.
   * Tres casos: crearla, actualizarla o borrarla cuando se apago el cobro.
   * Un fallo aqui no debe perder los datos del producto, que ya se guardaron:
   * por eso se avisa y se sigue.
   */
  guardarMora() {
    const terminar = (mensaje: string) => {
      Swal.fire('Éxito', mensaje, 'success');
      this.router.navigate(['/administracion/datos-maestros/productos-servicios']);
    };

    const avisarError = (error: any) => {
      console.error('Error al guardar la configuración de mora', error);
      Swal.fire(
        'Atención',
        'El producto se guardó, pero no se pudo guardar la configuración de intereses de mora.',
        'warning'
      );
      this.router.navigate(['/administracion/datos-maestros/productos-servicios']);
    };

    // Se apago el cobro y existia configuracion: se borra.
    if (!this.mora.cobra) {
      if (!this.mora.id) {
        terminar('Producto/Servicio actualizado correctamente');
        return;
      }
      this.moraConfiguracionService.eliminar({ id: this.mora.id }).subscribe({
        next: () => terminar('Producto/Servicio actualizado y cobro de mora retirado'),
        error: avisarError
      });
      return;
    }

    if (!this.mora.id_tipo_mora) {
      Swal.fire('Campos incompletos', 'Seleccione el tipo de mora o apague el cobro de intereses', 'warning');
      this.tabActiva = 'mora';
      return;
    }

    if (this.esRecargoFijo && (!this.mora.valor_recargo || Number(this.mora.valor_recargo) <= 0)) {
      Swal.fire('Campos incompletos', 'El recargo fijo debe ser mayor que cero', 'warning');
      this.tabActiva = 'mora';
      return;
    }

    if (this.esPorcentaje && (!this.mora.porcentaje_mensual || Number(this.mora.porcentaje_mensual) <= 0)) {
      Swal.fire('Campos incompletos', 'El porcentaje mensual debe ser mayor que cero', 'warning');
      this.tabActiva = 'mora';
      return;
    }

    if (this.mora.modo_producto_mora === 'existente' && !this.mora.id_producto_mora) {
      Swal.fire('Campos incompletos', 'Seleccione el producto donde se cobrará la mora', 'warning');
      this.tabActiva = 'mora';
      return;
    }

    const dataMora: any = {
      id_producto_servicio: this.model.id,
      id_tipo_mora: Number(this.mora.id_tipo_mora),
      modo_producto_mora: this.mora.modo_producto_mora,
      id_producto_mora: this.mora.id_producto_mora,
      nombre_producto_mora: this.mora.nombre_producto_mora,
      valor_recargo: this.esRecargoFijo ? Number(this.mora.valor_recargo) : null,
      recargo_acumulable: this.esRecargoFijo ? Number(this.mora.recargo_acumulable) : 0,
      porcentaje_mensual: this.esPorcentaje ? Number(this.mora.porcentaje_mensual) : null,
      activo: 1,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    if (this.mora.id) {
      dataMora.id = this.mora.id;
      this.moraConfiguracionService.actualizar(dataMora).subscribe({
        next: () => terminar('Producto/Servicio actualizado correctamente'),
        error: avisarError
      });
    } else {
      this.moraConfiguracionService.crear(dataMora).subscribe({
        next: () => terminar('Producto/Servicio actualizado correctamente'),
        error: avisarError
      });
    }
  }

  validarFormulario(): boolean {
    return !!(
      this.model.nombre &&
      this.model.id_clasificacion_productos_servicios &&
      this.model.id_categoria_productos_servicios &&
      this.model.id_periodicidad_cobro &&
      this.model.id_tipo_cobro
    );
  }

  volver() {
    this.router.navigate(['/administracion/datos-maestros/productos-servicios']);
  }
}