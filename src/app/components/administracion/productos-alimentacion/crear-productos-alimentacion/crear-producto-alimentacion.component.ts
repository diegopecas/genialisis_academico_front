import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductosService } from '../../../../services/productos.service';
import { ProductosAlimentacionService } from '../../../../services/productos-alimentacion.service';
import { TiposProductosAlimentacionService } from '../../../../services/tipos-productos-alimentacion.service';
import { ClasificacionProductosAlimentacionService } from '../../../../services/clasificacion-productos-alimentacion.service';

interface ProductoAlimentacionModel {
    id: number;
    idProducto: number | string;
    nombreProducto?: string;
    idTipoProductoAlimentacion: number | string;
    diasVidaUtil: number;
}

interface Clasificacion {
    id: number;
    nombre: string;
    selected?: boolean;
}

@Component({
    selector: 'app-crear-producto-alimentacion',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-producto-alimentacion.component.html',
    styleUrl: './crear-producto-alimentacion.component.scss'
})
export class CrearProductoAlimentacionComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de producto de alimentación";
    public regresar = '/administracion/productos-alimentacion';

    public listas = {
        productos: [] as any[],
        tiposProductoAlimentacion: [] as any[],
        clasificaciones: [] as Clasificacion[]
    }

    public model: ProductoAlimentacionModel = {
        id: 0,
        idProducto: "",
        nombreProducto: "",
        idTipoProductoAlimentacion: "",
        diasVidaUtil: 0
    };

    public clasificacionesSeleccionadas: Clasificacion[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productosAlimentacionService: ProductosAlimentacionService,
        private tiposProductosAlimentacionService: TiposProductosAlimentacionService,
        private clasificacionProductosAlimentacionService: ClasificacionProductosAlimentacionService,
        private productosService: ProductosService
    ) { }

    ngOnInit(): void {
        this.cargarTiposProductoAlimentacion();
        this.cargarClasificaciones();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear producto de alimentación";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar producto de alimentación";
                    this.obtenerProductoAlimentacion(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar producto de alimentación";
                    this.obtenerProductoAlimentacion(this.id);
                    break;
            }
        });
    }

    cargarTiposProductoAlimentacion() {
        this.tiposProductosAlimentacionService.obtenerTodos().subscribe({
            next: (response: any) => {
                const tipos = response.body || [];
                this.listas.tiposProductoAlimentacion = tipos.map((t: any) => ({
                    value: t.id,
                    label: t.nombre
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de producto de alimentación", error);
            }
        });
    }

    cargarClasificaciones() {
        this.clasificacionProductosAlimentacionService.obtenerTodos().subscribe({
            next: (response: any) => {
                const clasificaciones = response.body || [];
                this.listas.clasificaciones = clasificaciones.map((c: any) => ({
                    id: c.id,
                    nombre: c.nombre,
                    selected: false
                }));
                
                // Si estamos editando, cargar las clasificaciones del producto
                if (this.accion === 'editar' || this.accion === 'consultar') {
                    this.cargarClasificacionesDelProducto();
                }
            },
            error: (error: any) => {
                console.error("Error al cargar clasificaciones", error);
                this.listas.clasificaciones = [];
            }
        });
    }

    cargarClasificacionesDelProducto() {
        if (this.id && this.id !== "0") {
            this.productosAlimentacionService.obtenerClasificacionesPorProducto(this.id).subscribe({
                next: (response: any) => {
                    const clasificacionesAsignadas = response.body || [];
                    
                    // Marcar las clasificaciones que están asignadas
                    this.listas.clasificaciones.forEach(c => {
                        const asignada = clasificacionesAsignadas.find((ca: any) => ca.id === c.id);
                        c.selected = asignada && asignada.asignada === 1;
                    });
                    
                    // Actualizar la lista de seleccionadas
                    this.actualizarClasificacionesSeleccionadas();
                },
                error: (error: any) => {
                    console.error("Error al cargar clasificaciones del producto", error);
                }
            });
        }
    }

    onClasificacionChange(clasificacion: Clasificacion) {
        this.actualizarClasificacionesSeleccionadas();
    }

    removerClasificacion(clasificacion: Clasificacion) {
        const clasificacionEnLista = this.listas.clasificaciones.find(c => c.id === clasificacion.id);
        if (clasificacionEnLista) {
            clasificacionEnLista.selected = false;
        }
        this.actualizarClasificacionesSeleccionadas();
    }

    actualizarClasificacionesSeleccionadas() {
        this.clasificacionesSeleccionadas = this.listas.clasificaciones.filter(c => c.selected);
    }

    abrirModalBuscarProducto() {
        this.productosAlimentacionService.obtenerDisponiblesParaAlimentacion().subscribe({
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
                                    <p class="mb-0">No hay productos disponibles para registrar como productos de alimentación</p>
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

    formatearPrecio(precio: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(precio);
    }

    obtenerProductoAlimentacion(id: any) {
        if (id && id !== "0") {
            this.productosAlimentacionService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const producto = response.body[0];
                    if (producto) {
                        this.model.id = producto.id;
                        this.model.idProducto = producto.id_producto;
                        this.model.nombreProducto = producto.nombre_producto || '';
                        this.model.idTipoProductoAlimentacion = producto.id_tipo_producto_alimentacion;
                        this.model.diasVidaUtil = producto.dias_vida_util || 0;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar producto: ${producto.nombre_producto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar producto: ${producto.nombre_producto}`;
                        }

                        // Cargar clasificaciones después de obtener el producto
                        this.cargarClasificacionesDelProducto();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener producto de alimentación", error);
                    Swal.fire('Error', 'Error al cargar los datos del producto de alimentación', 'error');
                }
            });
        }
    }

    guardarProductoAlimentacion() {
        this.submitted = true;

        if (!this.formularioValido()) {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor complete todos los campos obligatorios',
                icon: 'warning'
            });
            return;
        }

        const productoData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.productosAlimentacionService.crear(productoData).subscribe({
                next: (response: any) => {
                    const idCreado = response.id;
                    
                    // Guardar las clasificaciones si hay alguna seleccionada
                    if (this.clasificacionesSeleccionadas.length > 0) {
                        this.guardarClasificaciones(idCreado);
                    } else {
                        Swal.fire('Éxito', 'Producto de alimentación creado correctamente', 'success')
                            .then(() => this.volver());
                    }
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el producto de alimentación', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.productosAlimentacionService.actualizar(productoData).subscribe({
                next: (response: any) => {
                    // Guardar las clasificaciones
                    this.guardarClasificaciones(this.model.id);
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el producto de alimentación', 'error');
                }
            });
        }
    }

    guardarClasificaciones(idProductoAlimentacion: number) {
        const idsClasificaciones = this.clasificacionesSeleccionadas.map(c => c.id);
        
        this.productosAlimentacionService.asignarClasificaciones(idProductoAlimentacion, idsClasificaciones).subscribe({
            next: (response: any) => {
                const mensaje = this.accion === 'crear' ? 
                    'Producto de alimentación creado correctamente' : 
                    'Producto de alimentación actualizado correctamente';
                    
                Swal.fire('Éxito', mensaje, 'success')
                    .then(() => this.volver());
            },
            error: (error: any) => {
                console.error("Error al guardar clasificaciones", error);
                const mensaje = this.accion === 'crear' ? 
                    'El producto se creó pero hubo un error al guardar las clasificaciones' : 
                    'El producto se actualizó pero hubo un error al guardar las clasificaciones';
                    
                Swal.fire('Advertencia', mensaje, 'warning')
                    .then(() => this.volver());
            }
        });
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            id_producto: this.model.idProducto,
            id_tipo_producto_alimentacion: this.model.idTipoProductoAlimentacion,
            dias_vida_util: this.model.diasVidaUtil || 0
        };
    }

    formularioValido(): boolean {
        return Boolean(
            this.model.idProducto &&
            this.model.idTipoProductoAlimentacion
        );
    }

    volver(): void {
        this.router.navigate(['/administracion/productos-alimentacion']);
    }
}