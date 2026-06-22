import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { ItemsMenuService } from '../../../../../services/items-menu.service';
import { PorcionesService } from '../../../../../services/porciones.service';
import { ProductosAlimentacionService } from '../../../../../services/productos-alimentacion.service';


interface ItemMenuModel {
    id: string;
    nombre: string;
    idPorcion: string;
}

interface IngredienteModel {
    id?: string;
    id_producto_alimentacion: string;
    cantidad: number;
    es_opcional: boolean;
    nombre_producto?: string;
    descripcion_producto?: string;
    nombre_unidad?: string;
    abreviatura_unidad?: string;
}

@Component({
    selector: 'app-crear-item-menu',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-item-menu.component.html',
    styleUrl: './crear-item-menu.component.scss'
})
export class CrearItemMenuComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de ítem de menú";
    public regresar = '/administracion/items-menu';
    public tabActivo = 'datos-generales';

    public ingredientesAsignados: IngredienteModel[] = [];
    public productosAlimentacionDisponibles: any[] = [];

    public listas = {
        porciones: [] as any[]
    }

    public model: ItemMenuModel = {
        id: '',
        nombre: "",
        idPorcion: ''
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private itemsMenuService: ItemsMenuService,
        private productosAlimentacionService: ProductosAlimentacionService,
        private porcionesService: PorcionesService
    ) { }

    ngOnInit(): void {
        this.cargarPorciones();
        this.cargarProductosAlimentacion();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear ítem de menú";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar ítem de menú";
                    this.obtenerItemMenu(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar ítem de menú";
                    this.obtenerItemMenu(this.id);
                    break;
            }
        });
    }

    cargarPorciones() {
        this.porcionesService.obtenerActivas().subscribe({
            next: (response: any) => {
                const porciones = response.body || [];
                this.listas.porciones = porciones.map((p: any) => ({
                    value: p.id,
                    label: p.nombre
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar porciones", error);
            }
        });
    }

    cargarProductosAlimentacion() {
        this.productosAlimentacionService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.productosAlimentacionDisponibles = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar productos de alimentación", error);
            }
        });
    }

    obtenerItemMenu(id: any) {
        if (id && id !== "0") {
            this.itemsMenuService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const item = response.body;
                    if (item) {
                        this.model.id = item.id;
                        this.model.nombre = item.nombre || '';
                        this.model.idPorcion = item.id_porcion || 0;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar ítem: ${item.nombre}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar ítem: ${item.nombre}`;
                        }

                        // Cargar ingredientes
                        if (item.ingredientes) {
                            this.ingredientesAsignados = item.ingredientes;
                        } else {
                            this.cargarIngredientesAsignados();
                        }
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener ítem de menú", error);
                    Swal.fire('Error', 'Error al cargar los datos del ítem', 'error');
                }
            });
        }
    }

    // ===== MÉTODOS PARA INGREDIENTES =====

    cargarIngredientesAsignados() {
        this.itemsMenuService.obtenerIngredientesPorItem(this.id).subscribe({
            next: (response: any) => {
                this.ingredientesAsignados = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar ingredientes", error);
            }
        });
    }

    abrirModalAsignarIngrediente() {
        // Obtener IDs de productos ya asignados
        const productosAsignados = this.ingredientesAsignados.map(i => i.id_producto_alimentacion);

        // Filtrar productos disponibles
        const productosDisponibles = this.productosAlimentacionDisponibles.filter(
            p => !productosAsignados.includes(p.id)
        );

        if (productosDisponibles.length === 0) {
            Swal.fire(
                'Sin productos disponibles',
                'Ya se han asignado todos los productos de alimentación disponibles',
                'info'
            );
            return;
        }

        let productoSeleccionado: any = null;
        let cantidad = 0;
        let esOpcional = false;
        let productosFiltrados = [...productosDisponibles];

        Swal.fire({
            title: 'Agregar Ingrediente',
            width: '900px',
            html: `
                <div class="form-section">
                    <div class="form-section-title">
                        <i class="fas fa-carrot"></i>
                        SELECCIONE UN PRODUCTO
                    </div>
                    
                    <!-- Buscador -->
                    <div class="search-container mb-3">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" id="buscar-producto" class="form-control" 
                                placeholder="Buscar producto...">
                        </div>
                    </div>

                    <div class="productos-table">
                        <table>
                            <thead>
                                <tr>
                                    <th width="5%"></th>
                                    <th width="40%">Producto</th>
                                    <th width="20%">Tipo</th>
                                    <th width="15%">Unidad</th>
                                    <th width="20%">Stock Actual</th>
                                </tr>
                            </thead>
                            <tbody id="productos-list">
                                ${productosDisponibles.map((prod: any) => `
                                    <tr class="producto-row" data-id="${prod.id}" data-nombre="${prod.nombre_producto.toLowerCase()}">
                                        <td>
                                            <input type="radio" name="producto" value="${prod.id}" 
                                                data-nombre="${prod.nombre_producto}"
                                                data-unidad="${prod.nombre_unidad || ''}"
                                                data-abreviatura="${prod.abreviatura_unidad || ''}">
                                        </td>
                                        <td>
                                            <div class="product-name">${prod.nombre_producto}</div>
                                            ${prod.descripcion ? `<div class="product-description">${prod.descripcion}</div>` : ''}
                                        </td>
                                        <td>${prod.tipo_alimentacion || '-'}</td>
                                        <td>
                                            <span class="badge bg-secondary">
                                                ${prod.abreviatura_unidad || prod.nombre_unidad || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <span class="badge ${prod.stock_actual > 0 ? 'bg-success' : 'bg-danger'}">
                                                ${prod.stock_actual || 0}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="cantidad-form" id="cantidad-form" style="display: none;">
                    <div class="form-section-title">
                        <i class="fas fa-weight"></i>
                        CONFIGURAR CANTIDAD
                    </div>
                    <div id="producto-seleccionado" class="selected-product mb-3"></div>
                    <div class="row">
    <div class="col-md-6">
        <div class="form-group">
            <label>Cantidad <span id="unidad-label"></span></label>
            <input type="number" id="cantidad-input" class="form-control" 
                step="0.01" min="0" placeholder="0.00">
        </div>
    </div>
    <div class="col-md-6">
        <div class="form-group">
            <label>&nbsp;</label>
            <div class="form-check">
                <input type="checkbox" id="opcional-check" class="form-check-input w-auto">
                <label for="opcional-check" class="form-check-label">
                    ¿Es opcional?
                </label>
            </div>
        </div>
    </div>
</div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            didOpen: () => {
                // Configurar buscador
                const buscador = document.getElementById('buscar-producto') as HTMLInputElement;
                const tbody = document.getElementById('productos-list');

                if (buscador && tbody) {
                    buscador.addEventListener('input', (e: any) => {
                        const filtro = e.target.value.toLowerCase();
                        const filas = tbody.querySelectorAll('.producto-row');

                        filas.forEach((fila: any) => {
                            const nombre = fila.dataset.nombre || '';
                            if (nombre.includes(filtro)) {
                                fila.style.display = '';
                            } else {
                                fila.style.display = 'none';
                            }
                        });
                    });

                    // Focus en el buscador
                    buscador.focus();
                }

                // Manejar selección de producto
                const radioButtons = document.querySelectorAll('input[name="producto"]');
                const cantidadForm = document.getElementById('cantidad-form');
                const productoSeleccionadoDiv = document.getElementById('producto-seleccionado');
                const unidadLabel = document.getElementById('unidad-label');
                const cantidadInput = document.getElementById('cantidad-input') as HTMLInputElement;

                radioButtons.forEach(radio => {
                    radio.addEventListener('change', (e: any) => {
                        // Remover clase selected de todas las filas
                        document.querySelectorAll('.producto-row').forEach(row => {
                            row.classList.remove('selected');
                        });

                        // Agregar clase selected a la fila actual
                        const row = (e.target as HTMLElement).closest('.producto-row');
                        row?.classList.add('selected');

                        // Mostrar formulario de cantidad
                        if (cantidadForm) cantidadForm.style.display = 'block';

                        // Actualizar información del producto seleccionado
                        const nombre = e.target.dataset.nombre;
                        const abreviatura = e.target.dataset.abreviatura;

                        if (productoSeleccionadoDiv) {
                            productoSeleccionadoDiv.innerHTML = `
                                <strong>Producto seleccionado:</strong> ${nombre}
                                ${abreviatura ? `<span class="badge bg-secondary ms-2">${abreviatura}</span>` : ''}
                            `;
                        }

                        if (unidadLabel && abreviatura) {
                            unidadLabel.textContent = `(${abreviatura})`;
                        }

                        // Encontrar el producto seleccionado
                        productoSeleccionado = productosDisponibles.find(p => p.id == e.target.value);

                        // Focus en el input de cantidad
                        if (cantidadInput) {
                            setTimeout(() => cantidadInput.focus(), 100);
                        }
                    });
                });
            },
            preConfirm: () => {
                const selectedRadio = document.querySelector('input[name="producto"]:checked') as HTMLInputElement;
                const cantidadInput = document.getElementById('cantidad-input') as HTMLInputElement;
                const opcionalCheck = document.getElementById('opcional-check') as HTMLInputElement;

                if (!selectedRadio) {
                    Swal.showValidationMessage('Debe seleccionar un producto');
                    return false;
                }

                cantidad = parseFloat(cantidadInput?.value || '0');
                if (cantidad <= 0) {
                    Swal.showValidationMessage('La cantidad debe ser mayor a 0');
                    return false;
                }

                esOpcional = opcionalCheck?.checked || false;

                return {
                    producto: productoSeleccionado,
                    cantidad: cantidad,
                    es_opcional: esOpcional
                };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.procesarAsignacionIngrediente(result.value);
            }
        });
    }

    editarIngrediente(ingrediente: IngredienteModel) {
        let cantidad = ingrediente.cantidad;
        let esOpcional = ingrediente.es_opcional;

        Swal.fire({
            title: 'Editar Ingrediente',
            html: `
            <div class="selected-product mb-3">
                <strong>Producto:</strong> ${ingrediente.nombre_producto}
                ${ingrediente.abreviatura_unidad ?
                    `<span class="badge bg-secondary ms-2">${ingrediente.abreviatura_unidad}</span>` : ''}
            </div>
            <div class="form-group mb-3">
                <label>Cantidad ${ingrediente.abreviatura_unidad ? `(${ingrediente.abreviatura_unidad})` : ''}</label>
                <input type="number" id="cantidad-edit" class="form-control" 
                    step="0.01" min="0" value="${cantidad}" placeholder="0.00">
            </div>
            <div class="form-group">
                <div class="form-check">
                    <input type="checkbox" id="opcional-edit" class="form-check-input" 
                        ${esOpcional ? 'checked' : ''}>
                    <label for="opcional-edit" class="form-check-label">
                        ¿Es ingrediente opcional?
                    </label>
                </div>
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            preConfirm: () => {
                const cantidadInput = document.getElementById('cantidad-edit') as HTMLInputElement;
                const opcionalCheck = document.getElementById('opcional-edit') as HTMLInputElement;

                cantidad = parseFloat(cantidadInput?.value || '0');
                if (cantidad <= 0) {
                    Swal.showValidationMessage('La cantidad debe ser mayor a 0');
                    return false;
                }

                return {
                    cantidad: cantidad,
                    es_opcional: opcionalCheck?.checked || false
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Buscar el índice del ingrediente a editar
                const index = this.ingredientesAsignados.findIndex(
                    i => i.id_producto_alimentacion === ingrediente.id_producto_alimentacion
                );

                if (index !== -1) {
                    // Actualizar el ingrediente en el array
                    this.ingredientesAsignados[index] = {
                        ...this.ingredientesAsignados[index],
                        cantidad: result.value.cantidad,
                        es_opcional: result.value.es_opcional
                    };

                    // Actualizar en el servidor
                    this.actualizarIngredientes();
                }
            }
        });
    }

    procesarAsignacionIngrediente(datos: any) {
        // Agregar el nuevo ingrediente a la lista local
        const nuevoIngrediente: IngredienteModel = {
            id_producto_alimentacion: datos.producto.id,
            cantidad: datos.cantidad,
            es_opcional: datos.es_opcional,
            nombre_producto: datos.producto.nombre_producto,
            descripcion_producto: datos.producto.descripcion,
            nombre_unidad: datos.producto.nombre_unidad,
            abreviatura_unidad: datos.producto.abreviatura_unidad
        };

        this.ingredientesAsignados.push(nuevoIngrediente);
        this.actualizarIngredientes();
    }

    actualizarIngredientes() {
        const ingredientesData = this.ingredientesAsignados.map(i => ({
            id_producto_alimentacion: i.id_producto_alimentacion,
            cantidad: i.cantidad,
            es_opcional: i.es_opcional ? 1 : 0
        }));

        this.itemsMenuService.asignarIngredientes(this.model.id, ingredientesData).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Ingredientes actualizados correctamente', 'success');
                this.cargarIngredientesAsignados();
            },
            error: (error: any) => {
                console.error("Error al actualizar ingredientes", error);
                Swal.fire('Error', 'No se pudieron actualizar los ingredientes', 'error');
            }
        });
    }

    eliminarIngrediente(ingrediente: IngredienteModel) {
        Swal.fire({
            title: '¿Eliminar ingrediente?',
            text: `¿Está seguro de eliminar "${ingrediente.nombre_producto}" de los ingredientes?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Eliminar de la lista local
                this.ingredientesAsignados = this.ingredientesAsignados.filter(
                    i => i.id_producto_alimentacion !== ingrediente.id_producto_alimentacion
                );
                this.actualizarIngredientes();
            }
        });
    }

    // Métodos auxiliares
    contarIngredientesObligatorios(): number {
        return this.ingredientesAsignados.filter(i => !i.es_opcional).length;
    }

    contarIngredientesOpcionales(): number {
        return this.ingredientesAsignados.filter(i => i.es_opcional).length;
    }

    guardarItemMenu() {
        this.submitted = true;

        if (!this.formularioValido()) {
            this.tabActivo = 'datos-generales';

            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor complete todos los campos obligatorios',
                icon: 'warning'
            });
            return;
        }

        const itemData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.itemsMenuService.crear(itemData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Ítem de menú creado correctamente', 'success')
                        .then(() => {
                            if (response.id) {
                                // Redirigir a editar para poder agregar ingredientes
                                this.router.navigate(['/administracion/items-menu/editar', response.id]);
                            } else {
                                this.volver();
                            }
                        });
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el ítem de menú', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.itemsMenuService.actualizar(itemData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Ítem de menú actualizado correctamente', 'success');
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el ítem de menú', 'error');
                }
            });
        }
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            nombre: this.model.nombre,
            id_porcion: this.model.idPorcion
        };
    }

    formularioValido(): boolean {
        return Boolean(this.model.nombre && this.model.idPorcion);
    }

    volver(): void {
        this.router.navigate(['/administracion/items-menu']);
    }
}