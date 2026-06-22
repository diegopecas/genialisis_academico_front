import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ElementosFisicosService } from '../../../../services/elementos-fisicos.service';
import { ProductosLimpiezaService } from '../../../../services/productos-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';

interface ElementoFisicoModel {
    id: string;
    nombre: string;
    descripcion: string;
    material: string;
    idUnidadMedida: number;
    abreviaturaUnidad?: string;
}

@Component({
    selector: 'app-crear-elemento-fisico',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-elemento-fisico.component.html',
    styleUrl: './crear-elemento-fisico.component.scss'
})
export class CrearElementoFisicoComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de elemento físico";
    public regresar = '/administracion/elementos-fisicos';
    public tabActivo = 'datos-generales';

    public procesosLimpiezaAsignados: any[] = [];
    public productosLimpiezaDisponibles: any[] = [];

    public listas = {
        tiposProcesoLimpieza: [] as any[],
        unidadesMedida: [] as any[]
    }

    public model: ElementoFisicoModel = {
        id: '',
        nombre: "",
        descripcion: "",
        material: "",
        idUnidadMedida: 0,
        abreviaturaUnidad: ""
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private elementosFisicosService: ElementosFisicosService,
        private productosLimpiezaService: ProductosLimpiezaService,
        private tiposProcesosLimpiezaService: TiposProcesosLimpiezaService
    ) { }

    ngOnInit(): void {
        this.cargarTiposProcesoLimpieza();
        this.cargarProductosLimpiezaDisponibles();
        this.cargarUnidadesMedida();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear elemento físico";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar elemento físico";
                    this.obtenerElementoFisico(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar elemento físico";
                    this.obtenerElementoFisico(this.id);
                    break;
            }
        });
    }

    cargarUnidadesMedida() {
        this.elementosFisicosService.obtenerUnidadesMedida().subscribe({
            next: (response: any) => {
                const unidades = response.body || [];
                this.listas.unidadesMedida = unidades.map((u: any) => ({
                    value: u.id,
                    label: u.nombre,
                    abreviatura: u.abreviatura
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar unidades de medida", error);
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

    cargarProductosLimpiezaDisponibles() {
        this.elementosFisicosService.obtenerProductosLimpiezaDisponibles().subscribe({
            next: (response: any) => {
                this.productosLimpiezaDisponibles = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar productos de limpieza", error);
            }
        });
    }

    obtenerElementoFisico(id: any) {
        if (id && id !== "0") {
            this.elementosFisicosService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const elemento = response.body[0];
                    if (elemento) {
                        this.model.id = elemento.id;
                        this.model.nombre = elemento.nombre || '';
                        this.model.descripcion = elemento.descripcion || '';
                        this.model.material = elemento.material || '';
                        this.model.idUnidadMedida = elemento.id_unidad_medida || '';
                        this.model.abreviaturaUnidad = elemento.abreviatura_unidad || '';

                        if (this.accion === 'editar') {
                            this.titulo = `Editar elemento: ${elemento.nombre}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar elemento: ${elemento.nombre}`;
                        }

                        // Cargar procesos de limpieza
                        this.cargarProcesosLimpiezaAsignados();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener elemento físico", error);
                    Swal.fire('Error', 'Error al cargar los datos del elemento físico', 'error');
                }
            });
        }
    }

    // ===== MÉTODOS PARA PROCESOS DE LIMPIEZA =====
    
    cargarProcesosLimpiezaAsignados() {
        this.elementosFisicosService.obtenerProcesosLimpiezaAsignados(this.id).subscribe({
            next: (response: any) => {
                this.procesosLimpiezaAsignados = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar procesos", error);
            }
        });
    }

    abrirModalProcesoLimpieza(proceso: any = null, tiposDisponibles?: any[]) {
        const esEdicion = proceso !== null;
        
        // Obtener la abreviatura de unidad del modelo o del proceso
        const unidadElemento = this.model.abreviaturaUnidad || 
            this.listas.unidadesMedida.find(u => u.value == this.model.idUnidadMedida)?.abreviatura || 
            'unidad';

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
                    'Ya se han asignado todos los tipos de procesos disponibles a este elemento físico',
                    'info'
                );
                return;
            }
        }
        
        const tiposParaMostrar = tiposDisponibles || this.listas.tiposProcesoLimpieza;
        
        // Preparar productos para edición o array vacío para creación
        let productosIniciales: any[] = [];
        if (esEdicion && proceso.productos) {
            productosIniciales = proceso.productos.map((p: any) => ({
                id: 'producto_' + (p.id_relacion || Date.now() + Math.random()),
                id_producto_limpieza: p.id_producto_limpieza ? p.id_producto_limpieza.toString() : '',
                cantidad_sugerida: p.cantidad_sugerida || '',
                instrucciones: p.instrucciones || ''
            }));
        }

        // Definir las funciones en el window
        (window as any).productosSeleccionados = productosIniciales;
        (window as any).productosDisponibles = this.productosLimpiezaDisponibles;
        (window as any).productosUsados = new Set(productosIniciales.map(p => p.id_producto_limpieza).filter(id => id));

        (window as any).agregarProducto = () => {
            if (this.productosLimpiezaDisponibles.length === 0) {
                Swal.showValidationMessage('No hay productos disponibles');
                return;
            }

            // Verificar si quedan productos sin usar
            const productosLibres = this.productosLimpiezaDisponibles.filter(
                (p: any) => !(window as any).productosUsados.has(p.id_producto_limpieza.toString())
            );

            if (productosLibres.length === 0) {
                Swal.showValidationMessage('Ya se han agregado todos los productos disponibles');
                return;
            }

            const productoId = 'producto_' + Date.now();
            const nuevoProducto = {
                id: productoId,
                id_producto_limpieza: '',
                cantidad_sugerida: '',
                instrucciones: ''
            };

            (window as any).productosSeleccionados.push(nuevoProducto);
            (window as any).renderizarProductos();
        };

        (window as any).eliminarProducto = (productoId: string) => {
            const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
            if (producto && producto.id_producto_limpieza) {
                (window as any).productosUsados.delete(producto.id_producto_limpieza.toString());
            }
            (window as any).productosSeleccionados = (window as any).productosSeleccionados.filter((p: any) => p.id !== productoId);
            (window as any).renderizarProductos();
        };

        (window as any).actualizarProducto = (productoId: string, campo: string, valor: any) => {
            const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
            if (producto) {
                // Si se está cambiando el producto seleccionado
                if (campo === 'id_producto_limpieza') {
                    // Liberar el producto anterior si había uno
                    if (producto.id_producto_limpieza) {
                        (window as any).productosUsados.delete(producto.id_producto_limpieza.toString());
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
                const productosParaEsteSelect = this.productosLimpiezaDisponibles.filter((p: any) =>
                    !((window as any).productosUsados.has(p.id_producto_limpieza.toString())) ||
                    p.id_producto_limpieza.toString() === producto.id_producto_limpieza
                );
                
                // Obtener la unidad del producto seleccionado
                const productoSeleccionado = productosParaEsteSelect.find((p: any) => 
                    p.id_producto_limpieza.toString() === producto.id_producto_limpieza
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
                                            `<option value="${prod.id_producto_limpieza}" 
                                                    data-modo-uso="${prod.modo_uso || ''}"
                                                    data-unidad="${prod.unidad_medida || ''}"
                                                    ${producto.id_producto_limpieza == prod.id_producto_limpieza ? 'selected' : ''}>
                                                    ${prod.nombre_producto} ${prod.concentracion ? '(' + prod.concentracion + ')' : ''}
                                            </option>`
                                        ).join('')}
                                    </select>
                                    ${productosParaEsteSelect.length === 0 && !producto.id_producto_limpieza ?
                                        '<small class="text-danger">No hay más productos disponibles</small>' : ''}
                                </div>
                                
                                <div class="producto-cantidad-wrapper">
                                    <label>
                                        <i class="fas fa-weight"></i> 
                                        Cantidad ${unidadProducto ? `(${unidadProducto})` : ''} por ${unidadElemento}
                                    </label>
                                    <input type="number" class="form-control" 
                                        id="cantidad_${producto.id}"
                                        value="${producto.cantidad_sugerida || ''}"
                                        placeholder="0.00" step="0.01" min="0"
                                        onchange="actualizarProducto('${producto.id}', 'cantidad_sugerida', this.value)">
                                    <small class="text-muted d-block mt-1">
                                        Esta cantidad se aplicará por cada ${unidadElemento} del elemento
                                    </small>
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
            const productosLibres = this.productosLimpiezaDisponibles.filter(
                (p: any) => !(window as any).productosUsados.has(p.id_producto_limpieza.toString())
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
        (window as any).actualizarProductoConModoUso = (productoId: string, idProductoLimpieza: string) => {
            const producto = (window as any).productosSeleccionados.find((p: any) => p.id === productoId);
            if (producto) {
                // Actualizar el tracking de productos usados
                if (producto.id_producto_limpieza) {
                    (window as any).productosUsados.delete(producto.id_producto_limpieza.toString());
                }
                if (idProductoLimpieza) {
                    (window as any).productosUsados.add(idProductoLimpieza.toString());
                }

                producto.id_producto_limpieza = idProductoLimpieza;

                // Si se selecciona un producto, pre-llenar instrucciones con modo_uso
                if (idProductoLimpieza) {
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
            customClass: {
                popup: 'modal-proceso-limpieza'
            },
            html: `
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

                const productosValidos = productos.filter((p: any) => p.id_producto_limpieza);

                const datos: any = {
                    productos: productosValidos.map((p: any) => ({
                        id_producto_limpieza: p.id_producto_limpieza,
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
    }

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
                'Ya se han asignado todos los tipos de procesos disponibles a este elemento físico',
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
            id_elemento_fisico: this.model.id,
            ...datos
        };

        this.elementosFisicosService.asignarProcesoLimpieza(procesoData).subscribe({
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
        this.elementosFisicosService.actualizarProcesoLimpieza(datos).subscribe({
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
                this.elementosFisicosService.eliminarProcesoLimpieza(proceso.id).subscribe({
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

    contarTotalProductosEnProcesos(): number {
        return this.procesosLimpiezaAsignados.reduce((total, proceso) => {
            return total + (proceso.productos ? proceso.productos.length : 0);
        }, 0);
    }

    contarProcesosConProducto(): number {
        return this.procesosLimpiezaAsignados.filter(p => 
            p.productos && p.productos.length > 0
        ).length;
    }

    contarProductosDiferentes(): number {
        const productos = new Set();
        this.procesosLimpiezaAsignados.forEach(proceso => {
            if (proceso.productos) {
                proceso.productos.forEach((p: any) => {
                    productos.add(p.id_producto_limpieza);
                });
            }
        });
        return productos.size;
    }

    guardarElementoFisico() {
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

        const elementoData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.elementosFisicosService.crear(elementoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Elemento físico creado correctamente', 'success')
                        .then(() => {
                            if (response.id) {
                                this.router.navigate(['/administracion/elementos-fisicos/editar', response.id]);
                            } else {
                                this.volver();
                            }
                        });
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el elemento físico', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.elementosFisicosService.actualizar(elementoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Elemento físico actualizado correctamente', 'success');
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el elemento físico', 'error');
                }
            });
        }
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            nombre: this.model.nombre,
            descripcion: this.model.descripcion,
            material: this.model.material,
            id_unidad_medida: this.model.idUnidadMedida
        };
    }

    formularioValido(): boolean {
        return Boolean(this.model.nombre && this.model.idUnidadMedida);
    }

    volver(): void {
        this.router.navigate(['/administracion/elementos-fisicos']);
    }
}