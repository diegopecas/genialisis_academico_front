import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ConceptosMovimientoService } from '../../../../services/conceptos-movimiento.service';
import { MovimientosProductosService } from '../../../../services/movimientos-productos.service';
import { ProductosAlimentacionService } from '../../../../services/productos-alimentacion.service';
import { ClasificacionProductosAlimentacionService } from '../../../../services/clasificacion-productos-alimentacion.service';
import { MenusService } from '../../../../services/menus.service';
import { ItemsMenuService } from '../../../../services/items-menu.service';
import { UtilService } from '../../../../common/constantes/util.service';

interface ProductoAlimentacion {
  id: number;
  nombre: string;
  descripcion: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  abreviatura_unidad: string;
  nombre_unidad: string;

  // Para el movimiento
  seleccionado: boolean;
  cantidad: number | null;
  error: string | null;
}

interface MenuSalida {
  id: number;
  nombre: string;
  descripcion: string;
  items: any[];
  seleccionado: boolean;
  cantidad: number;
  ingredientesCalculados?: any[];
}

interface ItemMenuSalida {
  id: number;
  nombre: string;
  porcion: string;
  ingredientes: any[];
  seleccionado: boolean;
  cantidad: number;
  ingredientesCalculados?: any[];
}

@Component({
  selector: 'app-crear-salida-alimentacion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-salida-alimentacion.component.html',
  styleUrls: ['./crear-salida-alimentacion.component.scss']
})
export class CrearSalidaAlimentacionComponent implements OnInit {

  // Configuración
  titulo = "Registrar Salida de Alimentación";
  regresar = '/operaciones/salidas-alimentacion';
  accion = 'crear';
  id = '0';

  // Tipo de salida
  tipoSalida: 'productos' | 'menus' | 'items' = 'productos';

  // Controles principales
  fechaSalida: string = this.obtenerFechaHoy();
  clasificacionSeleccionada: number | null = null;
  conceptoSeleccionado: number | null = null;
  observaciones: string = '';

  // Datos
  clasificaciones: any[] = [];
  conceptosAlimentacion: any[] = [];
  productos: ProductoAlimentacion[] = [];
  productosFiltrados: ProductoAlimentacion[] = [];
  menus: MenuSalida[] = [];
  itemsMenu: ItemMenuSalida[] = [];

  // Estados
  cargando: boolean = false;
  guardando: boolean = false;
  productosCargados: boolean = false;

  // Buscador
  busquedaProducto: string = '';

  // Estadísticas
  totalProductosSeleccionados: number = 0;
  totalCantidad: number = 0;
  valorTotalSalida: number = 0;

  // Buscador de menús
  busquedaMenu: string = '';
  menusFiltrados: MenuSalida[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private conceptosService: ConceptosMovimientoService,
    private movimientosService: MovimientosProductosService,
    private productosAlimentacionService: ProductosAlimentacionService,
    private clasificacionService: ClasificacionProductosAlimentacionService,
    private menusService: MenusService,
    private itemsMenuService: ItemsMenuService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'] || 'crear';
      this.id = params['id'] || '0';

      if (this.accion === 'consultar') {
        this.titulo = "Consultar Salida de Alimentación";
        this.cargarSalida(this.id);
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Salida de Alimentación";
        this.cargarSalida(this.id);
      }
    });

    this.cargarDatosIniciales();
  }

  obtenerFechaHoy(): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  private cargarDatosIniciales(): Promise<void> {
    return new Promise((resolve) => {
      let clasificacionesCargadas = false;
      let conceptosCargados = false;

      // Cargar clasificaciones
      this.clasificacionService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.clasificaciones = response.body || [];
          console.log('Clasificaciones cargadas:', this.clasificaciones);
          clasificacionesCargadas = true;
          if (clasificacionesCargadas && conceptosCargados) {
            resolve();
          }
        },
        error: (error) => {
          console.error('Error al cargar clasificaciones:', error);
          Swal.fire('Error', 'No se pudieron cargar las clasificaciones', 'error');
          clasificacionesCargadas = true;
          if (clasificacionesCargadas && conceptosCargados) {
            resolve();
          }
        }
      });

      // Cargar conceptos de alimentación
      this.conceptosService.obtenerTodos().subscribe({
        next: (response: any) => {
          const todos = response.body || [];
          // Filtrar solo conceptos de salida que contengan "alimentación"
          this.conceptosAlimentacion = todos.filter((c: any) =>
            c.tipo === 'S' &&
            c.nombre.toLowerCase().includes('alimentación')
          );
          console.log('Conceptos de alimentación cargados:', this.conceptosAlimentacion);
          conceptosCargados = true;
          if (clasificacionesCargadas && conceptosCargados) {
            resolve();
          }
        },
        error: (error) => {
          console.error('Error al cargar conceptos:', error);
          conceptosCargados = true;
          if (clasificacionesCargadas && conceptosCargados) {
            resolve();
          }
        }
      });
    });
  }

  cambiarTipoSalida(tipo: 'productos' | 'menus' | 'items'): void {
    this.tipoSalida = tipo;
    this.limpiarSeleccion();

    // Cargar datos según el tipo
    switch (tipo) {
      case 'productos':
        if (this.productos.length === 0) {
          this.cargarProductos();
        }
        break;
      case 'menus':
        this.cargarMenus();
        break;
      case 'items':
        this.cargarItemsMenu();
        break;
    }
  }

  onClasificacionCambiada(): void {
    if (!this.clasificacionSeleccionada) {
      this.productos = [];
      this.productosFiltrados = [];
      this.menus = [];
      this.itemsMenu = [];
      this.productosCargados = false;
      this.actualizarEstadisticas();
      return;
    }

    // Auto-seleccionar concepto si hay uno que coincida con la clasificación
    const clasificacion = this.clasificaciones.find(c => c.id === this.clasificacionSeleccionada);
    if (clasificacion) {
      const conceptoMatch = this.conceptosAlimentacion.find(c =>
        c.nombre.toLowerCase().includes(clasificacion.nombre.toLowerCase())
      );
      if (conceptoMatch) {
        this.conceptoSeleccionado = conceptoMatch.id;
      }
    }

    // Cargar según el tipo de salida activo
    this.cambiarTipoSalida(this.tipoSalida);
  }

  cargarProductos(): void {
    if (!this.clasificacionSeleccionada) return;

    this.cargando = true;
    this.productosAlimentacionService.obtenerProductosPorClasificacionConStock(this.clasificacionSeleccionada).subscribe({
      next: (response: any) => {
        const productosData = response.body || [];

        this.productos = productosData.map((prod: any) => ({
          id: prod.id,
          nombre: prod.nombre,
          descripcion: prod.descripcion,
          stock_actual: parseFloat(prod.stock_actual),
          stock_minimo: parseFloat(prod.stock_minimo),
          precio_unitario: parseFloat(prod.precio_unitario),
          abreviatura_unidad: prod.abreviatura_unidad || 'UND',
          nombre_unidad: prod.nombre_unidad || 'Unidad',
          seleccionado: false,
          cantidad: null,
          error: null
        }));

        this.productosFiltrados = [...this.productos];
        this.productosCargados = true;
        this.cargando = false;

        // Aplicar filtro si hay búsqueda activa
        this.filtrarProductos();

        console.log('Productos cargados:', this.productos.length);

        if (this.productos.length === 0) {
          Swal.fire({
            title: 'Sin productos',
            text: 'No hay productos con stock disponible para esta clasificación',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
      }
    });
  }

  cargarMenus(): void {
    this.cargando = true;
    this.menusService.obtenerTodos().subscribe({
      next: (response: any) => {
        const menusData = response.body || [];
        const menusActivos = menusData.filter((m: any) => m.activo === 1);

        this.menus = [];
        this.menusFiltrados = [];

        let menusProcessed = 0;

        if (menusActivos.length === 0) {
          this.cargando = false;
          return;
        }

        menusActivos.forEach((menu: any) => {
          this.menusService.obtenerById(menu.id).subscribe({
            next: (menuResponse: any) => {
              const menuDetalle = menuResponse.body;

              // Necesitamos cargar los ingredientes de cada item
              const itemsConIngredientes: any[] = [];
              let itemsProcessed = 0;

              if (!menuDetalle.items || menuDetalle.items.length === 0) {
                // Si no hay items, crear el menú vacío
                const menuSalida: MenuSalida = {
                  id: menuDetalle.id,
                  nombre: menuDetalle.nombre,
                  descripcion: menuDetalle.descripcion,
                  items: [],
                  seleccionado: false,
                  cantidad: 0,
                  ingredientesCalculados: []
                };

                this.menus.push(menuSalida);
                menusProcessed++;

                if (menusProcessed === menusActivos.length) {
                  this.finalizarCargaMenus();
                }
              } else {
                // Cargar ingredientes de cada item
                menuDetalle.items.forEach((item: any) => {
                  // Usar el id correcto del item
                  const itemId = item.id_item_menu || item.id;

                  this.itemsMenuService.obtenerById(itemId).subscribe({
                    next: (itemResponse: any) => {
                      const itemCompleto = itemResponse.body;

                      itemsConIngredientes.push({
                        ...item,
                        ingredientes: itemCompleto.ingredientes || [],
                        incluido: true,
                        es_opcional: item.es_opcional === 1 || item.es_opcional === true
                      });

                      itemsProcessed++;

                      if (itemsProcessed === menuDetalle.items.length) {
                        // Todos los items cargados, crear el menú
                        const menuSalida: MenuSalida = {
                          id: menuDetalle.id,
                          nombre: menuDetalle.nombre,
                          descripcion: menuDetalle.descripcion,
                          items: itemsConIngredientes,
                          seleccionado: false,
                          cantidad: 0,
                          ingredientesCalculados: []
                        };

                        this.menus.push(menuSalida);
                        menusProcessed++;

                        if (menusProcessed === menusActivos.length) {
                          this.finalizarCargaMenus();
                        }
                      }
                    },
                    error: (error) => {
                      console.error(`Error al cargar ingredientes del item ${itemId}:`, error);

                      // Agregar el item sin ingredientes en caso de error
                      itemsConIngredientes.push({
                        ...item,
                        ingredientes: [],
                        incluido: true,
                        es_opcional: item.es_opcional === 1 || item.es_opcional === true
                      });

                      itemsProcessed++;

                      if (itemsProcessed === menuDetalle.items.length) {
                        const menuSalida: MenuSalida = {
                          id: menuDetalle.id,
                          nombre: menuDetalle.nombre,
                          descripcion: menuDetalle.descripcion,
                          items: itemsConIngredientes,
                          seleccionado: false,
                          cantidad: 0,
                          ingredientesCalculados: []
                        };

                        this.menus.push(menuSalida);
                        menusProcessed++;

                        if (menusProcessed === menusActivos.length) {
                          this.finalizarCargaMenus();
                        }
                      }
                    }
                  });
                });
              }
            },
            error: (error) => {
              console.error(`Error al cargar menú ${menu.id}:`, error);
              menusProcessed++;
              if (menusProcessed === menusActivos.length) {
                this.finalizarCargaMenus();
              }
            }
          });
        });
      },
      error: (error) => {
        this.cargando = false;
        this.menus = [];
        this.menusFiltrados = [];
        console.error('Error al cargar menús:', error);
        Swal.fire('Error', 'No se pudieron cargar los menús', 'error');
      }
    });
  }

  // Método auxiliar para finalizar la carga
  private finalizarCargaMenus(): void {
    this.menus.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.menusFiltrados = [...this.menus];

    if (this.busquedaMenu) {
      this.filtrarMenus();
    }

    this.cargando = false;
    console.log('Menús cargados con ingredientes:', this.menus);
  }

  cargarItemsMenu(): void {
    this.cargando = true;
    this.itemsMenuService.obtenerTodos().subscribe({
      next: (response: any) => {
        const itemsData = response.body || [];

        this.itemsMenu = [];
        let itemsProcessed = 0;

        if (itemsData.length === 0) {
          this.cargando = false;
          return;
        }

        itemsData.forEach((item: any) => {
          this.itemsMenuService.obtenerById(item.id).subscribe({
            next: (itemResponse: any) => {
              const itemDetalle = itemResponse.body;

              // Procesar ingredientes con propiedades adicionales
              const ingredientesConEstado = (itemDetalle.ingredientes || []).map((ing: any) => ({
                ...ing,
                incluido: true, // Por defecto todos incluidos
                // Convertir es_opcional a boolean si viene como número
                es_opcional: ing.es_opcional === 1 || ing.es_opcional === true
              }));

              const itemSalida: ItemMenuSalida = {
                id: itemDetalle.id,
                nombre: itemDetalle.nombre,
                porcion: itemDetalle.nombre_porcion || 'Estándar',
                ingredientes: ingredientesConEstado,
                seleccionado: false,
                cantidad: 0,
                ingredientesCalculados: []
              };

              this.itemsMenu.push(itemSalida);
              itemsProcessed++;

              if (itemsProcessed === itemsData.length) {
                this.cargando = false;
                console.log('Ítems de menú cargados:', this.itemsMenu);
              }
            },
            error: (error) => {
              console.error(`Error al cargar ítem ${item.id}:`, error);
              itemsProcessed++;
              if (itemsProcessed === itemsData.length) {
                this.cargando = false;
              }
            }
          });
        });
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar ítems de menú:', error);
        Swal.fire('Error', 'No se pudieron cargar los ítems de menú', 'error');
      }
    });
  }

  onMenuSeleccionado(menu: MenuSalida): void {
    if (this.accion === 'consultar') return;

    if (!menu.seleccionado) {
      menu.cantidad = 0;
      menu.ingredientesCalculados = [];
    }

    this.actualizarEstadisticas();
  }

  onCantidadMenuCambiada(menu: MenuSalida): void {
    if (this.accion === 'consultar') return;

    // Calcular ingredientes necesarios
    if (menu.cantidad > 0) {
      menu.seleccionado = true;
      this.calcularIngredientesMenu(menu);
    } else {
      menu.seleccionado = false;
      menu.ingredientesCalculados = [];
    }

    this.actualizarEstadisticas();
  }



  onCantidadItemCambiada(item: ItemMenuSalida): void {
    if (this.accion === 'consultar') return;

    // Calcular ingredientes necesarios
    if (item.cantidad > 0) {
      item.seleccionado = true;
      this.calcularIngredientesItem(item);
    } else {
      item.seleccionado = false;
      item.ingredientesCalculados = [];
    }

    this.actualizarEstadisticas();
  }

  private calcularIngredientesMenu(menu: MenuSalida): void {
    // Limpiar cálculo anterior
    menu.ingredientesCalculados = [];

    // Mapa para acumular ingredientes
    const ingredientesMap = new Map<number, any>();

    // Iterar sobre los items del menú que están incluidos
    menu.items.forEach(item => {
      // Solo procesar items incluidos (obligatorios siempre están incluidos)
      if (!item.es_opcional || item.incluido) {
        // Si el item tiene ingredientes (viene del backend)
        if (item.ingredientes && Array.isArray(item.ingredientes)) {
          item.ingredientes.forEach((ing: any) => {
            const key = ing.id_producto || ing.id;

            if (ingredientesMap.has(key)) {
              // Si ya existe, sumar la cantidad
              const existing = ingredientesMap.get(key);
              existing.cantidadNecesaria += (ing.cantidad * menu.cantidad);
            } else {
              // Si no existe, agregarlo
              ingredientesMap.set(key, {
                id: key,
                nombre: ing.nombre_producto || ing.nombre || 'Producto sin nombre',
                cantidadNecesaria: ing.cantidad * menu.cantidad,
                unidad: ing.abreviatura_unidad || ing.unidad || 'UND',
                stockActual: 0, // Se debe obtener del servicio
                stockInsuficiente: false
              });
            }
          });
        }
      }
    });

    // Convertir el mapa a array
    menu.ingredientesCalculados = Array.from(ingredientesMap.values());

    // Si tienes acceso al stock actual, puedes hacer una llamada al servicio aquí
    // para obtener el stock de cada producto y validar si es suficiente
    this.validarStockIngredientes(menu);
  }

  // Método auxiliar para validar stock (opcional)
  private validarStockIngredientes(menu: MenuSalida): void {
    // Por cada ingrediente calculado, verificar stock
    menu.ingredientesCalculados?.forEach(ing => {
      // Aquí podrías hacer una llamada al servicio para obtener el stock real
      // Por ahora, simulamos con valores aleatorios
      ing.stockActual = Math.floor(Math.random() * 100) + 10; // Simulación
      ing.stockInsuficiente = ing.cantidadNecesaria > ing.stockActual;
    });
  }



  onProductoSeleccionado(producto: ProductoAlimentacion): void {
    if (this.accion === 'consultar') return;

    producto.seleccionado = !producto.seleccionado;

    if (!producto.seleccionado) {
      producto.cantidad = null;
      producto.error = null;
    }

    this.actualizarEstadisticas();
  }

  onCantidadCambiada(producto: ProductoAlimentacion, event: any): void {
    if (this.accion === 'consultar') return;

    const valor = parseFloat(event.target.value);

    if (!isNaN(valor) && valor > 0) {
      if (valor > producto.stock_actual) {
        producto.error = `Stock insuficiente (disponible: ${producto.stock_actual})`;
        producto.cantidad = valor;
      } else {
        producto.cantidad = valor;
        producto.seleccionado = true;
        producto.error = null;
      }
    } else {
      producto.cantidad = null;
      producto.seleccionado = false;
      producto.error = null;
    }

    this.actualizarEstadisticas();
  }

  seleccionarTodos(): void {
    if (this.accion === 'consultar') return;

    const todosSeleccionados = this.productosFiltrados.every(p => p.seleccionado);

    this.productosFiltrados.forEach(p => {
      p.seleccionado = !todosSeleccionados;
      if (!p.seleccionado) {
        p.cantidad = null;
        p.error = null;
      }
    });

    this.actualizarEstadisticas();
  }

  limpiarSeleccion(): void {
    if (this.accion === 'consultar') return;

    // Limpiar según el tipo de salida
    switch (this.tipoSalida) {
      case 'productos':
        this.productos.forEach(p => {
          p.seleccionado = false;
          p.cantidad = null;
          p.error = null;
        });
        break;
      case 'menus':
        this.menus.forEach(m => {
          m.seleccionado = false;
          m.cantidad = 0;
          m.ingredientesCalculados = [];
        });
        break;
      case 'items':
        this.itemsMenu.forEach(i => {
          i.seleccionado = false;
          i.cantidad = 0;
          i.ingredientesCalculados = [];
        });
        break;
    }

    this.actualizarEstadisticas();
  }

  filtrarProductos(): void {
    if (!this.busquedaProducto.trim()) {
      this.productosFiltrados = [...this.productos];
      return;
    }

    const busqueda = this.busquedaProducto.toLowerCase().trim();
    this.productosFiltrados = this.productos.filter(producto =>
      producto.nombre.toLowerCase().includes(busqueda) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(busqueda))
    );
  }

  onBusquedaCambiada(): void {
    this.filtrarProductos();
  }

  limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.filtrarProductos();
  }

  private actualizarEstadisticas(): void {
    switch (this.tipoSalida) {
      case 'productos':
        const productosConCantidad = this.productos.filter(p => p.seleccionado && p.cantidad && !p.error);

        this.totalProductosSeleccionados = productosConCantidad.length;
        this.totalCantidad = productosConCantidad.reduce((sum, p) => sum + (p.cantidad || 0), 0);
        this.valorTotalSalida = productosConCantidad.reduce((sum, p) =>
          sum + ((p.cantidad || 0) * p.precio_unitario), 0
        );
        break;

      case 'menus':
        const menusSeleccionados = this.menus.filter(m => m.seleccionado && m.cantidad > 0);

        this.totalProductosSeleccionados = menusSeleccionados.length;
        this.totalCantidad = menusSeleccionados.reduce((sum, m) => sum + m.cantidad, 0);
        // TODO: Calcular valor real basado en ingredientes
        this.valorTotalSalida = 0;
        break;

      case 'items':
        const itemsSeleccionados = this.itemsMenu.filter(i => i.seleccionado && i.cantidad > 0);

        this.totalProductosSeleccionados = itemsSeleccionados.length;
        this.totalCantidad = itemsSeleccionados.reduce((sum, i) => sum + i.cantidad, 0);
        // TODO: Calcular valor real basado en ingredientes
        this.valorTotalSalida = 0;
        break;
    }
  }

  async guardarSalida(): Promise<void> {
    // Validaciones
    if (!this.validarFormulario()) return;

    let detalleMovimiento: any[] = [];
    let descripcionAdicional = '';

    // Preparar detalle según el tipo de salida
    switch (this.tipoSalida) {
      case 'productos':
        const productosSeleccionados = this.productos.filter(p =>
          p.seleccionado && p.cantidad && !p.error
        );

        if (productosSeleccionados.length === 0) {
          Swal.fire('Error', 'Debe seleccionar al menos un producto con cantidad válida', 'error');
          return;
        }

        detalleMovimiento = productosSeleccionados.map(prod => ({
          id_producto: prod.id,
          cantidad: prod.cantidad,
          precio_unitario: prod.precio_unitario,
          fecha_vencimiento: null
        }));

        descripcionAdicional = `${productosSeleccionados.length} productos`;
        break;

      case 'menus':
        const menusSeleccionados = this.menus.filter(m => m.seleccionado && m.cantidad > 0);

        if (menusSeleccionados.length === 0) {
          Swal.fire('Error', 'Debe seleccionar al menos un menú con cantidad', 'error');
          return;
        }

        // Consolidar ingredientes
        const ingredientesConsolidados = new Map<number, any>();

        menusSeleccionados.forEach(menu => {
          menu.items.forEach(item => {
            if (!item.es_opcional || item.incluido) {
              item.ingredientes.forEach((ing: any) => {
                const idProducto = ing.id_producto || ing.id;
                const cantidadNecesaria = ing.cantidad * menu.cantidad;

                if (ingredientesConsolidados.has(idProducto)) {
                  const existente = ingredientesConsolidados.get(idProducto);
                  existente.cantidad += cantidadNecesaria;
                } else {
                  ingredientesConsolidados.set(idProducto, {
                    id_producto: idProducto,
                    cantidad: cantidadNecesaria,
                    precio_unitario: ing.precio_unitario || 0,
                    fecha_vencimiento: null
                  });
                }
              });
            }
          });
        });

        detalleMovimiento = Array.from(ingredientesConsolidados.values());

        descripcionAdicional = menusSeleccionados.map(m => {
          const itemsExcluidos = m.items.filter(i => i.es_opcional && !i.incluido);
          let desc = `${m.cantidad} ${m.nombre}`;
          if (itemsExcluidos.length > 0) {
            desc += ` (sin: ${itemsExcluidos.map(i => i.nombre_item || i.nombre).join(', ')})`;
          }
          return desc;
        }).join(', ');
        break;

      case 'items':
        const itemsSeleccionados = this.itemsMenu.filter(i => i.seleccionado && i.cantidad > 0);

        if (itemsSeleccionados.length === 0) {
          Swal.fire('Error', 'Debe seleccionar al menos un ítem con cantidad', 'error');
          return;
        }

        // TODO: Convertir ítems a productos reales
        descripcionAdicional = itemsSeleccionados.map(i => `${i.cantidad} ${i.nombre}`).join(', ');
        break;
    }
    //Validar stock antes de confirmar
    if (detalleMovimiento.length > 0) {
      const stockValido = await this.validarStockDisponible(detalleMovimiento);
      if (!stockValido) {
        return; // Detener si no hay stock suficiente
      }
    }
    // Confirmar
    const result = await Swal.fire({
      title: '¿Crear salida de alimentación?',
      html: `
        <div class="text-start">
          <div class="alert alert-info mb-3">
            <i class="fas fa-info-circle"></i> Se creará como borrador. No afectará el inventario hasta ser registrada.
          </div>
          <p><strong>Fecha:</strong> ${this.formatearFecha(this.fechaSalida)}</p>
          <p><strong>Clasificación:</strong> ${this.obtenerNombreClasificacion()}</p>
          <p><strong>Tipo de salida:</strong> Por ${this.tipoSalida}</p>
          <p><strong>Detalle:</strong> ${descripcionAdicional}</p>
          <p><strong>Valor total:</strong> ${this.formatearPrecio(this.valorTotalSalida)}</p>
          ${this.observaciones ? `<p><strong>Observaciones:</strong> ${this.observaciones}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    // Preparar datos
    const movimiento = {
      fecha_movimiento: this.fechaSalida + ' ' + new Date().toTimeString().split(' ')[0],
      id_concepto_movimiento: this.conceptoSeleccionado,
      id_proveedor: null,
      observaciones: this.observaciones || `Salida de Alimentación - ${this.obtenerNombreClasificacion()} - ${descripcionAdicional}`,
      id_usuario_registro: this.utilService.obtenerIdUsuarioActual(),
      detalle: detalleMovimiento
    };

    this.guardando = true;

    try {
      const response = await this.movimientosService.crear(movimiento).toPromise();
      this.guardando = false;

      Swal.fire({
        title: 'Éxito',
        html: `
          <p>Salida de alimentación creada como borrador</p>
          <div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle"></i> Recuerde <strong>REGISTRAR</strong> la salida 
            desde el listado para que afecte el inventario
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Aceptar'
      }).then(() => {
        this.router.navigate([this.regresar]);
      });

    } catch (error: any) {
      this.guardando = false;
      console.error('Error al guardar salida:', error);
      Swal.fire('Error', error.error?.error || 'No se pudo guardar la salida', 'error');
    }
  }

  private validarFormulario(): boolean {
    // Validar fecha
    const fechaSeleccionada = new Date(this.fechaSalida);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);

    if (fechaSeleccionada > hoy) {
      Swal.fire('Error', 'No se pueden registrar salidas para fechas futuras', 'error');
      return false;
    }

    if (!this.clasificacionSeleccionada) {
      Swal.fire('Error', 'Debe seleccionar una clasificación', 'error');
      return false;
    }

    if (!this.conceptoSeleccionado) {
      Swal.fire('Error', 'Debe seleccionar un concepto de movimiento', 'error');
      return false;
    }

    return true;
  }

  private cargarSalida(id: string): void {
    this.cargando = true;
    this.movimientosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const movimiento = response.body;
        console.log("cargarSalida", movimiento)
        // Cargar datos del movimiento
        this.fechaSalida = movimiento.fecha_movimiento.split(' ')[0];
        this.conceptoSeleccionado = movimiento.id_concepto_movimiento;
        this.observaciones = movimiento.observaciones || '';

        // Cargar productos del detalle
        if (movimiento.detalle && Array.isArray(movimiento.detalle)) {
          this.productos = movimiento.detalle.map((detalle: any) => ({
            id: detalle.id_producto,
            nombre: detalle.producto_nombre,
            descripcion: '',
            stock_actual: detalle.stock_actual || 0,
            stock_minimo: 0,
            precio_unitario: parseFloat(detalle.precio_unitario),
            abreviatura_unidad: detalle.abreviatura || 'UND',
            nombre_unidad: '',
            seleccionado: true,
            cantidad: parseFloat(detalle.cantidad),
            error: null
          }));

          this.productosFiltrados = [...this.productos];
          this.productosCargados = true;
          this.actualizarEstadisticas();
        }

        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        console.error('Error al cargar salida:', error);
        Swal.fire('Error', 'No se pudo cargar la salida', 'error');
        this.router.navigate([this.regresar]);
      }
    });
  }

  obtenerNombreClasificacion(): string {
    const clasificacion = this.clasificaciones.find(c => c.id === this.clasificacionSeleccionada);
    return clasificacion ? clasificacion.nombre : '';
  }

  obtenerStockResultante(producto: ProductoAlimentacion): number {
    if (!producto.cantidad) return producto.stock_actual;
    return producto.stock_actual - producto.cantidad;
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  volver(): void {
    this.router.navigate([this.regresar]);
  }

  // Método auxiliar para verificar si hay items excluidos
  tieneItemsExcluidos(menu: MenuSalida): boolean {
    return menu.items.some(item => item.es_opcional && !item.incluido);
  }
  // Método para filtrar menús
  filtrarMenus(): void {
    if (!this.busquedaMenu.trim()) {
      this.menusFiltrados = [...this.menus];
      return;
    }

    const busqueda = this.busquedaMenu.toLowerCase().trim();
    this.menusFiltrados = this.menus.filter(menu =>
      menu.nombre.toLowerCase().includes(busqueda) ||
      (menu.descripcion && menu.descripcion.toLowerCase().includes(busqueda)) ||
      menu.items.some(item =>
        (item.nombre_item || item.nombre || '').toLowerCase().includes(busqueda)
      )
    );
  }

  limpiarBusquedaMenu(): void {
    this.busquedaMenu = '';
    this.filtrarMenus();
  }

  // Método para manejar el toggle de items opcionales
  onItemMenuToggle(menu: MenuSalida, item: any): void {
    if (this.accion === 'consultar') return;

    // Recalcular ingredientes si es necesario
    if (menu.cantidad > 0) {
      this.calcularIngredientesMenu(menu);
    }

    this.actualizarEstadisticas();
  }

  private async validarStockDisponible(detalleMovimiento: any[]): Promise<boolean> {
    try {
      // Preparar datos para enviar al backend
      const productosAValidar = detalleMovimiento.map(item => ({
        id_producto: item.id_producto,
        cantidad_necesaria: item.cantidad
      }));

      console.log('Validando stock para productos:', productosAValidar);

      // Llamar al servicio
      const response = await this.productosAlimentacionService
        .validarStockMultiple(productosAValidar)
        .toPromise();

      console.log('Respuesta de validación:', response);

      // Si hay productos con stock insuficiente
      if (response.productos_insuficientes && response.productos_insuficientes.length > 0) {
        const lista = response.productos_insuficientes.map((p: any) => {
          const diferencia = p.cantidad_necesaria - p.stock_actual;
          return `
          <tr>
            <td><strong>${p.nombre}</strong></td>
            <td class="text-center">${p.cantidad_necesaria.toFixed(2)}</td>
            <td class="text-center">${p.stock_actual.toFixed(2)}</td>
            <td class="text-center text-danger">${diferencia.toFixed(2)}</td>
          </tr>
        `;
        }).join('');

        await Swal.fire({
          title: 'Stock insuficiente',
          html: `
          <div class="text-start">
            <p>No hay suficiente stock para los siguientes productos:</p>
            <div class="table-responsive mt-3">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="text-center">Necesario</th>
                    <th class="text-center">Disponible</th>
                    <th class="text-center">Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  ${lista}
                </tbody>
              </table>
            </div>
            <p class="mt-3 text-muted small">
              <i class="fas fa-info-circle"></i> 
              Ajuste las cantidades o verifique el inventario antes de continuar.
            </p>
          </div>
        `,
          icon: 'warning',
          confirmButtonText: 'Entendido',
          width: '600px'
        });

        return false;
      }

      // Si la validación dice que falló pero no hay productos insuficientes
      if (!response.validacion_exitosa) {
        console.error('Validación falló sin productos insuficientes:', response);
        await Swal.fire({
          title: 'Error de validación',
          text: response.mensaje || 'Ocurrió un error al validar el stock. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
        return false;
      }

      return true; // Stock suficiente

    } catch (error: any) {
      console.error('Error en validarStockDisponible:', error);

      // Mensaje de error más específico según el tipo de error
      let mensajeError = 'Error al validar el stock disponible';
      let detalleError = '';

      if (error?.status === 0) {
        mensajeError = 'Error de conexión';
        detalleError = 'No se pudo conectar con el servidor. Verifique su conexión a internet.';
      } else if (error?.status === 404) {
        mensajeError = 'Servicio no disponible';
        detalleError = 'El servicio de validación no está disponible. Contacte al administrador.';
      } else if (error?.status === 500) {
        mensajeError = 'Error del servidor';
        detalleError = error?.error?.message || 'Ocurrió un error interno del servidor.';
      } else if (error?.error?.message) {
        detalleError = error.error.message;
      } else if (error?.message) {
        detalleError = error.message;
      } else {
        detalleError = 'Ocurrió un error inesperado. Por favor, intente nuevamente.';
      }

      await Swal.fire({
        title: mensajeError,
        html: `
        <div class="text-start">
          <p>${detalleError}</p>
          ${error?.status ? `<p class="text-muted small mt-2">Código de error: ${error.status}</p>` : ''}
        </div>
      `,
        icon: 'error',
        confirmButtonText: 'OK'
      });

      return false;
    }
  }

  // Método para manejar el toggle de ingredientes opcionales en ítems
  onIngredienteItemToggle(item: ItemMenuSalida, ingrediente: any): void {
    if (this.accion === 'consultar') return;

    console.log(`Ingrediente ${ingrediente.nombre_producto} del ítem ${item.nombre}: ${ingrediente.incluido ? 'incluido' : 'excluido'}`);

    // Recalcular si el ítem tiene cantidad
    if (item.cantidad > 0) {
      this.calcularIngredientesItem(item);
    }

    this.actualizarEstadisticas();
  }

  // Método para verificar si un ítem tiene ingredientes excluidos
  tieneIngredientesExcluidos(item: ItemMenuSalida): boolean {
    return item.ingredientes.some(ing => ing.es_opcional && !ing.incluido);
  }

  // Actualiza el método calcularIngredientesItem para considerar solo ingredientes incluidos
  private calcularIngredientesItem(item: ItemMenuSalida): void {
    // Calcular basado en los ingredientes incluidos del ítem
    item.ingredientesCalculados = item.ingredientes
      .filter(ing => !ing.es_opcional || ing.incluido) // Solo incluir ingredientes no opcionales o marcados como incluidos
      .map(ing => ({
        nombre: ing.nombre_producto || ing.nombre || 'Sin nombre',
        cantidadNecesaria: (ing.cantidad * item.cantidad).toFixed(2),
        unidad: ing.abreviatura_unidad || ing.unidad || 'UND',
        stockActual: 0, // TODO: Obtener stock real
        stockInsuficiente: false // TODO: Validar contra stock real
      }));
  }

  // Actualiza onItemMenuSeleccionado para resetear ingredientes cuando se deselecciona
  onItemMenuSeleccionado(item: ItemMenuSalida): void {
    if (this.accion === 'consultar') return;

    if (!item.seleccionado) {
      item.cantidad = 0;
      item.ingredientesCalculados = [];
      // Resetear todos los ingredientes a incluidos
      item.ingredientes.forEach(ing => {
        ing.incluido = true;
      });
    }

    this.actualizarEstadisticas();
  }




}