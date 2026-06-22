import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductosService } from '../../../../services/productos.service';
import { ProductosMobiliarioService } from '../../../../services/productos-mobiliario.service';
import { TiposProductosMobiliarioService } from '../../../../services/tipos-productos-mobiliario.service';
import { ProductosLimpiezaService } from '../../../../services/productos-limpieza.service';
import { TiposProductosLimpiezaService } from '../../../../services/tipos-productos-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';

interface ProductoMobiliarioModel {
    id: string;
    idProducto: string | string;
    nombreProducto?: string;
    idTipoProductoMobiliario: string | string;
    requiereLimpieza: number;
    requiereDesinfeccion: number;
    fechaAdquisicion: string;
    numeroSerie: string;
}

@Component({
    selector: 'app-crear-producto-mobiliario',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-producto-mobiliario.component.html',
    styleUrl: './crear-producto-mobiliario.component.scss'
})
export class CrearProductoMobiliarioComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de producto mobiliario";
    public regresar = '/administracion/productos-mobiliario';
    public tabActivo = 'datos-generales';

    public productosLimpiezaAsignados: any[] = [];
    public procesosLimpiezaAsignados: any[] = [];

    public listas = {
        productos: [] as any[],
        tiposProductoMobiliario: [] as any[],
        tiposProductoLimpieza: [] as any[],
        tiposProcesoLimpieza: [] as any[]
    }

    public model: ProductoMobiliarioModel = {
        id: '',
        idProducto: "",
        nombreProducto: "",
        idTipoProductoMobiliario: "",
        requiereLimpieza: 1,
        requiereDesinfeccion: 1,
        fechaAdquisicion: "",
        numeroSerie: ""
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productosMobiliarioService: ProductosMobiliarioService,
        private tiposProductosMobiliarioService: TiposProductosMobiliarioService,
        private productosService: ProductosService,
        private productosLimpiezaService: ProductosLimpiezaService,
        private tiposProductosLimpiezaService: TiposProductosLimpiezaService,
        private tiposProcesosLimpiezaService: TiposProcesosLimpiezaService
    ) { }

    ngOnInit(): void {
        this.cargarTiposProductoMobiliario();
        this.cargarTiposProcesoLimpieza();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear producto mobiliario";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar producto mobiliario";
                    this.obtenerProductoMobiliario(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar producto mobiliario";
                    this.obtenerProductoMobiliario(this.id);
                    break;
            }
        });
    }

    cargarTiposProductoMobiliario() {
        this.tiposProductosMobiliarioService.obtenerTodos().subscribe({
            next: (response: any) => {
                const tipos = response.body || [];
                this.listas.tiposProductoMobiliario = tipos.map((t: any) => ({
                    value: t.id,
                    label: t.nombre
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de mobiliario", error);
            }
        });
    }

    cargarTiposProcesoLimpieza() {
        this.tiposProcesosLimpiezaService.obtenerTodos().subscribe({
            next: (response: any) => {
                const tipos = response.body || [];
                this.listas.tiposProcesoLimpieza = tipos;
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de procesos", error);
            }
        });
    }

    obtenerProductoMobiliario(id: any) {
        if (id && id !== "0") {
            this.productosMobiliarioService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const producto = response.body[0];
                    if (producto) {
                        this.model.id = producto.id;
                        this.model.idProducto = producto.id_producto;
                        this.model.nombreProducto = producto.nombre_producto || '';
                        this.model.idTipoProductoMobiliario = producto.id_tipo_producto_mobiliario;
                        this.model.requiereLimpieza = producto.requiere_limpieza;
                        this.model.requiereDesinfeccion = producto.requiere_desinfeccion;
                        this.model.fechaAdquisicion = producto.fecha_adquisicion;
                        this.model.numeroSerie = producto.numero_serie;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar: ${producto.nombre_producto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar: ${producto.nombre_producto}`;
                        }

                        // Cargar productos de limpieza y procesos
                        this.cargarProductosLimpiezaAsignados();
                        this.cargarProcesosLimpiezaAsignados();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener producto mobiliario", error);
                    Swal.fire('Error', 'Error al cargar los datos del producto mobiliario', 'error');
                }
            });
        }
    }

    // ===== MÉTODOS PARA PRODUCTOS DE LIMPIEZA (SIMPLIFICADO) =====

    cargarProductosLimpiezaAsignados() {
        this.productosMobiliarioService.obtenerProductosLimpiezaAsignados(this.id).subscribe({
            next: (response: any) => {
                this.productosLimpiezaAsignados = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar productos de limpieza", error);
            }
        });
    }

    abrirModalAsignarProductosLimpieza() {
        this.productosMobiliarioService.obtenerProductosLimpiezaDisponibles(this.id).subscribe({
            next: (response: any) => {
                const productosDisponibles = response.body || [];

                if (productosDisponibles.length === 0) {
                    Swal.fire('Sin productos disponibles', 'No hay más productos de limpieza disponibles para asociar', 'info');
                    return;
                }

                let productosSeleccionados: Set<number> = new Set();

                Swal.fire({
                    title: 'Asociar Productos de Limpieza',
                    width: '1000px',
                    html: `
                     <style>
                        .busqueda-container {
                            margin-bottom: 20px;
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        }
                        
                        .contador-seleccion {
                            font-weight: 600;
                            color: #fff;
                            background: #28a745;
                            padding: 6px 12px;
                            border-radius: 20px;
                            font-size: 0.9rem;
                        }
                        
                        #buscar-producto-limpieza {
                            border: 2px solid #e1e8ed;
                            border-radius: 8px;
                            padding: 10px 15px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                        }
                        
                        #buscar-producto-limpieza:focus {
                            border-color: #28a745;
                            box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
                            outline: none;
                        }
                        
                        .productos-grid {
                            max-height: 450px;
                            overflow-y: auto;
                            padding: 10px;
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 15px;
                        }
                        
                        /* Scrollbar personalizado */
                        .productos-grid::-webkit-scrollbar {
                            width: 8px;
                        }
                        
                        .productos-grid::-webkit-scrollbar-track {
                            background: #f1f1f1;
                            border-radius: 4px;
                        }
                        
                        .productos-grid::-webkit-scrollbar-thumb {
                            background: #28a745;
                            border-radius: 4px;
                        }
                        
                        .productos-grid::-webkit-scrollbar-thumb:hover {
                            background: #1e7e34;
                        }
                        
                        .producto-card {
                            background: white;
                            border: 2px solid #e9ecef;
                            border-radius: 10px;
                            padding: 15px;
                            transition: all 0.3s ease;
                            cursor: pointer;
                            position: relative;
                            min-height: 120px;
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .producto-card:hover {
                            border-color: #28a745;
                            transform: translateY(-2px);
                            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.15);
                        }
                        
                        .producto-card.selected {
                            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                            border-color: #28a745;
                            box-shadow: 0 3px 10px rgba(40, 167, 69, 0.2);
                        }
                        
                        .producto-card.selected::after {
                            content: '✓';
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            background: #28a745;
                            color: white;
                            width: 25px;
                            height: 25px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            font-size: 14px;
                        }
                        
                        .producto-card input[type="checkbox"] {
                            position: absolute;
                            opacity: 0;
                            pointer-events: none;
                        }
                        
                        .producto-header {
                            margin-bottom: 8px;
                        }
                        
                        .producto-nombre {
                            font-weight: 600;
                            color: #2c3e50;
                            font-size: 1rem;
                            margin-bottom: 4px;
                            line-height: 1.3;
                        }
                        
                        .producto-card.selected .producto-nombre {
                            color: #155724;
                        }
                        
                        .producto-badges {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 5px;
                            margin-bottom: 8px;
                        }
                        
                        .badge {
                            font-size: 0.75rem;
                            padding: 3px 8px;
                            border-radius: 12px;
                            font-weight: 500;
                        }
                        
                        .badge.bg-tipo {
                            background: #6c757d;
                            color: white;
                        }
                        
                        .badge.bg-stock {
                            background: #17a2b8;
                            color: white;
                        }
                        
                        .producto-info {
                            font-size: 0.85rem;
                            color: #6c757d;
                            line-height: 1.4;
                        }
                        
                        .producto-card.selected .producto-info {
                            color: #155724;
                        }
                        
                        .modo-uso-text {
                            font-size: 0.8rem;
                            color: #495057;
                            margin-top: 8px;
                            padding-top: 8px;
                            border-top: 1px solid #e9ecef;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                        }
                        
                        .sin-productos {
                            grid-column: 1 / -1;
                            text-align: center;
                            padding: 60px 20px;
                            color: #6c757d;
                        }
                        
                        .sin-productos i {
                            margin-bottom: 15px;
                            color: #adb5bd;
                        }
                        
                        .sin-productos p {
                            font-size: 1.2rem;
                            font-weight: 500;
                            margin-bottom: 5px;
                        }
                        
                        .sin-productos small {
                            color: #95a5a6;
                        }
                        
                        /* Responsive para pantallas pequeñas */
                        @media (max-width: 768px) {
                            .productos-grid {
                                grid-template-columns: 1fr;
                            }
                        }
                        
                        .productos-seleccionados-lista {
                            margin-top: 15px;
                            padding: 10px;
                            background: #d4edda;
                            border-radius: 8px;
                            max-height: 100px;
                            overflow-y: auto;
                        }
                        
                        .chip-producto {
                            display: inline-block;
                            background: white;
                            color: #155724;
                            padding: 4px 10px;
                            border-radius: 15px;
                            margin: 3px;
                            font-size: 0.85rem;
                            border: 1px solid #28a745;
                        }
                    </style
                    <div class="busqueda-container">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <input type="text" 
                                id="buscar-producto-limpieza" 
                                class="form-control" 
                                placeholder="🔍 Buscar producto..."
                                style="max-width: 60%;">
                            <span class="contador-seleccion">
                                <span id="contador">0</span> seleccionado(s)
                            </span>
                        </div>
                        <small class="text-muted d-block mb-2">
                            Haga clic en los productos para seleccionarlos
                        </small>
                        <div id="productos-seleccionados-preview" style="display: none;">
                            <!-- Aquí se mostrarán los productos seleccionados -->
                        </div>
                    </div>

                    <div class="productos-grid" id="productos-lista-container">
                        <!-- Se llenará dinámicamente -->
                    </div>
                `,
                    showCancelButton: true,
                    confirmButtonText: 'Asociar Seleccionados',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d',
                    didOpen: () => {
                        const renderizarLista = () => {
                            const container = document.getElementById('productos-lista-container');
                            const previewContainer = document.getElementById('productos-seleccionados-preview');
                            if (!container) return;

                            const termino = (document.getElementById('buscar-producto-limpieza') as HTMLInputElement)?.value.toLowerCase() || '';

                            const productosFiltrados = productosDisponibles.filter((item: any) =>
                                item.nombre_producto.toLowerCase().includes(termino) ||
                                (item.tipo_limpieza && item.tipo_limpieza.toLowerCase().includes(termino))
                            );

                            if (productosFiltrados.length === 0) {
                                container.innerHTML = `
                                <div class="sin-productos">
                                    <i class="fas fa-search fa-3x"></i>
                                    <p>No se encontraron productos</p>
                                    <small>Intente con otro término de búsqueda</small>
                                </div>
                            `;
                                return;
                            }

                            container.innerHTML = productosFiltrados.map((item: any) => {
                                const isSelected = productosSeleccionados.has(item.id_producto_limpieza);
                                return `
                                <div class="producto-card ${isSelected ? 'selected' : ''}" 
                                     data-id="${item.id_producto_limpieza}"
                                     data-nombre="${item.nombre_producto}">
                                    <input type="checkbox" 
                                        id="producto_${item.id_producto_limpieza}" 
                                        value="${item.id_producto_limpieza}"
                                        ${isSelected ? 'checked' : ''}
                                        data-producto='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                                    
                                    <div class="producto-header">
                                        <div class="producto-nombre">${item.nombre_producto}</div>
                                    </div>
                                    
                                    <div class="producto-badges">
                                        ${item.tipo_limpieza ? `<span class="badge bg-tipo">${item.tipo_limpieza}</span>` : ''}
                                        ${item.stock_actual ? `<span class="badge bg-stock">Stock: ${item.stock_actual}</span>` : ''}
                                    </div>
                                    
                                    <div class="producto-info">
                                        ${item.concentracion ? `Concentración: ${item.concentracion}` : ''}
                                    </div>
                                    
                                    ${item.modo_uso ? `
                                        <div class="modo-uso-text">
                                            ${item.modo_uso}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                            }).join('');

                            // Actualizar preview de seleccionados
                            if (previewContainer && productosSeleccionados.size > 0) {
                                const productosSeleccionadosArray = Array.from(productosSeleccionados);
                                const nombresSeleccionados = productosSeleccionadosArray.map(id => {
                                    const producto = productosDisponibles.find((p: any) => p.id_producto_limpieza === id);
                                    return producto ? producto.nombre_producto : '';
                                }).filter(nombre => nombre);

                                previewContainer.style.display = 'block';
                                previewContainer.innerHTML = `
                                <div class="productos-seleccionados-lista">
                                    <small class="text-success fw-bold">Productos seleccionados:</small><br>
                                    ${nombresSeleccionados.map(nombre =>
                                    `<span class="chip-producto">${nombre}</span>`
                                ).join('')}
                                </div>
                            `;
                            } else if (previewContainer) {
                                previewContainer.style.display = 'none';
                            }
                        };

                        const actualizarContador = () => {
                            const contador = document.getElementById('contador');
                            if (contador) {
                                contador.textContent = productosSeleccionados.size.toString();
                            }
                        };

                        // Event listener para búsqueda
                        const inputBuscar = document.getElementById('buscar-producto-limpieza') as HTMLInputElement;
                        inputBuscar?.addEventListener('input', renderizarLista);

                        // Event delegation para cards
                        const listaContainer = document.getElementById('productos-lista-container');
                        listaContainer?.addEventListener('click', (e) => {
                            const target = e.target as HTMLElement;
                            const card = target.closest('.producto-card');

                            if (card) {
                                const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
                                const productoId = parseInt(card.getAttribute('data-id') || '0');

                                if (checkbox) {
                                    checkbox.checked = !checkbox.checked;

                                    if (checkbox.checked) {
                                        productosSeleccionados.add(productoId);
                                        card.classList.add('selected');
                                    } else {
                                        productosSeleccionados.delete(productoId);
                                        card.classList.remove('selected');
                                    }

                                    actualizarContador();
                                    renderizarLista();
                                }
                            }
                        });

                        // Renderizar inicial
                        renderizarLista();
                        actualizarContador();
                    },
                    preConfirm: () => {
                        if (productosSeleccionados.size === 0) {
                            Swal.showValidationMessage('Debe seleccionar al menos un producto');
                            return false;
                        }

                        return {
                            productos_ids: Array.from(productosSeleccionados)
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.procesarAsignacionMultipleProductosLimpieza(result.value);
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener productos disponibles", error);
                Swal.fire('Error', 'No se pudieron cargar los productos de limpieza', 'error');
            }
        });
    }

    procesarAsignacionMultipleProductosLimpieza(datos: any) {
        const asignacionData = {
            id_producto_mobiliario: this.model.id,
            productos_ids: datos.productos_ids
        };

        this.productosMobiliarioService.asignarProductosLimpieza(asignacionData).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', response.mensaje || 'Productos asociados correctamente', 'success');
                this.cargarProductosLimpiezaAsignados();
            },
            error: (error: any) => {
                console.error("Error al asignar productos", error);
                Swal.fire('Error', error.error?.error || 'No se pudieron asociar los productos', 'error');
            }
        });
    }

    eliminarAsignacionLimpieza(item: any) {
        // Primero verificar si el producto está en uso en algún proceso
        const productosEnProcesos = this.procesosLimpiezaAsignados.reduce((acc, proceso) => {
            if (proceso.productos && proceso.productos.length > 0) {
                return acc.concat(proceso.productos.map((p: any) => p.id_asignacion));
            }
            return acc;
        }, []);

        const estaEnUso = productosEnProcesos.includes(item.id);

        if (estaEnUso) {
            // Encontrar en qué procesos está siendo usado
            const procesosUsando = this.procesosLimpiezaAsignados.filter(proceso =>
                proceso.productos &&
                proceso.productos.some((p: any) => p.id_asignacion === item.id)
            );

            const nombresProcesos = procesosUsando.map(p => p.nombre_proceso).join(', ');

            Swal.fire({
                title: 'Producto en uso',
                html: `
                <div class="text-start">
                    <p>No se puede eliminar <strong>"${item.nombre_producto}"</strong> porque está siendo usado en los siguientes procesos:</p>
                    <ul class="mt-2">
                        ${procesosUsando.map(p => `<li>${p.nombre_proceso}</li>`).join('')}
                    </ul>
                    <p class="mt-3 text-muted">Para eliminar este producto, primero debe quitarlo de los procesos donde está siendo usado.</p>
                </div>
            `,
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6c757d'
            });
            return;
        }

        // Si no está en uso, proceder con la eliminación
        Swal.fire({
            title: '¿Eliminar producto?',
            text: `¿Está seguro de eliminar "${item.nombre_producto}" de los productos compatibles?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.productosMobiliarioService.eliminarAsignacionLimpieza(item.id).subscribe({
                    next: (response: any) => {
                        Swal.fire({
                            title: 'Eliminado',
                            text: 'El producto ha sido desasociado correctamente',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        this.cargarProductosLimpiezaAsignados();
                        // No es necesario recargar procesos si validamos antes
                    },
                    error: (error: any) => {
                        console.error("Error al eliminar", error);

                        // Manejo mejorado de errores
                        let mensajeError = 'No se pudo eliminar el producto';
                        let titulo = 'Error';

                        if (error.error?.tipo === 'producto_en_uso') {
                            titulo = 'Producto en uso';
                            mensajeError = error.error.error;
                            if (error.error.procesos_count) {
                                mensajeError += `. Está siendo usado en ${error.error.procesos_count} proceso(s).`;
                            }
                        } else if (error.error?.tipo === 'error_servidor') {
                            mensajeError = 'Ocurrió un error en el servidor. Por favor, intente nuevamente.';
                        }

                        Swal.fire({
                            title: titulo,
                            text: mensajeError,
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        });
                    }
                });
            }
        });
    }

    // ===== MÉTODOS PARA PROCESOS DE LIMPIEZA =====
    cargarProcesosLimpiezaAsignados() {
        this.productosMobiliarioService.obtenerProcesosLimpiezaAsignados(this.id).subscribe({
            next: (response: any) => {
                console.log('Respuesta de procesos:', response);
                this.procesosLimpiezaAsignados = response.body || [];
                console.log('Procesos asignados:', this.procesosLimpiezaAsignados);
            },
            error: (error: any) => {
                console.error("Error al cargar procesos", error);
            }
        });
    }

    abrirModalProcesoLimpieza(proceso: any = null, tiposDisponibles?: any[]) {
        const esEdicion = proceso !== null;

        // Si no es edición y no se pasaron tipos disponibles, filtrar los ya usados
        if (!esEdicion && !tiposDisponibles) {
            const tiposProcesosAsignados = this.procesosLimpiezaAsignados.map(
                p => p.id_tipo_proceso_limpieza
            );

            tiposDisponibles = this.listas.tiposProcesoLimpieza.filter(
                tipo => !tiposProcesosAsignados.includes(tipo.id)
            );

            if (tiposDisponibles.length === 0) {
                Swal.fire(
                    'Sin procesos disponibles',
                    'Ya se han asignado todos los tipos de procesos disponibles a este mobiliario',
                    'info'
                );
                return;
            }
        }
        const tiposParaMostrar = tiposDisponibles || this.listas.tiposProcesoLimpieza;
        // Primero obtener los productos disponibles para procesos
        this.productosMobiliarioService.obtenerProductosParaProceso(this.id).subscribe({
            next: (response: any) => {
                const productosDisponibles = response.body || [];

                // Preparar productos para edición o array vacío para creación
                let productosIniciales: any[] = [];
                if (esEdicion && proceso.productos) {
                    productosIniciales = proceso.productos.map((p: any) => ({
                        id: 'producto_' + (p.id_relacion || Date.now() + Math.random()),
                        id_asignacion: p.id_asignacion ? p.id_asignacion.toString() : '',
                        cantidad_sugerida: p.cantidad_sugerida || '',
                        instrucciones: p.instrucciones || ''
                    }));
                }

                // Definir las funciones en el window
                (window as any).productosSeleccionados = productosIniciales;
                (window as any).productosDisponibles = productosDisponibles;
                (window as any).productosUsados = new Set(productosIniciales.map(p => p.id_asignacion).filter(id => id));

                (window as any).agregarProducto = () => {
                    if (productosDisponibles.length === 0) {
                        Swal.showValidationMessage('No hay productos disponibles');
                        return;
                    }

                    // Verificar si quedan productos sin usar
                    const productosLibres = productosDisponibles.filter(
                        (p: any) => !(window as any).productosUsados.has(p.id_asignacion.toString())
                    );

                    if (productosLibres.length === 0) {
                        Swal.showValidationMessage('Ya se han agregado todos los productos disponibles');
                        return;
                    }

                    const productoId = 'producto_' + Date.now();
                    const nuevoProducto = {
                        id: productoId,
                        id_asignacion: '',
                        cantidad_sugerida: '',
                        instrucciones: ''
                    };

                    (window as any).productosSeleccionados.push(nuevoProducto);
                    (window as any).renderizarProductos();
                };

                (window as any).eliminarProducto = (productoId: string) => {
                    const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
                    if (producto && producto.id_asignacion) {
                        (window as any).productosUsados.delete(producto.id_asignacion.toString());
                    }
                    (window as any).productosSeleccionados = (window as any).productosSeleccionados.filter((p: any) => p.id !== productoId);
                    (window as any).renderizarProductos();
                };

                (window as any).actualizarProducto = (productoId: string, campo: string, valor: any) => {
                    const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
                    if (producto) {
                        // Si se está cambiando el producto seleccionado
                        if (campo === 'id_asignacion') {
                            // Liberar el producto anterior si había uno
                            if (producto.id_asignacion) {
                                (window as any).productosUsados.delete(producto.id_asignacion.toString());
                            }
                            // Marcar el nuevo como usado
                            if (valor) {
                                (window as any).productosUsados.add(valor.toString());
                            }
                        }
                        producto[campo] = valor;
                    }
                };

                (window as any).renderizarProductos = () => {
                    const container = document.getElementById('productos-list');
                    if (!container) return;

                    if ((window as any).productosSeleccionados.length === 0) {
                        container.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <p>No hay productos agregados</p>
                            <small>Haga clic en "Agregar Producto" para comenzar</small>
                        </div>
                    `;
                        return;
                    }

                    container.innerHTML = (window as any).productosSeleccionados.map((producto: any, index: number) => {
                        // Filtrar productos disponibles para este select (excluyendo los ya usados excepto el actual)
                        const productosParaEsteSelect = productosDisponibles.filter((p: any) =>
                            !((window as any).productosUsados.has(p.id_asignacion.toString())) ||
                            p.id_asignacion.toString() === producto.id_asignacion
                        );
                        // Obtener la unidad del producto seleccionado
                        const productoSeleccionado = productosParaEsteSelect.find((p: any) =>
                            p.id_asignacion.toString() === producto.id_asignacion
                        );
                        const unidadProducto = productoSeleccionado?.unidad_medida || '';
                        return `
                        <div class="producto-card">
                            <div class="producto-number">${index + 1}</div>
                            
                            <div class="producto-content">
                                <div class="producto-row">
                                    <div class="producto-select-wrapper">
                                        <label><i class="fas fa-spray-can"></i> Producto</label>
                                        <select class="form-select" id="select_${producto.id}" 
                                            onchange="actualizarProductoConModoUso('${producto.id}', this.value)"
                                            ${productosParaEsteSelect.length === 0 ? 'disabled' : ''}>
                                            <option value="">Seleccione un producto...</option>
                                            ${productosParaEsteSelect.map((prod: any) =>
                                `<option value="${prod.id_asignacion}" 
                                                        data-modo-uso="${prod.modo_uso || ''}"
                                                        data-unidad="${prod.unidad_medida || ''}"
                                                        ${producto.id_asignacion == prod.id_asignacion ? 'selected' : ''}>
                                                        ${prod.nombre_producto} ${prod.concentracion ? '(' + prod.concentracion + ')' : ''}
                                                    </option>`
                                    ).join('')}
                                        </select>
                                        ${productosParaEsteSelect.length === 0 && !producto.id_asignacion ?
                                    '<small class="text-danger">No hay más productos disponibles</small>' : ''}
                                    </div>
                                    
                                    <div class="producto-cantidad-wrapper">
                                        <label>
                                            <i class="fas fa-weight"></i> 
                                            Cantidad ${unidadProducto ? `(${unidadProducto})` : ''}
                                        </label>
                                        <input type="number" class="form-control" 
                                            id="cantidad_${producto.id}"
                                            value="${producto.cantidad_sugerida || ''}"
                                            placeholder="0.00" step="0.01" min="0"
                                            onchange="actualizarProducto('${producto.id}', 'cantidad_sugerida', this.value)">
                                    </div>
                                </div>
                                
                                <div class="producto-instrucciones-wrapper">
                                    <label>
                                        <i class="fas fa-clipboard-list"></i> 
                                        Instrucciones específicas
                                        <small style="color: #95a5a6; font-weight: normal; margin-left: 10px;">
                                            (Se pre-llenó con el modo de uso del producto)
                                        </small>
                                    </label>
                                    <textarea class="form-control" 
                                        id="instrucciones_${producto.id}"
                                        placeholder="Describa cómo usar este producto en el proceso..." 
                                        rows="3"
                                        onchange="actualizarProducto('${producto.id}', 'instrucciones', this.value)">${producto.instrucciones || ''}</textarea>
                                </div>
                            </div>
                            
                            <button type="button" class="btn-delete" onclick="eliminarProducto('${producto.id}')" title="Eliminar producto">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                    }).join('');

                    // Actualizar el contador de productos disponibles
                    const productosLibres = productosDisponibles.filter(
                        (p: any) => !(window as any).productosUsados.has(p.id_asignacion.toString())
                    );

                    const btnAgregar = document.querySelector('.btn-add-product');
                    if (btnAgregar) {
                        if (productosLibres.length === 0) {
                            btnAgregar.setAttribute('disabled', 'true');
                            btnAgregar.innerHTML = '<i class="fas fa-plus-circle"></i> <span>Sin productos disponibles</span>';
                        } else {
                            btnAgregar.removeAttribute('disabled');
                            btnAgregar.innerHTML = `<i class="fas fa-plus-circle"></i> <span>Agregar Producto (${productosLibres.length} disponibles)</span>`;
                        }
                    }
                };

                // Nueva función para actualizar producto y pre-llenar instrucciones con modo_uso
                (window as any).actualizarProductoConModoUso = (productoId: string, idAsignacion: string) => {
                    const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
                    if (producto) {
                        // Actualizar el tracking de productos usados
                        if (producto.id_asignacion) {
                            (window as any).productosUsados.delete(producto.id_asignacion.toString());
                        }
                        if (idAsignacion) {
                            (window as any).productosUsados.add(idAsignacion.toString());
                        }

                        producto.id_asignacion = idAsignacion;

                        // Si se selecciona un producto, pre-llenar instrucciones con modo_uso
                        if (idAsignacion) {
                            const selectElement = document.getElementById('select_' + productoId) as HTMLSelectElement;
                            const selectedOption = selectElement.options[selectElement.selectedIndex];
                            const modoUso = selectedOption.dataset['modoUso'];

                            const textareaElement = document.getElementById('instrucciones_' + productoId) as HTMLTextAreaElement;

                            // Solo pre-llenar si el campo está vacío o tiene el modo de uso anterior
                            if (modoUso && (!textareaElement.value || textareaElement.value === producto.modo_uso_anterior)) {
                                textareaElement.value = modoUso;
                                producto.instrucciones = modoUso;
                                producto.modo_uso_anterior = modoUso;
                            }
                        }

                        // Re-renderizar para actualizar los selects
                        (window as any).renderizarProductos();
                    }
                };

                Swal.fire({
                    title: esEdicion ? 'Editar Proceso de Limpieza' : 'Configurar Proceso de Limpieza',
                    width: '1100px',
                    html: `
                    <style>
                        .swal2-html-container {
                            overflow: visible !important;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        }
                        
                        /* Estilos generales del formulario */
                        .form-section {
                            margin-bottom: 25px;
                        }
                        
                        .form-section-title {
                            font-size: 0.85rem;
                            font-weight: 600;
                            color: #2c3e50;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 15px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }
                        
                        .form-section-title i {
                            color: #ffbd31;
                        }
                        
                        /* Select principal del tipo de proceso */
                        .proceso-select {
                            width: 100%;
                            padding: 12px 15px;
                            border: 2px solid #e1e8ed;
                            border-radius: 8px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background-color: #fff;
                            color: #2c3e50;
                        }
                        
                        .proceso-select:focus {
                            outline: none;
                            border-color: #ffbd31;
                            box-shadow: 0 0 0 3px rgba(255,189,49,0.1);
                        }
                        
                        /* Info box para edición */
                        .info-box {
                            background-color: #f8f9fa;
                            border-left: 4px solid #ffbd31;
                            padding: 12px 16px;
                            margin-bottom: 20px;
                            border-radius: 6px;
                            color: #2c3e50;
                        }
                        
                        .info-box strong {
                            color: #2c3e50;
                        }
                        
                        /* Contenedor de productos */
                        .productos-container {
                            background: #f8f9fa;
                            border-radius: 12px;
                            padding: 20px;
                            min-height: 200px;
                        }
                        
                        .productos-list {
                            display: flex;
                            flex-direction: column;
                            gap: 15px;
                            margin-bottom: 15px;
                            max-height: 400px;
                            overflow-y: auto;
                            padding-right: 5px;
                        }
                        
                        /* Scrollbar personalizado */
                        .productos-list::-webkit-scrollbar {
                            width: 6px;
                        }
                        
                        .productos-list::-webkit-scrollbar-track {
                            background: #e9ecef;
                            border-radius: 3px;
                        }
                        
                        .productos-list::-webkit-scrollbar-thumb {
                            background: #95a5a6;
                            border-radius: 3px;
                        }
                        
                        .productos-list::-webkit-scrollbar-thumb:hover {
                            background: #7f8c8d;
                        }
                        
                        /* Card de producto individual */
                        .producto-card {
                            background: white;
                            border-radius: 10px;
                            padding: 20px;
                            position: relative;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                            transition: all 0.3s ease;
                            border: 2px solid transparent;
                        }
                        
                        .producto-card:hover {
                            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                            border-color: #ffbd31;
                            border-width: 1px;
                        }
                        
                        .producto-number {
                            position: absolute;
                            top: 15px;
                            left: 15px;
                            width: 28px;
                            height: 28px;
                            background: #2c3e50;
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 600;
                            font-size: 0.9rem;
                        }
                        
                        .producto-content {
                            margin-left: 35px;
                        }
                        
                        .producto-row {
                            display: grid;
                            grid-template-columns: 2fr 1fr;
                            gap: 15px;
                            margin-bottom: 15px;
                        }
                        
                        .producto-select-wrapper,
                        .producto-cantidad-wrapper,
                        .producto-instrucciones-wrapper {
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .producto-select-wrapper label,
                        .producto-cantidad-wrapper label,
                        .producto-instrucciones-wrapper label {
                            font-size: 0.85rem;
                            font-weight: 500;
                            color: #2c3e50;
                            margin-bottom: 6px;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        }
                        
                        .producto-select-wrapper label i,
                        .producto-cantidad-wrapper label i,
                        .producto-instrucciones-wrapper label i {
                            font-size: 0.9rem;
                            color: #95a5a6;
                        }
                        
                        .form-select,
                        .form-control {
                            padding: 8px 12px;
                            border: 1px solid #dee2e6;
                            border-radius: 6px;
                            font-size: 0.95rem;
                            transition: all 0.2s ease;
                            color: #2c3e50;
                        }
                        
                        .form-select:focus,
                        .form-control:focus {
                            outline: none;
                            border-color: #ffbd31;
                            box-shadow: 0 0 0 2px rgba(255,189,49,0.1);
                        }
                        
                        textarea.form-control {
                            resize: vertical;
                            min-height: 60px;
                        }
                        
                        /* Botón eliminar */
                        .btn-delete {
                            position: absolute;
                            top: 15px;
                            right: 15px;
                            width: 32px;
                            height: 32px;
                            border: none;
                            background: #fff;
                            color: #e74c3c;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.3s ease;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        
                        .btn-delete:hover {
                            background: #e74c3c;
                            color: white;
                            transform: rotate(90deg);
                        }
                        
                        /* Botón agregar producto */
                        .btn-add-product {
                            background: #2c3e50;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 12px 24px;
                            cursor: pointer;
                            font-weight: 500;
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            transition: all 0.3s ease;
                            position: relative;
                            overflow: hidden;
                        }
                        
                        .btn-add-product:before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: -100%;
                            width: 100%;
                            height: 100%;
                            background: #ffbd31;
                            transition: left 0.3s ease;
                            z-index: 0;
                        }
                        
                        .btn-add-product:hover:before {
                            left: 0;
                        }
                        
                        .btn-add-product i,
                        .btn-add-product span {
                            position: relative;
                            z-index: 1;
                        }
                        
                        .btn-add-product:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        }
                        
                        /* Estado vacío */
                        .empty-state {
                            text-align: center;
                            padding: 40px;
                            color: #95a5a6;
                        }
                        
                        .empty-state i {
                            font-size: 3rem;
                            margin-bottom: 15px;
                            color: #bdc3c7;
                        }
                        
                        .empty-state p {
                            font-size: 1.1rem;
                            margin: 10px 0 5px;
                            color: #7f8c8d;
                        }
                        
                        .empty-state small {
                            font-size: 0.9rem;
                            color: #95a5a6;
                        }
                        
                        /* Nota informativa */
                        .info-note {
                            background: #f8f9fa;
                            border-left: 4px solid #ffbd31;
                            padding: 12px 16px;
                            border-radius: 6px;
                            font-size: 0.9rem;
                            color: #2c3e50;
                            margin-top: 20px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        
                        .info-note i {
                            color: #ffbd31;
                            font-size: 1.1rem;
                        }
                        
                        @media (max-width: 768px) {
                            .producto-row {
                                grid-template-columns: 1fr;
                            }
                        }
                    </style>
                    ${esEdicion ? `
                        <div class="info-box">
                            <strong>Proceso:</strong> ${proceso.nombre_proceso}<br>
                            ${proceso.descripcion_proceso ? `<small>${proceso.descripcion_proceso}</small>` : ''}
                        </div>
                    ` : `
                        <div class="form-section">
                            <div class="form-section-title">
                                <i class="fas fa-tasks"></i>
                                TIPO DE PROCESO
                            </div>
                            <select id="tipo_proceso" class="proceso-select">
                                <option value="">Seleccione un tipo de proceso...</option>
                                ${tiposParaMostrar.map((tipo: any) =>
                        `<option value="${tipo.id}">${tipo.nombre}${tipo.descripcion ? ' - ' + tipo.descripcion : ''}</option>`
                    ).join('')}
                            </select>
                            ${tiposParaMostrar.length < this.listas.tiposProcesoLimpieza.length ?
                            `<small class="text-info mt-2 d-block">
                                    <i class="fas fa-info-circle"></i> 
                                    Solo se muestran los tipos de proceso que aún no han sido asignados
                                </small>` : ''}
                        </div>
                    `}

                    <div class="form-section">
                        <div class="form-section-title">
                            <i class="fas fa-spray-can"></i>
                            PRODUCTOS DE LIMPIEZA
                        </div>
                        <div class="productos-container">
                            <div class="productos-list" id="productos-list">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            <button type="button" class="btn-add-product" onclick="agregarProducto()">
                                <i class="fas fa-plus-circle"></i> 
                                <span>Agregar Producto</span>
                            </button>
                        </div>
                    </div>

                    <div class="info-note">
                        <i class="fas fa-info-circle"></i>
                        <span>Puede agregar múltiples productos al proceso. Cada producto puede tener sus propias instrucciones y cantidad específica.</span>
                    </div>
                `,
                    showCancelButton: true,
                    confirmButtonText: esEdicion ? 'Guardar Cambios' : 'Crear Proceso',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d',
                    didRender: () => {
                        (window as any).renderizarProductos();
                    },
                    preConfirm: () => {
                        const productos = (window as any).productosSeleccionados;

                        if (!esEdicion) {
                            const tipo_proceso = (document.getElementById('tipo_proceso') as HTMLSelectElement).value;
                            if (!tipo_proceso) {
                                Swal.showValidationMessage('Debe seleccionar un tipo de proceso');
                                return false;
                            }
                        }

                        const productosValidos = productos.filter((p: any) => p.id_asignacion);

                        const datos: any = {
                            productos: productosValidos.map((p: any) => ({
                                id_asignacion: p.id_asignacion,
                                cantidad_sugerida: p.cantidad_sugerida || null,
                                instrucciones: p.instrucciones || null
                            }))
                        };

                        if (esEdicion) {
                            datos.id = proceso.id;
                        } else {
                            const tipo_proceso = (document.getElementById('tipo_proceso') as HTMLSelectElement).value;
                            datos.id_tipo_proceso_limpieza = parseInt(tipo_proceso);
                        }

                        return datos;
                    },
                    willClose: () => {
                        // Limpiar todas las variables del window
                        delete (window as any).productosSeleccionados;
                        delete (window as any).productosDisponibles;
                        delete (window as any).productosUsados;
                        delete (window as any).agregarProducto;
                        delete (window as any).eliminarProducto;
                        delete (window as any).actualizarProducto;
                        delete (window as any).actualizarProductoConModoUso;
                        delete (window as any).renderizarProductos;
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (esEdicion) {
                            this.actualizarProcesoLimpieza(result.value);
                        } else {
                            this.procesarAsignacionProcesoLimpieza(result.value);
                        }
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener productos para proceso", error);
                Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
            }
        });
    }

    // Métodos simplificados:
    abrirModalAsignarProcesoLimpieza() {
        // Obtener los tipos de proceso ya asignados
        const tiposProcesosAsignados = this.procesosLimpiezaAsignados.map(
            p => p.id_tipo_proceso_limpieza
        );

        // Filtrar los tipos disponibles
        const tiposDisponibles = this.listas.tiposProcesoLimpieza.filter(
            tipo => !tiposProcesosAsignados.includes(tipo.id)
        );

        if (tiposDisponibles.length === 0) {
            Swal.fire(
                'Sin procesos disponibles',
                'Ya se han asignado todos los tipos de procesos disponibles a este mobiliario',
                'info'
            );
            return;
        }

        // Llamar al modal con los tipos filtrados
        this.abrirModalProcesoLimpieza(null, tiposDisponibles);
    }

    editarProcesoLimpieza(proceso: any) {
        this.abrirModalProcesoLimpieza(proceso);
    }


    procesarAsignacionProcesoLimpieza(datos: any) {
        const procesoData = {
            id_producto_mobiliario: this.model.id,
            ...datos
        };

        this.productosMobiliarioService.asignarProcesoLimpieza(procesoData).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Proceso de limpieza configurado correctamente', 'success');
                this.cargarProcesosLimpiezaAsignados();
            },
            error: (error: any) => {
                console.error("Error al asignar proceso", error);
                Swal.fire('Error', error.error?.error || 'No se pudo configurar el proceso', 'error');
            }
        });
    }


    actualizarProcesoLimpieza(datos: any) {
        this.productosMobiliarioService.actualizarProcesoLimpieza(datos).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Proceso actualizado correctamente', 'success');
                this.cargarProcesosLimpiezaAsignados();
            },
            error: (error: any) => {
                console.error("Error al actualizar", error);
                Swal.fire('Error', 'No se pudo actualizar el proceso', 'error');
            }
        });
    }

    eliminarProcesoLimpieza(proceso: any) {
        Swal.fire({
            title: '¿Eliminar proceso?',
            text: `¿Está seguro de eliminar el proceso "${proceso.nombre_proceso}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.productosMobiliarioService.eliminarProcesoLimpieza(proceso.id).subscribe({
                    next: (response: any) => {
                        Swal.fire('Eliminado', 'El proceso ha sido eliminado', 'success');
                        this.cargarProcesosLimpiezaAsignados();
                    },
                    error: (error: any) => {
                        console.error("Error al eliminar", error);
                        Swal.fire('Error', 'No se pudo eliminar el proceso', 'error');
                    }
                });
            }
        });
    }

    // Métodos auxiliares
    truncarTexto(texto: string, longitud: number): string {
        if (!texto) return '-';
        if (texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    }

    contarProcesosConProducto(): number {
        return this.procesosLimpiezaAsignados.filter(p => p.id_producto_limpieza).length;
    }

    contarProductosDiferentes(): number {
        const productos = new Set(this.procesosLimpiezaAsignados
            .filter(p => p.id_producto_limpieza)
            .map(p => p.id_producto_limpieza));
        return productos.size;
    }

  
    abrirModalBuscarProducto() {
        this.productosMobiliarioService.obtenerDisponiblesParaMobiliario().subscribe({
            next: (response: any) => {
                const productos = response.body || [];
                let productoSeleccionado: any = null;

                Swal.fire({
                    title: 'Seleccionar Producto',
                    html: `
                    <style>
                        .producto-item {
                            transition: all 0.2s;
                            cursor: pointer;
                            border-left: 3px solid transparent;
                        }
                        .producto-item:hover {
                            background-color: #f8f9fa;
                            border-left-color: #007bff;
                        }
                        .producto-item.active {
                            background-color: #e3f2fd;
                            border-left-color: #2196f3;
                        }
                        .busqueda-container {
                            position: sticky;
                            top: 0;
                            background: white;
                            padding-bottom: 10px;
                            z-index: 10;
                        }
                        .lista-container {
                            max-height: 400px;
                            overflow-y: auto;
                            border: 1px solid #dee2e6;
                            border-radius: 0.25rem;
                        }
                        .producto-info {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 12px;
                        }
                        .producto-nombre {
                            font-weight: 600;
                            color: #212529;
                            margin-bottom: 4px;
                        }
                        .producto-detalles {
                            font-size: 0.875rem;
                            color: #6c757d;
                        }
                        .badge-stock {
                            background-color: #28a745;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 0.75rem;
                        }
                        .sin-productos {
                            padding: 40px;
                            text-align: center;
                            color: #6c757d;
                        }
                    </style>
                    
                    <div class="busqueda-container">
                        <input type="text" 
                            id="buscar-producto" 
                            class="form-control" 
                            placeholder="Buscar producto por nombre..." 
                            autocomplete="off">
                        <small class="text-muted mt-2 d-block">
                            ${productos.length} producto(s) disponible(s) para registrar
                        </small>
                    </div>
                    
                    <div class="lista-container mt-3">
                        <div id="lista-productos">
                            ${productos.length > 0 ? productos.map((p: any) => `
                                <div class="producto-item" 
                                    data-id="${p.id}" 
                                    data-nombre="${p.nombre}">
                                    <div class="producto-info">
                                        <div>
                                            <div class="producto-nombre">${p.nombre}</div>
                                            <div class="producto-detalles">
                                                Precio: ${this.formatearPrecio(p.precio_unitario)}
                                                ${p.abreviatura_unidad ? ` • Unidad: ${p.abreviatura_unidad}` : ''}
                                            </div>
                                        </div>
                                        <div>
                                            <span class="badge-stock">
                                                Stock: ${p.stock_actual || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="sin-productos">
                                    <i class="fas fa-box-open fa-3x mb-3" style="color: #dee2e6;"></i>
                                    <p class="mb-0">No hay productos disponibles para registrar como mobiliario</p>
                                    <small>Todos los productos ya han sido registrados</small>
                                </div>
                            `}
                        </div>
                    </div>
                `,
                    showCancelButton: true,
                    confirmButtonText: 'Seleccionar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                    width: '650px',
                    didOpen: () => {
                        if (productos.length === 0) return;

                        const inputBuscar = document.getElementById('buscar-producto') as HTMLInputElement;
                        const listaContainer = document.querySelector('.lista-container') as HTMLElement;

                        inputBuscar.focus();

                        const filtrarProductos = () => {
                            const termino = inputBuscar.value.toLowerCase();
                            const productosFiltrados = productos.filter((p: any) =>
                                p.nombre.toLowerCase().includes(termino)
                            );

                            const listaProductos = document.getElementById('lista-productos');
                            if (listaProductos) {
                                listaProductos.innerHTML = productosFiltrados.length > 0 ?
                                    productosFiltrados.map((p: any) => `
                                    <div class="producto-item" 
                                        data-id="${p.id}" 
                                        data-nombre="${p.nombre}">
                                        <div class="producto-info">
                                            <div>
                                                <div class="producto-nombre">${p.nombre}</div>
                                                <div class="producto-detalles">
                                                    Precio: ${this.formatearPrecio(p.precio_unitario)}
                                                    ${p.abreviatura_unidad ? ` • Unidad: ${p.abreviatura_unidad}` : ''}
                                                </div>
                                            </div>
                                            <div>
                                                <span class="badge-stock">
                                                    Stock: ${p.stock_actual || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="sin-productos">
                                        <i class="fas fa-search fa-2x mb-2" style="color: #dee2e6;"></i>
                                        <p class="mb-0">No se encontraron productos</p>
                                        <small>Intenta con otro término de búsqueda</small>
                                    </div>
                                `;
                                agregarEventListeners();
                            }
                        };

                        const agregarEventListeners = () => {
                            const items = document.querySelectorAll('.producto-item');
                            items.forEach(item => {
                                item.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    items.forEach(i => i.classList.remove('active'));
                                    item.classList.add('active');

                                    const elemento = e.currentTarget as HTMLElement;
                                    productoSeleccionado = {
                                        id: elemento.dataset['id'],
                                        nombre: elemento.dataset['nombre']
                                    };
                                });
                            });
                        };

                        inputBuscar.addEventListener('input', filtrarProductos);
                        agregarEventListeners();
                    },
                    preConfirm: () => {
                        if (!productoSeleccionado) {
                            Swal.showValidationMessage('Por favor selecciona un producto');
                            return false;
                        }
                        return productoSeleccionado;
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.model.idProducto = result.value.id;
                        this.model.nombreProducto = result.value.nombre;
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener productos", error);
                Swal.fire('Error', 'No se pudieron cargar los productos disponibles', 'error');
            }
        });
    }

    // Métodos guardar y preparar datos existentes...
    guardarProductoMobiliario() {
        this.submitted = true;

        if (this.accion === 'crear' || this.tabActivo === 'datos-generales') {
            if (!this.formularioValido()) {
                this.tabActivo = 'datos-generales';

                Swal.fire({
                    title: 'Campos incompletos',
                    text: 'Por favor complete todos los campos obligatorios',
                    icon: 'warning'
                });
                return;
            }
        }

        const productoData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.productosMobiliarioService.crear(productoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Producto mobiliario creado correctamente', 'success')
                        .then(() => {
                            if (response.id) {
                                this.router.navigate(['/administracion/productos-mobiliario/editar', response.id]);
                            } else {
                                this.volver();
                            }
                        });
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el producto mobiliario', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.productosMobiliarioService.actualizar(productoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Producto mobiliario actualizado correctamente', 'success');
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el producto mobiliario', 'error');
                }
            });
        }
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            id_producto: this.model.idProducto,
            id_tipo_producto_mobiliario: this.model.idTipoProductoMobiliario,
            requiere_limpieza: this.model.requiereLimpieza ? 1 : 0,
            requiere_desinfeccion: this.model.requiereDesinfeccion ? 1 : 0,
            fecha_adquisicion: this.model.fechaAdquisicion,
            numero_serie: this.model.numeroSerie
        };
    }

    formularioValido(): boolean {
        return Boolean(
            this.model.idProducto &&
            this.model.idTipoProductoMobiliario &&
            this.model.numeroSerie
        );
    }

    formatearPrecio(precio: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(precio);
    }

    volver(): void {
        this.router.navigate(['/administracion/productos-mobiliario']);
    }
    // Agregar este método auxiliar en el componente
    contarTotalProductosEnProcesos(): number {
        return this.procesosLimpiezaAsignados.reduce((total, proceso) => {
            return total + (proceso.productos ? proceso.productos.length : 0);
        }, 0);
    }
    productoEstaEnProcesos(idAsignacion: string): boolean {
        return this.procesosLimpiezaAsignados.some(proceso =>
            proceso.productos &&
            proceso.productos.some((p: any) => p.id_asignacion === idAsignacion)
        );
    }
}