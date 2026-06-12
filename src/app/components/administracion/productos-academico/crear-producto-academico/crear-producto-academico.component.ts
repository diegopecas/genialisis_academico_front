import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductosAcademicoService } from '../../../../services/productos-academico.service';
import { TiposProductoAcademicoService } from '../../../../services/tipos-producto-academico.service';
import { GradosService } from '../../../../services/grados.service';

interface ProductoAcademicoModel {
    id: number;
    idProducto: number | string;
    nombreProducto?: string;
    idTipoProductoAcademico: number | string;
    esConsumible: boolean;
    vidaUtilEstimadaDias: number | null;
    edadMinimaMeses: number | null;
    edadMaximaMeses: number | null;
}

interface Grado {
    id: number;
    nombre: string;
    descripcion: string;
    orden: number;
    selected?: boolean;
}

@Component({
    selector: 'app-crear-producto-academico',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-producto-academico.component.html',
    styleUrl: './crear-producto-academico.component.scss'
})
export class CrearProductoAcademicoComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de producto académico";
    public regresar = '/administracion/productos-academico';

    public listas = {
        tiposProductoAcademico: [] as any[],
        grados: [] as Grado[]
    }

    public model: ProductoAcademicoModel = {
        id: 0,
        idProducto: "",
        nombreProducto: "",
        idTipoProductoAcademico: "",
        esConsumible: false,
        vidaUtilEstimadaDias: null,
        edadMinimaMeses: null,
        edadMaximaMeses: null
    };

    public gradosSeleccionados: Grado[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productosAcademicoService: ProductosAcademicoService,
        private tiposProductoAcademicoService: TiposProductoAcademicoService,
        private gradosService: GradosService
    ) { }

    ngOnInit(): void {
        this.cargarTiposProductoAcademico();
        this.cargarGrados();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear producto académico";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar producto académico";
                    this.obtenerProductoAcademico(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar producto académico";
                    this.obtenerProductoAcademico(this.id);
                    break;
            }
        });
    }

    cargarTiposProductoAcademico() {
        this.tiposProductoAcademicoService.obtenerTodos().subscribe({
            next: (response: any) => {
                const tipos = response.body || [];
                this.listas.tiposProductoAcademico = tipos.map((t: any) => ({
                    value: t.id,
                    label: t.nombre
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de producto académico", error);
            }
        });
    }

    cargarGrados() {
        this.gradosService.obtenerTodos().subscribe({
            next: (response: any) => {
                const grados = response.body || [];
                this.listas.grados = grados.map((g: any) => ({
                    id: g.id,
                    nombre: g.nombre,
                    descripcion: g.descripcion || '',
                    orden: g.orden,
                    selected: false
                }));

                if (this.accion === 'editar' || this.accion === 'consultar') {
                    this.cargarGradosDelProducto();
                }
            },
            error: (error: any) => {
                console.error("Error al cargar grados", error);
                this.listas.grados = [];
            }
        });
    }

    cargarGradosDelProducto() {
        if (this.id && this.id !== "0") {
            this.productosAcademicoService.obtenerGradosPorProducto(this.id).subscribe({
                next: (response: any) => {
                    const gradosAsignados = response.body || [];

                    this.listas.grados.forEach(g => {
                        const asignado = gradosAsignados.find((ga: any) => ga.id === g.id);
                        g.selected = asignado && asignado.asignado === 1;
                    });

                    this.actualizarGradosSeleccionados();
                },
                error: (error: any) => {
                    console.error("Error al cargar grados del producto", error);
                }
            });
        }
    }

    onGradoChange(grado: Grado) {
        this.actualizarGradosSeleccionados();
    }

    removerGrado(grado: Grado) {
        const gradoEnLista = this.listas.grados.find(g => g.id === grado.id);
        if (gradoEnLista) {
            gradoEnLista.selected = false;
        }
        this.actualizarGradosSeleccionados();
    }

    actualizarGradosSeleccionados() {
        this.gradosSeleccionados = this.listas.grados.filter(g => g.selected);
    }

    abrirModalBuscarProducto() {
        this.productosAcademicoService.obtenerDisponiblesParaAcademico().subscribe({
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
                                    <p class="mb-0">No hay productos disponibles para registrar como productos académicos</p>
                                    <small>Todos los productos ya han sido registrados o no hay productos de tipo Académico</small>
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

    formatearEdad(meses: number | null): string {
        if (!meses || meses === 0) return '0 meses';
        if (meses < 12) return `${meses} meses`;
        const anios = Math.floor(meses / 12);
        const mesesRestantes = meses % 12;
        if (mesesRestantes === 0) return `${anios} año${anios > 1 ? 's' : ''}`;
        return `${anios} año${anios > 1 ? 's' : ''} y ${mesesRestantes} mes${mesesRestantes > 1 ? 'es' : ''}`;
    }

    obtenerProductoAcademico(id: any) {
        if (id && id !== "0") {
            this.productosAcademicoService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const producto = response.body[0];
                    if (producto) {
                        this.model.id = producto.id;
                        this.model.idProducto = producto.id_producto;
                        this.model.nombreProducto = producto.nombre_producto || '';
                        this.model.idTipoProductoAcademico = producto.id_tipo_producto_academico;
                        this.model.esConsumible = producto.es_consumible == 1;
                        this.model.vidaUtilEstimadaDias = producto.vida_util_estimada_dias;
                        this.model.edadMinimaMeses = producto.edad_minima_meses;
                        this.model.edadMaximaMeses = producto.edad_maxima_meses;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar producto: ${producto.nombre_producto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar producto: ${producto.nombre_producto}`;
                        }

                        this.cargarGradosDelProducto();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener producto académico", error);
                    Swal.fire('Error', 'Error al cargar los datos del producto académico', 'error');
                }
            });
        }
    }

    guardarProductoAcademico() {
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
            this.productosAcademicoService.crear(productoData).subscribe({
                next: (response: any) => {
                    const idCreado = response.id;

                    if (this.gradosSeleccionados.length > 0) {
                        this.guardarGrados(idCreado);
                    } else {
                        Swal.fire('Éxito', 'Producto académico creado correctamente', 'success')
                            .then(() => this.volver());
                    }
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el producto académico', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.productosAcademicoService.actualizar(productoData).subscribe({
                next: (response: any) => {
                    this.guardarGrados(this.model.id);
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el producto académico', 'error');
                }
            });
        }
    }

    guardarGrados(idProductoAcademico: number) {
        const idsGrados = this.gradosSeleccionados.map(g => g.id);

        this.productosAcademicoService.asignarGrados(idProductoAcademico, idsGrados).subscribe({
            next: (response: any) => {
                const mensaje = this.accion === 'crear' ?
                    'Producto académico creado correctamente' :
                    'Producto académico actualizado correctamente';

                Swal.fire('Éxito', mensaje, 'success')
                    .then(() => this.volver());
            },
            error: (error: any) => {
                console.error("Error al guardar grados", error);
                const mensaje = this.accion === 'crear' ?
                    'El producto se creó pero hubo un error al guardar los grados' :
                    'El producto se actualizó pero hubo un error al guardar los grados';

                Swal.fire('Advertencia', mensaje, 'warning')
                    .then(() => this.volver());
            }
        });
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            id_producto: this.model.idProducto,
            id_tipo_producto_academico: this.model.idTipoProductoAcademico,
            es_consumible: this.model.esConsumible ? 1 : 0,
            vida_util_estimada_dias: this.model.vidaUtilEstimadaDias || null,
            edad_minima_meses: this.model.edadMinimaMeses || null,
            edad_maxima_meses: this.model.edadMaximaMeses || null
        };
    }

    formularioValido(): boolean {
        return Boolean(
            this.model.idProducto &&
            this.model.idTipoProductoAcademico
        );
    }

    volver(): void {
        this.router.navigate(['/administracion/productos-academico']);
    }
}