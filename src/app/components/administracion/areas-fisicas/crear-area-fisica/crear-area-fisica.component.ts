import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductosMobiliarioService } from '../../../../services/productos-mobiliario.service';
import { MovimientosProductosService } from '../../../../services/movimientos-productos.service';
import { AreasFisicasService } from '../../../../services/areas-fisicas.service';
import { ConceptosMovimientoService } from '../../../../services/conceptos-movimiento.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { PeriodicidadService } from '../../../../services/periodicidad.service';
import { ElementosFisicosService } from '../../../../services/elementos-fisicos.service';

interface AreaFisicaModel {
    id: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    capacidad: number | null;
    activo: number;
}

@Component({
    selector: 'app-crear-area-fisica',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-area-fisica.component.html',
    styleUrl: './crear-area-fisica.component.scss'
})
export class CrearAreaFisicaComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de área física";
    public regresar = '/administracion/areas-fisicas';
    public tabActivo = 'datos-generales';

    public mobiliarioAsignado: any[] = [];
    public mobiliarioDisponible: any[] = [];

    // Variables para procesos de limpieza
    public procesosLimpieza: any[] = [];
    public tiposProcesos: any[] = [];
    public periodicidades: any[] = [];
    public cargaTrabajo: any = null;
    public mostrarInactivos = false;
    public procesosLimpiezaFiltrados: any[] = [];
    public model: AreaFisicaModel = {
        id: '',
        nombre: "",
        descripcion: "",
        ubicacion: "",
        capacidad: null,
        activo: 1
    };
    // Variables para elementos físicos
    public elementosFisicosAsignados: any[] = [];
    public elementosFisicosDisponibles: any[] = [];
    public condicionesElemento: any[] = [];
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private areasFisicasService: AreasFisicasService,
        private productosMobiliarioService: ProductosMobiliarioService,
        private movimientosProductosService: MovimientosProductosService,
        private conceptosService: ConceptosMovimientoService,
        private tiposProcesosLimpiezaService: TiposProcesosLimpiezaService,
        private periodicidadService: PeriodicidadService,
        private elementosFisicosService: ElementosFisicosService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear área física";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar área física";
                    this.obtenerAreaFisica(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar área física";
                    this.obtenerAreaFisica(this.id);
                    break;
            }
        });
    }

    obtenerAreaFisica(id: any) {
        if (id && id !== "0") {
            this.areasFisicasService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const area = response.body[0];
                    if (area) {
                        this.model.id = area.id;
                        this.model.nombre = area.nombre;
                        this.model.descripcion = area.descripcion || '';
                        this.model.ubicacion = area.ubicacion || '';
                        this.model.capacidad = area.capacidad;
                        this.model.activo = area.activo;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar área: ${area.nombre}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar área: ${area.nombre}`;
                        }

                        // Cargar mobiliario asignado
                        this.cargarMobiliarioAsignado();
                        // Cargar procesos de limpieza
                        this.cargarProcesosLimpieza();
                        // Cargar catálogos para limpieza
                        this.cargarCatalogosLimpieza();
                        // Cargar elementos físicos asignados
                        this.cargarElementosFisicosAsignados();
                        this.cargarCondicionesElemento();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener área física", error);
                    Swal.fire('Error', 'Error al cargar los datos del área física', 'error');
                }
            });
        }
    }

    cargarMobiliarioAsignado() {
        this.areasFisicasService.obtenerMobiliarioAsignado(this.id).subscribe({
            next: (response: any) => {
                this.mobiliarioAsignado = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar mobiliario asignado", error);
            }
        });
    }

    contarItemsConOrdenLimpieza(): number {
        return this.mobiliarioAsignado.filter(item => item.orden_limpieza).length;
    }

    abrirModalAsignarMobiliario() {
        this.productosMobiliarioService.obtenerMobiliarioConStock().subscribe({
            next: (response: any) => {
                const mobiliarioDisponible = response.body || [];

                if (mobiliarioDisponible.length === 0) {
                    Swal.fire('Sin mobiliario disponible', 'No hay productos de mobiliario con stock disponible', 'info');
                    return;
                }

                const hoy = new Date().toISOString().split('T')[0];

                // Funciones para el filtrado
                (window as any).filtrarMobiliario = function () {
                    const busqueda = (document.getElementById('busqueda-mobiliario') as HTMLInputElement).value.toLowerCase();
                    const tipoFiltro = (document.getElementById('filtro-tipo') as HTMLSelectElement).value.toLowerCase();
                    const items = document.querySelectorAll('.mobiliario-item');
                    let visibles = 0;

                    items.forEach((item: any) => {
                        const nombre = item.dataset.nombre.toLowerCase();
                        const tipo = item.dataset.tipo.toLowerCase();

                        const cumpleBusqueda = !busqueda || nombre.includes(busqueda);
                        const cumpleTipo = !tipoFiltro || tipo === tipoFiltro;

                        if (cumpleBusqueda && cumpleTipo) {
                            item.style.display = 'block';
                            visibles++;
                        } else {
                            item.style.display = 'none';
                        }
                    });

                    // Actualizar contador
                    const contador = document.getElementById('contador-items');
                    if (contador) {
                        contador.textContent = `Mostrando ${visibles} de ${mobiliarioDisponible.length} items`;
                    }
                };

                // Obtener tipos únicos para el filtro
                const tiposUnicos = [...new Set(mobiliarioDisponible
                    .map((item: any) => item.tipo_mobiliario)
                    .filter(Boolean))] as string[];

                Swal.fire({
                    title: 'Asignar Mobiliario al Área',
                    width: '800px',
                    html: `
                    <div style="text-align: left;">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                                Fecha de Asignación <span style="color: red;">*</span>
                            </label>
                            <input id="fecha" type="date" class="swal2-input" 
                                style="width: 100%; margin: 0;" 
                                max="${hoy}" value="${hoy}">
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <div style="margin-bottom: 10px;">
                                <input id="busqueda-mobiliario" 
                                    type="text" 
                                    class="swal2-input"
                                    style="width: 100%; margin: 0;" 
                                    placeholder="🔍 Buscar por nombre o serie..."
                                    onkeyup="window.filtrarMobiliario()">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <select id="filtro-tipo" class="swal2-input" 
                                    style="width: 100%; margin: 0; height: 38px;" 
                                    onchange="window.filtrarMobiliario()">
                                    <option value="">Todos los tipos</option>
                                    ${tiposUnicos.map((tipo) =>
                        `<option value="${tipo}">${tipo}</option>`
                    ).join('')}
                                </select>
                                <div id="contador-items" 
                                    style="background: white; padding: 8px; border-radius: 4px; text-align: center; font-size: 13px;">
                                    Mostrando ${mobiliarioDisponible.length} de ${mobiliarioDisponible.length} items
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                                Seleccione mobiliario y cantidades:
                            </label>
                            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #dee2e6; border-radius: 8px; background: white;">
                                ${mobiliarioDisponible.map((item: any, index: number) => `
                                    <div class="mobiliario-item" 
                                        style="padding: 10px; border-bottom: 1px solid #f0f0f0; display: block;"
                                        data-nombre="${item.nombre_producto} ${item.numero_serie || ''}"
                                        data-tipo="${item.tipo_mobiliario || ''}">
                                        <div style="display: flex; align-items: center; justify-content: space-between;">
                                            <div style="flex: 1;">
                                                <div style="font-weight: 600; font-size: 14px;">
                                                    ${item.nombre_producto}
                                                    ${item.tipo_mobiliario ?
                            `<span style="display: inline-block; padding: 2px 6px; background: #e3f2fd; color: #1976d2; border-radius: 12px; font-size: 11px; margin-left: 8px;">
                                                            ${item.tipo_mobiliario}
                                                        </span>` : ''}
                                                </div>
                                                <div style="font-size: 12px; color: #6c757d; margin-top: 3px;">
                                                    ${item.numero_serie ? `Serie: ${item.numero_serie}` : 'Sin serie'}
                                                </div>
                                            </div>
                                            <div style="display: flex; align-items: center; gap: 10px;">
                                                <span style="color: #28a745; font-weight: 600; font-size: 14px;">
                                                    Stock: ${item.stock_actual}
                                                </span>
                                                <div style="display: flex; gap: 8px;">
                                                    <div>
                                                        <div style="font-size: 11px; color: #6c757d; margin-bottom: 2px;">Cantidad</div>
                                                        <input type="number" 
                                                            id="cantidad_${index}" 
                                                            data-producto="${item.id_producto_mobiliario}"
                                                            data-stock="${item.stock_actual}"
                                                            style="width: 60px; padding: 5px; border: 1px solid #ced4da; border-radius: 4px; text-align: center;"
                                                            min="0" 
                                                            max="${item.stock_actual}"
                                                            value="">
                                                    </div>
                                                    <div>
                                                        <div style="font-size: 11px; color: #6c757d; margin-bottom: 2px;">Orden</div>
                                                        <input type="number" 
                                                            id="orden_${index}" 
                                                            style="width: 50px; padding: 5px; border: 1px solid #ced4da; border-radius: 4px; text-align: center;"
                                                            min="1"
                                                            placeholder="-">
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div>
                            <small style="color: #6c757d;">
                                💡 <strong>Tip:</strong> Use la búsqueda y filtros para encontrar items rápidamente. 
                                El orden de limpieza es opcional.
                            </small>
                        </div>
                    </div>
                `,
                    showCancelButton: true,
                    confirmButtonText: 'Asignar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#28a745',
                    preConfirm: () => {
                        const fecha = (document.getElementById('fecha') as HTMLInputElement).value;

                        if (!fecha) {
                            Swal.showValidationMessage('La fecha es requerida');
                            return false;
                        }

                        const productosSeleccionados: any[] = [];
                        mobiliarioDisponible.forEach((item: any, index: number) => {
                            const cantidadInput = document.getElementById(`cantidad_${index}`) as HTMLInputElement;
                            const ordenInput = document.getElementById(`orden_${index}`) as HTMLInputElement;
                            const cantidad = parseInt(cantidadInput.value);

                            if (cantidad > 0) {
                                const stock = parseInt(cantidadInput.dataset['stock'] || '0');

                                if (cantidad > stock) {
                                    Swal.showValidationMessage(`La cantidad para ${item.nombre_producto} excede el stock disponible`);
                                    return;
                                }

                                productosSeleccionados.push({
                                    id_producto_mobiliario: item.id_producto_mobiliario,
                                    cantidad: cantidad,
                                    orden_limpieza: ordenInput.value ? parseInt(ordenInput.value) : null,
                                    nombre: item.nombre_producto
                                });
                            }
                        });

                        if (productosSeleccionados.length === 0) {
                            Swal.showValidationMessage('Debe seleccionar al menos un producto');
                            return false;
                        }

                        return {
                            fecha: fecha,
                            productos: productosSeleccionados
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.procesarAsignacionMobiliario(result.value);
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener mobiliario disponible", error);
                Swal.fire('Error', 'No se pudo cargar el mobiliario disponible', 'error');
            }
        });
    }

    async procesarAsignacionMobiliario(datos: any) {
        const { fecha, productos } = datos;

        try {
            const conceptosResponse: any = await this.conceptosService.obtenerPorTipo('S').toPromise();

            if (!conceptosResponse || !conceptosResponse.body) {
                Swal.fire('Error', 'No se pudieron obtener los conceptos de movimiento', 'error');
                return;
            }

            const conceptos = conceptosResponse.body || [];
            const conceptoAsignacion = conceptos.find((c: any) =>
                c.nombre.toLowerCase().includes('asignación') &&
                c.nombre.toLowerCase().includes('área')
            );

            if (!conceptoAsignacion) {
                Swal.fire('Error', 'No se encontró el concepto de asignación a área física', 'error');
                return;
            }

            const productosDetalle = [];
            for (const item of productos) {
                const respMobiliario: any = await this.productosMobiliarioService.obtenerById(item.id_producto_mobiliario).toPromise();

                if (respMobiliario && respMobiliario.body && respMobiliario.body.length > 0) {
                    const mobiliario = respMobiliario.body[0];
                    productosDetalle.push({
                        id_producto: mobiliario.id_producto,
                        cantidad: item.cantidad,
                        precio_unitario: 0,
                        fecha_vencimiento: null
                    });
                }
            }

            if (productosDetalle.length === 0) {
                Swal.fire('Error', 'No se pudieron obtener los productos', 'error');
                return;
            }

            const movimiento = {
                fecha_movimiento: fecha + ' 00:00:00',
                id_concepto_movimiento: conceptoAsignacion.id,
                id_proveedor: null,
                observaciones: `Asignación al área: ${this.model.nombre}`,
                id_usuario_registro: 1,
                detalle: productosDetalle
            };

            const responseMovimiento: any = await this.movimientosProductosService.crear(movimiento).toPromise();

            if (!responseMovimiento || !responseMovimiento.id) {
                Swal.fire('Error', 'No se pudo crear el movimiento', 'error');
                return;
            }

            const idMovimiento = responseMovimiento.id;
            await this.movimientosProductosService.registrar(idMovimiento).toPromise();

            const asignacionData = {
                id_area: this.model.id,
                id_movimiento: idMovimiento,
                productos: productos
            };

            await this.productosMobiliarioService.guardarAsignacionArea(asignacionData).toPromise();

            Swal.fire('Éxito', 'Mobiliario asignado correctamente y stock actualizado', 'success');
            this.cargarMobiliarioAsignado();

        } catch (error: any) {
            console.error("Error al asignar mobiliario", error);
            Swal.fire('Error', error.error?.error || 'No se pudo asignar el mobiliario', 'error');
        }
    }

    eliminarAsignacion(item: any) {
        this.productosMobiliarioService.obtenerConceptosDevolucion().subscribe({
            next: (conceptos: any) => {
                const conceptosData = conceptos.body || [];

                if (conceptosData.length === 0) {
                    Swal.fire('Error', 'No se encontraron conceptos de devolución configurados', 'error');
                    return;
                }

                const hoy = new Date().toISOString().split('T')[0];

                Swal.fire({
                    title: 'Devolución de Mobiliario',
                    html: `
                        <style>
                            .swal2-html-container {
                                overflow: visible !important;
                            }
                            .form-group {
                                margin-bottom: 15px;
                                text-align: left;
                            }
                            .form-group label {
                                display: block;
                                margin-bottom: 5px;
                                font-weight: 600;
                                color: #495057;
                            }
                            .swal2-input, .swal2-textarea, .swal2-select {
                                width: 90% !important;
                                margin: 10px auto !important;
                            }
                            .info-box {
                                background-color: #f8f9fa;
                                border-left: 4px solid #17a2b8;
                                padding: 10px;
                                margin-bottom: 15px;
                            }
                            .info-box strong {
                                color: #004085;
                            }
                        </style>
                        
                        <div class="info-box">
                            <strong>Producto:</strong> ${item.nombre_producto}<br>
                            <strong>Cantidad a devolver:</strong> ${item.cantidad} unidades<br>
                            <strong>Número Serie:</strong> ${item.numero_serie || 'Sin serie'}
                        </div>
                        
                        <div class="form-group">
                            <label>Fecha de Devolución <span style="color: red;">*</span></label>
                            <input id="fecha" type="date" class="swal2-input" max="${hoy}" value="${hoy}">
                        </div>
                        
                        <div class="form-group">
                            <label>Concepto de Devolución <span style="color: red;">*</span></label>
                            <select id="concepto" class="swal2-select">
                                ${conceptosData.map((c: any) =>
                        `<option value="${c.id}">${c.nombre}</option>`
                    ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Observaciones <span style="color: red;">*</span></label>
                            <textarea id="observaciones" 
                                class="swal2-textarea" 
                                placeholder="Motivo de la devolución, estado del mobiliario, etc." 
                                rows="3"></textarea>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Procesar Devolución',
                    cancelButtonText: 'Cancelar',
                    preConfirm: () => {
                        const fecha = (document.getElementById('fecha') as HTMLInputElement).value;
                        const concepto = (document.getElementById('concepto') as HTMLSelectElement).value;
                        const observaciones = (document.getElementById('observaciones') as HTMLTextAreaElement).value;

                        if (!fecha || !concepto || !observaciones.trim()) {
                            Swal.showValidationMessage('Todos los campos son requeridos');
                            return false;
                        }

                        return {
                            fecha: fecha,
                            id_concepto_movimiento: parseInt(concepto),
                            observaciones: observaciones
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.procesarDevolucion(item, result.value);
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener conceptos", error);
                Swal.fire('Error', 'No se pudieron cargar los conceptos de devolución', 'error');
            }
        });
    }

    async procesarDevolucion(item: any, datosDevolucion: any) {
        try {
            const respMobiliario: any = await this.productosMobiliarioService.obtenerById(item.id_producto_mobiliario).toPromise();

            if (!respMobiliario || !respMobiliario.body || respMobiliario.body.length === 0) {
                Swal.fire('Error', 'No se pudo obtener información del producto', 'error');
                return;
            }

            const mobiliario = respMobiliario.body[0];

            const movimiento = {
                fecha_movimiento: datosDevolucion.fecha + ' 00:00:00',
                id_concepto_movimiento: datosDevolucion.id_concepto_movimiento,
                id_proveedor: null,
                observaciones: `Devolución del área: ${this.model.nombre} - ${datosDevolucion.observaciones}`,
                id_usuario_registro: 1,
                detalle: [{
                    id_producto: mobiliario.id_producto,
                    cantidad: item.cantidad,
                    precio_unitario: 0,
                    fecha_vencimiento: null
                }]
            };

            const responseMovimiento: any = await this.movimientosProductosService.crear(movimiento).toPromise();

            if (!responseMovimiento || !responseMovimiento.id) {
                Swal.fire('Error', 'No se pudo crear el movimiento de devolución', 'error');
                return;
            }

            const idMovimiento = responseMovimiento.id;
            await this.movimientosProductosService.registrar(idMovimiento).toPromise();

            const devolucionData = {
                id_asignacion: item.id,
                id_movimiento_devolucion: idMovimiento
            };

            await this.productosMobiliarioService.procesarDevolucionAsignacion(devolucionData).toPromise();

            Swal.fire('Éxito', 'Devolución procesada correctamente. El stock ha sido actualizado.', 'success');
            this.cargarMobiliarioAsignado();

        } catch (error: any) {
            console.error("Error al procesar devolución", error);
            Swal.fire('Error', error.error?.error || 'No se pudo procesar la devolución', 'error');
        }
    }

    calcularTotalUnidades(): number {
        return this.mobiliarioAsignado.reduce((total, item) => total + (item.cantidad || 0), 0);
    }

    formatearFecha(fecha: string): string {
        if (!fecha) return '-';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO');
    }

    guardarAreaFisica() {
        this.submitted = true;

        if (this.accion === 'crear' || this.tabActivo === 'datos-generales') {
            if (!this.formularioValido()) {
                this.tabActivo = 'datos-generales';

                Swal.fire({
                    title: 'Campos incompletos',
                    text: 'Por favor complete todos los campos obligatorios en Datos Generales',
                    icon: 'warning'
                });
                return;
            }
        }

        const areaData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.areasFisicasService.crear(areaData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Área física creada correctamente', 'success')
                        .then(() => {
                            if (response.id) {
                                this.router.navigate(['/administracion/areas-fisicas/editar', response.id]);
                            } else {
                                this.volver();
                            }
                        });
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el área física', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.areasFisicasService.actualizar(areaData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Área física actualizada correctamente', 'success');
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el área física', 'error');
                }
            });
        }
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            nombre: this.model.nombre,
            descripcion: this.model.descripcion || null,
            ubicacion: this.model.ubicacion || null,
            capacidad: this.model.capacidad || null,
            activo: this.model.activo
        };
    }

    formularioValido(): boolean {
        return Boolean(this.model.nombre && this.model.nombre.trim());
    }

    volver(): void {
        this.router.navigate(['/administracion/areas-fisicas']);
    }

    // ========== MÉTODOS PARA PROCESOS DE LIMPIEZA ==========

    cargarCatalogosLimpieza() {
        this.tiposProcesosLimpiezaService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.tiposProcesos = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de procesos", error);
            }
        });

        this.periodicidadService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.periodicidades = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar periodicidades", error);
            }
        });
    }

    cargarProcesosLimpieza() {
        this.areasFisicasService.obtenerProcesosLimpieza(this.id).subscribe({
            next: (response: any) => {
                this.procesosLimpieza = response.body || [];
                this.filtrarProcesos();
                this.cargarCargaTrabajo();
            },
            error: (error: any) => {
                console.error("Error al cargar procesos de limpieza", error);
            }
        });
    }


    filtrarProcesos() {

        if (this.mostrarInactivos) {
            this.procesosLimpiezaFiltrados = this.procesosLimpieza;
        } else {
            this.procesosLimpiezaFiltrados = this.procesosLimpieza.filter(p => p.activo === 1);
        }

    }


    activarProcesoLimpieza(proceso: any) {
        Swal.fire({
            title: '¿Activar proceso de limpieza?',
            text: `¿Está seguro de activar el proceso "${proceso.nombre_proceso}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, activar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.areasFisicasService.activarProcesoLimpieza(proceso.id).subscribe({
                    next: (response: any) => {
                        Swal.fire('Activado', 'El proceso ha sido activado correctamente', 'success');
                        this.cargarProcesosLimpieza();
                    },
                    error: (error: any) => {
                        console.error("Error al activar proceso", error);
                        Swal.fire('Error', 'No se pudo activar el proceso', 'error');
                    }
                });
            }
        });
    }

    // Método para alternar vista
    toggleMostrarInactivos() {
        this.mostrarInactivos = !this.mostrarInactivos;
        this.filtrarProcesos();
    }

    cargarCargaTrabajo() {
        this.areasFisicasService.obtenerCargaTrabajo(this.id).subscribe({
            next: (response: any) => {
                this.cargaTrabajo = response.body;
            },
            error: (error: any) => {
                console.error("Error al cargar carga de trabajo", error);
            }
        });
    }

    abrirModalAsignarProcesoLimpieza() {
        if (this.tiposProcesos.length === 0) {
            Swal.fire('Sin procesos disponibles', 'No hay tipos de procesos de limpieza configurados', 'info');
            return;
        }

        Swal.fire({
            title: 'Configurar Proceso de Limpieza',
            width: '900px',
            html: `
                <style>
                    .swal2-html-container {
                        overflow: visible !important;
                    }
                    .form-group {
                        margin-bottom: 20px;
                        text-align: left;
                    }
                    .form-group label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 600;
                        color: #495057;
                    }
                    .swal2-input, .swal2-select {
                        width: 90% !important;
                        margin: 10px auto !important;
                    }
                    .dias-semana-container {
                        display: flex;
                        justify-content: space-around;
                        flex-wrap: wrap;
                        gap: 10px;
                        margin: 15px 0;
                        padding: 15px;
                        border: 1px solid #dee2e6;
                        border-radius: 8px;
                        background-color: #f8f9fa;
                    }
                    .dia-checkbox {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 10px;
                        background: white;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s;
                        min-width: 60px;
                    }
                    .dia-checkbox:hover {
                        background-color: #e3f2fd;
                        transform: translateY(-2px);
                    }
                    .dia-checkbox input[type="checkbox"] {
                        width: 20px;
                        height: 20px;
                        cursor: pointer;
                    }
                    .dia-checkbox label {
                        margin-top: 5px;
                        font-weight: 500;
                        cursor: pointer;
                        color: #495057;
                    }
                    .dia-checkbox.selected {
                        background-color: #bbdefb;
                        border: 2px solid #2196F3;
                    }
                    .botones-rapidos {
                        display: flex;
                        gap: 10px;
                        margin-top: 10px;
                        justify-content: center;
                    }
                    .btn-rapido {
                        padding: 5px 12px;
                        font-size: 0.875rem;
                        border: 1px solid #007bff;
                        border-radius: 4px;
                        background: white;
                        color: #007bff;
                        cursor: pointer;
                        transition: all 0.3s;
                    }
                    .btn-rapido:hover {
                        background: #007bff;
                        color: white;
                    }
                    .row-group {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                    }
                    .info-text {
                        background-color: #e7f3ff;
                        padding: 10px;
                        border-radius: 5px;
                        font-size: 0.9rem;
                        color: #004085;
                        margin-top: 10px;
                    }
                </style>
                
                <div class="form-group">
                    <label>Tipo de Proceso <span style="color: red;">*</span></label>
                    <select id="tipo_proceso" class="swal2-select">
                        <option value="">Seleccione un tipo de proceso</option>
                        ${this.tiposProcesos.map((tipo: any) =>
                `<option value="${tipo.id}">${tipo.nombre}${tipo.descripcion ? ' - ' + tipo.descripcion : ''}</option>`
            ).join('')}
                    </select>
                </div>

                <div class="row-group">
                    <div class="form-group">
                        <label>Periodicidad <span style="color: red;">*</span></label>
                        <select id="periodicidad" class="swal2-select">
                            <option value="">Seleccione periodicidad</option>
                            ${this.periodicidades.map((per: any) =>
                `<option value="${per.id}">${per.nombre}</option>`
            ).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Tiempo Estimado (minutos) <span style="color: red;">*</span></label>
                        <input id="tiempo_estimado" type="number" class="swal2-input" 
                            placeholder="Ej: 30, 60, 120" min="5" max="480">
                    </div>
                </div>

                <div class="form-group">
                    <label>Días de la Semana <span style="color: red;">*</span></label>
                    <div class="dias-semana-container">
                        <div class="dia-checkbox" onclick="toggleDia(this, 'lunes')">
                            <input type="checkbox" id="lunes" value="1">
                            <label for="lunes">Lun</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'martes')">
                            <input type="checkbox" id="martes" value="1">
                            <label for="martes">Mar</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'miercoles')">
                            <input type="checkbox" id="miercoles" value="1">
                            <label for="miercoles">Mié</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'jueves')">
                            <input type="checkbox" id="jueves" value="1">
                            <label for="jueves">Jue</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'viernes')">
                            <input type="checkbox" id="viernes" value="1">
                            <label for="viernes">Vie</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'sabado')">
                            <input type="checkbox" id="sabado" value="1">
                            <label for="sabado">Sáb</label>
                        </div>
                        <div class="dia-checkbox" onclick="toggleDia(this, 'domingo')">
                            <input type="checkbox" id="domingo" value="1">
                            <label for="domingo">Dom</label>
                        </div>
                    </div>
                    <div class="botones-rapidos">
                        <button type="button" class="btn-rapido" onclick="seleccionarTodos()">Todos los días</button>
                        <button type="button" class="btn-rapido" onclick="seleccionarLaborales()">Días laborales</button>
                        <button type="button" class="btn-rapido" onclick="seleccionarFinSemana()">Fin de semana</button>
                        <button type="button" class="btn-rapido" onclick="limpiarSeleccion()">Limpiar</button>
                    </div>
                </div>

                <div class="row-group">
                    <div class="form-group">
                        <label>Veces por Día</label>
                        <input id="veces_dia" type="number" class="swal2-input" 
                            value="1" min="1" max="10">
                    </div>

                    <div class="form-group">
                        <label>Hora Sugerida</label>
                        <input id="hora_sugerida" type="time" class="swal2-input">
                    </div>
                </div>

                <div class="form-group">
                    <label>Prioridad</label>
                    <select id="prioridad" class="swal2-select">
                        <option value="1">Baja</option>
                        <option value="2" selected>Media</option>
                        <option value="3">Alta</option>
                    </select>
                </div>

                <div class="info-text">
                    <i class="fas fa-info-circle"></i> La carga de trabajo semanal se calculará automáticamente según los días seleccionados y la frecuencia diaria.
                </div>

                <script>
                    function toggleDia(element, dia) {
                        const checkbox = document.getElementById(dia);
                        checkbox.checked = !checkbox.checked;
                        element.classList.toggle('selected', checkbox.checked);
                    }

                    function seleccionarTodos() {
                        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(dia => {
                            document.getElementById(dia).checked = true;
                            document.getElementById(dia).parentElement.classList.add('selected');
                        });
                    }

                    function seleccionarLaborales() {
                        limpiarSeleccion();
                        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
                            document.getElementById(dia).checked = true;
                            document.getElementById(dia).parentElement.classList.add('selected');
                        });
                    }

                    function seleccionarFinSemana() {
                        limpiarSeleccion();
                        ['sabado', 'domingo'].forEach(dia => {
                            document.getElementById(dia).checked = true;
                            document.getElementById(dia).parentElement.classList.add('selected');
                        });
                    }

                    function limpiarSeleccion() {
                        ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(dia => {
                            document.getElementById(dia).checked = false;
                            document.getElementById(dia).parentElement.classList.remove('selected');
                        });
                    }

                    document.querySelectorAll('.dia-checkbox input:checked').forEach(checkbox => {
                        checkbox.parentElement.classList.add('selected');
                    });
                </script>
            `,
            showCancelButton: true,
            confirmButtonText: 'Asignar Proceso',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            preConfirm: () => {
                const tipo_proceso = (document.getElementById('tipo_proceso') as HTMLSelectElement).value;
                const periodicidad = (document.getElementById('periodicidad') as HTMLSelectElement).value;
                const tiempo_estimado = (document.getElementById('tiempo_estimado') as HTMLInputElement).value;
                const hora_sugerida = (document.getElementById('hora_sugerida') as HTMLInputElement).value;
                const prioridad = (document.getElementById('prioridad') as HTMLSelectElement).value;
                const veces_dia = (document.getElementById('veces_dia') as HTMLInputElement).value;

                if (!tipo_proceso) {
                    Swal.showValidationMessage('Debe seleccionar un tipo de proceso');
                    return false;
                }

                if (!periodicidad) {
                    Swal.showValidationMessage('Debe seleccionar una periodicidad');
                    return false;
                }

                if (!tiempo_estimado || parseInt(tiempo_estimado) <= 0) {
                    Swal.showValidationMessage('Debe ingresar un tiempo estimado válido');
                    return false;
                }

                const diasSeleccionados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
                    .filter(dia => (document.getElementById(dia) as HTMLInputElement).checked);

                if (diasSeleccionados.length === 0) {
                    Swal.showValidationMessage('Debe seleccionar al menos un día de la semana');
                    return false;
                }

                const datos: any = {
                    id_area_fisica: this.model.id,
                    id_tipo_proceso_limpieza: parseInt(tipo_proceso),
                    id_periodicidad: parseInt(periodicidad),
                    tiempo_estimado_minutos: parseInt(tiempo_estimado),
                    hora_sugerida: hora_sugerida || null,
                    prioridad: parseInt(prioridad),
                    veces_por_dia: parseInt(veces_dia) || 1,
                    lunes: (document.getElementById('lunes') as HTMLInputElement).checked ? 1 : 0,
                    martes: (document.getElementById('martes') as HTMLInputElement).checked ? 1 : 0,
                    miercoles: (document.getElementById('miercoles') as HTMLInputElement).checked ? 1 : 0,
                    jueves: (document.getElementById('jueves') as HTMLInputElement).checked ? 1 : 0,
                    viernes: (document.getElementById('viernes') as HTMLInputElement).checked ? 1 : 0,
                    sabado: (document.getElementById('sabado') as HTMLInputElement).checked ? 1 : 0,
                    domingo: (document.getElementById('domingo') as HTMLInputElement).checked ? 1 : 0
                };

                return datos;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.guardarProcesoLimpieza(result.value);
            }
        });
    }

    guardarProcesoLimpieza(datos: any) {
        this.areasFisicasService.asignarProcesoLimpieza(datos).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Proceso de limpieza asignado correctamente', 'success');
                this.cargarProcesosLimpieza();
            },
            error: (error: any) => {
                console.error("Error al asignar proceso", error);
                Swal.fire('Error', error.error?.error || 'No se pudo asignar el proceso de limpieza', 'error');
            }
        });
    }



    eliminarProcesoLimpieza(proceso: any) {
        Swal.fire({
            title: '¿Eliminar proceso de limpieza?',
            text: `¿Está seguro de eliminar el proceso "${proceso.nombre_proceso}" de esta área?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.areasFisicasService.eliminarProcesoLimpieza(proceso.id).subscribe({
                    next: (response: any) => {
                        Swal.fire('Eliminado', 'El proceso ha sido eliminado correctamente', 'success');
                        this.cargarProcesosLimpieza();
                    },
                    error: (error: any) => {
                        console.error("Error al eliminar proceso", error);
                        Swal.fire('Error', 'No se pudo eliminar el proceso', 'error');
                    }
                });
            }
        });
    }

    formatearDiasSemana(proceso: any): string {
        const dias = [];
        if (proceso.lunes) dias.push('L');
        if (proceso.martes) dias.push('M');
        if (proceso.miercoles) dias.push('X');
        if (proceso.jueves) dias.push('J');
        if (proceso.viernes) dias.push('V');
        if (proceso.sabado) dias.push('S');
        if (proceso.domingo) dias.push('D');
        return dias.join('-');
    }

    formatearTiempo(minutos: number): string {
        if (minutos < 60) {
            return `${minutos} min`;
        }
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    }

    calcularCargaSemanal(): string {
        if (!this.cargaTrabajo || !this.cargaTrabajo.carga_semanal_total) {
            return '0h';
        }
        return this.formatearTiempo(this.cargaTrabajo.carga_semanal_total);
    }

    obtenerBadgePrioridad(prioridad: number): string {
        switch (prioridad) {
            case 3: return 'danger';
            case 2: return 'warning';
            default: return 'secondary';
        }
    }

    obtenerTextoPrioridad(prioridad: number): string {
        switch (prioridad) {
            case 3: return 'Alta';
            case 2: return 'Media';
            default: return 'Baja';
        }
    }
    // Agregar estos métodos en la clase CrearAreaFisicaComponent:

    contarProcesosDiarios(): number {
        if (!this.procesosLimpieza) return 0;
        return this.procesosLimpieza.filter(p => p.periodicidad_codigo === 'DIARIO').length;
    }

    contarProcesosAltaPrioridad(): number {
        if (!this.procesosLimpieza) return 0;
        return this.procesosLimpieza.filter(p => p.prioridad === 3).length;
    }
    editarProcesoLimpieza(proceso: any) {
        Swal.fire({
            title: 'Editar Proceso de Limpieza',
            width: '900px',
            html: `
            <style>
                /* Mismos estilos del modal de crear */
                .swal2-html-container {
                    overflow: visible !important;
                }
                .form-group {
                    margin-bottom: 20px;
                    text-align: left;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 600;
                    color: #495057;
                }
                .swal2-input, .swal2-select {
                    width: 90% !important;
                    margin: 10px auto !important;
                }
                .dias-semana-container {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin: 15px 0;
                    padding: 15px;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                }
                .dia-checkbox {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px;
                    background: white;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                    min-width: 60px;
                }
                .dia-checkbox:hover {
                    background-color: #e3f2fd;
                    transform: translateY(-2px);
                }
                .dia-checkbox input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }
                .dia-checkbox label {
                    margin-top: 5px;
                    font-weight: 500;
                    cursor: pointer;
                    color: #495057;
                }
                .dia-checkbox.selected {
                    background-color: #bbdefb;
                    border: 2px solid #2196F3;
                }
                .botones-rapidos {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                    justify-content: center;
                }
                .btn-rapido {
                    padding: 5px 12px;
                    font-size: 0.875rem;
                    border: 1px solid #007bff;
                    border-radius: 4px;
                    background: white;
                    color: #007bff;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-rapido:hover {
                    background: #007bff;
                    color: white;
                }
                .row-group {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
            </style>
            
            <div class="form-group">
                <label>Tipo de Proceso</label>
                <input type="text" class="swal2-input" value="${proceso.nombre_proceso}" disabled>
            </div>

            <div class="row-group">
                <div class="form-group">
                    <label>Periodicidad <span style="color: red;">*</span></label>
                    <select id="periodicidad" class="swal2-select">
                        ${this.periodicidades.map((per: any) =>
                `<option value="${per.id}" ${per.id === proceso.id_periodicidad ? 'selected' : ''}>${per.nombre}</option>`
            ).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Tiempo Estimado (minutos) <span style="color: red;">*</span></label>
                    <input id="tiempo_estimado" type="number" class="swal2-input" 
                        value="${proceso.tiempo_estimado_minutos}"
                        placeholder="Ej: 30, 60, 120" min="5" max="480">
                </div>
            </div>

            <div class="form-group">
                <label>Días de la Semana <span style="color: red;">*</span></label>
                <div class="dias-semana-container">
                    <div class="dia-checkbox ${proceso.lunes ? 'selected' : ''}" onclick="toggleDia(this, 'lunes')">
                        <input type="checkbox" id="lunes" value="1" ${proceso.lunes ? 'checked' : ''}>
                        <label for="lunes">Lun</label>
                    </div>
                    <div class="dia-checkbox ${proceso.martes ? 'selected' : ''}" onclick="toggleDia(this, 'martes')">
                        <input type="checkbox" id="martes" value="1" ${proceso.martes ? 'checked' : ''}>
                        <label for="martes">Mar</label>
                    </div>
                    <div class="dia-checkbox ${proceso.miercoles ? 'selected' : ''}" onclick="toggleDia(this, 'miercoles')">
                        <input type="checkbox" id="miercoles" value="1" ${proceso.miercoles ? 'checked' : ''}>
                        <label for="miercoles">Mié</label>
                    </div>
                    <div class="dia-checkbox ${proceso.jueves ? 'selected' : ''}" onclick="toggleDia(this, 'jueves')">
                        <input type="checkbox" id="jueves" value="1" ${proceso.jueves ? 'checked' : ''}>
                        <label for="jueves">Jue</label>
                    </div>
                    <div class="dia-checkbox ${proceso.viernes ? 'selected' : ''}" onclick="toggleDia(this, 'viernes')">
                        <input type="checkbox" id="viernes" value="1" ${proceso.viernes ? 'checked' : ''}>
                        <label for="viernes">Vie</label>
                    </div>
                    <div class="dia-checkbox ${proceso.sabado ? 'selected' : ''}" onclick="toggleDia(this, 'sabado')">
                        <input type="checkbox" id="sabado" value="1" ${proceso.sabado ? 'checked' : ''}>
                        <label for="sabado">Sáb</label>
                    </div>
                    <div class="dia-checkbox ${proceso.domingo ? 'selected' : ''}" onclick="toggleDia(this, 'domingo')">
                        <input type="checkbox" id="domingo" value="1" ${proceso.domingo ? 'checked' : ''}>
                        <label for="domingo">Dom</label>
                    </div>
                </div>
                <div class="botones-rapidos">
                    <button type="button" class="btn-rapido" onclick="seleccionarTodos()">Todos los días</button>
                    <button type="button" class="btn-rapido" onclick="seleccionarLaborales()">Días laborales</button>
                    <button type="button" class="btn-rapido" onclick="seleccionarFinSemana()">Fin de semana</button>
                    <button type="button" class="btn-rapido" onclick="limpiarSeleccion()">Limpiar</button>
                </div>
            </div>

            <div class="row-group">
                <div class="form-group">
                    <label>Veces por Día</label>
                    <input id="veces_dia" type="number" class="swal2-input" 
                        value="${proceso.veces_por_dia}" min="1" max="10">
                </div>

                <div class="form-group">
                    <label>Hora Sugerida</label>
                    <input id="hora_sugerida" type="time" class="swal2-input" 
                        value="${proceso.hora_sugerida || ''}">
                </div>
            </div>

            <div class="form-group">
                <label>Prioridad</label>
                <select id="prioridad" class="swal2-select">
                    <option value="1" ${proceso.prioridad === 1 ? 'selected' : ''}>Baja</option>
                    <option value="2" ${proceso.prioridad === 2 ? 'selected' : ''}>Media</option>
                    <option value="3" ${proceso.prioridad === 3 ? 'selected' : ''}>Alta</option>
                </select>
            </div>

            <script>
                function toggleDia(element, dia) {
                    const checkbox = document.getElementById(dia);
                    checkbox.checked = !checkbox.checked;
                    element.classList.toggle('selected', checkbox.checked);
                }

                function seleccionarTodos() {
                    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(dia => {
                        document.getElementById(dia).checked = true;
                        document.getElementById(dia).parentElement.classList.add('selected');
                    });
                }

                function seleccionarLaborales() {
                    limpiarSeleccion();
                    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
                        document.getElementById(dia).checked = true;
                        document.getElementById(dia).parentElement.classList.add('selected');
                    });
                }

                function seleccionarFinSemana() {
                    limpiarSeleccion();
                    ['sabado', 'domingo'].forEach(dia => {
                        document.getElementById(dia).checked = true;
                        document.getElementById(dia).parentElement.classList.add('selected');
                    });
                }

                function limpiarSeleccion() {
                    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].forEach(dia => {
                        document.getElementById(dia).checked = false;
                        document.getElementById(dia).parentElement.classList.remove('selected');
                    });
                }
            </script>
        `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Cambios',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745',
            preConfirm: () => {
                const periodicidad = (document.getElementById('periodicidad') as HTMLSelectElement).value;
                const tiempo_estimado = (document.getElementById('tiempo_estimado') as HTMLInputElement).value;
                const hora_sugerida = (document.getElementById('hora_sugerida') as HTMLInputElement).value;
                const prioridad = (document.getElementById('prioridad') as HTMLSelectElement).value;
                const veces_dia = (document.getElementById('veces_dia') as HTMLInputElement).value;

                if (!periodicidad) {
                    Swal.showValidationMessage('Debe seleccionar una periodicidad');
                    return false;
                }

                if (!tiempo_estimado || parseInt(tiempo_estimado) <= 0) {
                    Swal.showValidationMessage('Debe ingresar un tiempo estimado válido');
                    return false;
                }

                const diasSeleccionados = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
                    .filter(dia => (document.getElementById(dia) as HTMLInputElement).checked);

                if (diasSeleccionados.length === 0) {
                    Swal.showValidationMessage('Debe seleccionar al menos un día de la semana');
                    return false;
                }

                const datos: any = {
                    id: proceso.id,
                    id_periodicidad: parseInt(periodicidad),
                    tiempo_estimado_minutos: parseInt(tiempo_estimado),
                    hora_sugerida: hora_sugerida || null,
                    prioridad: parseInt(prioridad),
                    veces_por_dia: parseInt(veces_dia) || 1,
                    lunes: (document.getElementById('lunes') as HTMLInputElement).checked ? 1 : 0,
                    martes: (document.getElementById('martes') as HTMLInputElement).checked ? 1 : 0,
                    miercoles: (document.getElementById('miercoles') as HTMLInputElement).checked ? 1 : 0,
                    jueves: (document.getElementById('jueves') as HTMLInputElement).checked ? 1 : 0,
                    viernes: (document.getElementById('viernes') as HTMLInputElement).checked ? 1 : 0,
                    sabado: (document.getElementById('sabado') as HTMLInputElement).checked ? 1 : 0,
                    domingo: (document.getElementById('domingo') as HTMLInputElement).checked ? 1 : 0
                };

                return datos;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.actualizarProcesoLimpieza(result.value);
            }
        });
    }

    actualizarProcesoLimpieza(datos: any) {
        this.areasFisicasService.actualizarProcesoLimpieza(datos).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Proceso de limpieza actualizado correctamente', 'success');
                this.cargarProcesosLimpieza();
            },
            error: (error: any) => {
                console.error("Error al actualizar proceso", error);
                Swal.fire('Error', error.error?.error || 'No se pudo actualizar el proceso de limpieza', 'error');
            }
        });
    }

    inactivarProcesoLimpieza(proceso: any) {
        Swal.fire({
            title: '¿Inactivar proceso de limpieza?',
            text: `¿Está seguro de inactivar el proceso "${proceso.nombre_proceso}"? Podrá reactivarlo más tarde.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#6c757d',
            cancelButtonColor: '#dc3545',
            confirmButtonText: 'Sí, inactivar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.areasFisicasService.inactivarProcesoLimpieza(proceso.id).subscribe({
                    next: (response: any) => {
                        Swal.fire('Inactivado', 'El proceso ha sido inactivado correctamente', 'success');
                        this.cargarProcesosLimpieza();
                    },
                    error: (error: any) => {
                        console.error("Error al inactivar proceso", error);
                        Swal.fire('Error', 'No se pudo inactivar el proceso', 'error');
                    }
                });
            }
        });
    }
    // ========== MÉTODOS PARA ELEMENTOS FÍSICOS ==========

    cargarElementosFisicosAsignados() {
        this.areasFisicasService.obtenerElementosFisicosAsignados(this.id).subscribe({
            next: (response: any) => {
                this.elementosFisicosAsignados = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar elementos físicos", error);
            }
        });
    }

    cargarCondicionesElemento() {
        this.areasFisicasService.obtenerCondicionesElemento().subscribe({
            next: (response: any) => {
                this.condicionesElemento = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar condiciones", error);
            }
        });
    }

    abrirModalAsignarElementoFisico() {
        this.elementosFisicosService.obtenerDisponiblesParaArea(this.id).subscribe({
            next: (response: any) => {
                const elementosDisponibles = response.body || [];

                if (elementosDisponibles.length === 0) {
                    Swal.fire('Sin elementos disponibles', 'No hay elementos físicos disponibles para asignar a esta área', 'info');
                    return;
                }

                const hoy = new Date().toISOString().split('T')[0];

                // Definir la función en el window antes de crear el modal
                (window as any).actualizarLabel = function (select: any) {
                    const option = select.options[select.selectedIndex];
                    const unidad = option.getAttribute('data-unidad') || 'unidades';
                    const label = document.getElementById('label-cantidad');

                    if (select.value && label) {
                        label.innerHTML = 'Cantidad en ' + unidad + ' <span style="color: red;">*</span>';
                    } else if (label) {
                        label.innerHTML = 'Cantidad <span style="color: red;">*</span>';
                    }
                };

                Swal.fire({
                    title: 'Asignar Elemento Físico',
                    width: '500px',
                    html: `
                    <style>
                        .swal2-popup {
                            font-size: 14px !important;
                        }
                        .form-container {
                            text-align: left;
                            padding: 10px;
                        }
                        .form-group {
                            margin-bottom: 20px;
                        }
                        .form-label {
                            display: block;
                            margin-bottom: 8px;
                            font-weight: 600;
                            color: #495057;
                            font-size: 14px;
                        }
                        .form-control {
                            width: 100%;
                            padding: 8px 12px;
                            font-size: 14px;
                            line-height: 1.5;
                            color: #495057;
                            background-color: #fff;
                            border: 1px solid #ced4da;
                            border-radius: 4px;
                            transition: border-color 0.15s ease-in-out;
                        }
                        .form-control:focus {
                            color: #495057;
                            background-color: #fff;
                            border-color: #17a2b8;
                            outline: 0;
                            box-shadow: 0 0 0 0.2rem rgba(23, 162, 184, 0.25);
                        }
                        select.form-control {
                            height: 38px;
                        }
                        textarea.form-control {
                            resize: vertical;
                            min-height: 80px;
                        }
                        .required {
                            color: #dc3545;
                        }
                    </style>
                    
                    <div class="form-container">
                        <div class="form-group">
                            <label class="form-label">
                                Elemento Físico <span class="required">*</span>
                            </label>
                            <select id="elemento" class="form-control" onchange="window.actualizarLabel(this)">
                                <option value="">Seleccione un elemento</option>
                                ${elementosDisponibles.map((elem: any) => {
                        const unidad = elem.abreviatura || elem.unidad_medida || elem.unidad_texto || 'unidades';
                        return `<option value="${elem.id}" data-unidad="${unidad}">
                                        ${elem.nombre} ${elem.material ? '- ' + elem.material : ''}
                                    </option>`;
                    }).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label id="label-cantidad" class="form-label">
                                Cantidad <span class="required">*</span>
                            </label>
                            <input id="cantidad" type="number" class="form-control" 
                                value="1" min="1" placeholder="Ingrese la cantidad">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Condición</label>
                            <select id="condicion" class="form-control">
                                <option value="">Sin evaluar</option>
                                ${this.condicionesElemento.map((cond: any) =>
                        `<option value="${cond.id}">${cond.nombre}</option>`
                    ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Fecha de Inspección</label>
                            <input id="fecha_inspeccion" type="date" class="form-control" max="${hoy}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Observaciones</label>
                            <textarea id="observaciones" class="form-control" 
                                placeholder="Observaciones sobre el elemento..." 
                                rows="3"></textarea>
                        </div>
                    </div>
                `,
                    showCancelButton: true,
                    confirmButtonText: 'Asignar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#17a2b8',
                    cancelButtonColor: '#6c757d',
                    preConfirm: () => {
                        const elemento = (document.getElementById('elemento') as HTMLSelectElement).value;
                        const cantidad = (document.getElementById('cantidad') as HTMLInputElement).value;

                        if (!elemento) {
                            Swal.showValidationMessage('Debe seleccionar un elemento');
                            return false;
                        }

                        if (!cantidad || parseInt(cantidad) <= 0) {
                            Swal.showValidationMessage('La cantidad debe ser mayor a 0');
                            return false;
                        }

                        const condicion = (document.getElementById('condicion') as HTMLSelectElement).value;
                        const fecha = (document.getElementById('fecha_inspeccion') as HTMLInputElement).value;
                        const observaciones = (document.getElementById('observaciones') as HTMLTextAreaElement).value;

                        return {
                            id_elemento_fisico: parseInt(elemento),
                            id_area_fisica: this.model.id,
                            cantidad: parseInt(cantidad),
                            id_condicion: condicion ? parseInt(condicion) : null,
                            fecha_ultima_inspeccion: fecha || null,
                            observaciones: observaciones || null
                        };
                    }
                }).then((result) => {
                    if (result.isConfirmed) {
                        this.guardarAsignacionElemento(result.value);
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener elementos", error);
                Swal.fire('Error', 'No se pudieron cargar los elementos disponibles', 'error');
            }
        });
    }

    guardarAsignacionElemento(datos: any) {
        this.areasFisicasService.asignarElementoFisico(datos).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', response.mensaje || 'Elemento asignado correctamente', 'success');
                this.cargarElementosFisicosAsignados();
            },
            error: (error: any) => {
                console.error("Error al asignar elemento", error);
                Swal.fire('Error', error.error?.error || 'No se pudo asignar el elemento', 'error');
            }
        });
    }

    editarAsignacionElemento(elemento: any) {
        const hoy = new Date().toISOString().split('T')[0];

        // Obtener la unidad de medida del elemento
        const unidadMedida = elemento.abreviatura || elemento.unidad_medida || 'unidades';

        Swal.fire({
            title: 'Editar Asignación',
            width: '700px',
            html: `
            <style>
                .swal2-html-container { overflow: visible !important; }
                .form-group { margin-bottom: 15px; text-align: left; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #495057; }
                .swal2-input, .swal2-select, .swal2-textarea { 
                    width: 90% !important; 
                    margin: 10px auto !important; 
                }
                .info-box {
                    background-color: #f8f9fa;
                    padding: 10px;
                    margin-bottom: 15px;
                    border-radius: 5px;
                }
            </style>
            
            <div class="info-box">
                <strong>${elemento.nombre_elemento}</strong>
                ${elemento.material ? '<br>Material: ' + elemento.material : ''}
            </div>
            
            <div class="form-group">
                <label id="label-cantidad">
                    Cantidad en ${unidadMedida} <span style="color: red;">*</span>
                </label>
                <input id="cantidad" type="number" class="swal2-input" 
                    value="${elemento.cantidad}" min="1">
            </div>
            
            <div class="form-group">
                <label>Condición</label>
                <select id="condicion" class="swal2-select">
                    <option value="">Sin evaluar</option>
                    ${this.condicionesElemento.map((cond: any) =>
                `<option value="${cond.id}" ${cond.id === elemento.id_condicion ? 'selected' : ''}>
                            ${cond.nombre}
                        </option>`
            ).join('')}
                </select>
            </div>
            
            <div class="form-group">
                <label>Fecha de Inspección</label>
                <input id="fecha_inspeccion" type="date" class="swal2-input" 
                    value="${elemento.fecha_ultima_inspeccion || ''}" max="${hoy}">
            </div>
            
            <div class="form-group">
                <label>Observaciones</label>
                <textarea id="observaciones" class="swal2-textarea" 
                    placeholder="Observaciones sobre el elemento..." 
                    rows="3">${elemento.observaciones || ''}</textarea>
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#17a2b8',
            preConfirm: () => {
                const cantidad = (document.getElementById('cantidad') as HTMLInputElement).value;

                if (!cantidad || parseInt(cantidad) <= 0) {
                    Swal.showValidationMessage('La cantidad debe ser mayor a 0');
                    return false;
                }

                const condicion = (document.getElementById('condicion') as HTMLSelectElement).value;
                const fecha = (document.getElementById('fecha_inspeccion') as HTMLInputElement).value;
                const observaciones = (document.getElementById('observaciones') as HTMLTextAreaElement).value;

                return {
                    id: elemento.id,
                    cantidad: parseInt(cantidad),
                    id_condicion: condicion ? parseInt(condicion) : null,
                    fecha_ultima_inspeccion: fecha || null,
                    observaciones: observaciones || null
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.actualizarAsignacionElemento(result.value);
            }
        });
    }

    actualizarAsignacionElemento(datos: any) {
        this.areasFisicasService.actualizarAsignacionElemento(datos).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Asignación actualizada correctamente', 'success');
                this.cargarElementosFisicosAsignados();
            },
            error: (error: any) => {
                console.error("Error al actualizar", error);
                Swal.fire('Error', 'No se pudo actualizar la asignación', 'error');
            }
        });
    }

    eliminarAsignacionElemento(elemento: any) {
        Swal.fire({
            title: '¿Eliminar asignación?',
            text: `¿Está seguro de eliminar "${elemento.nombre_elemento}" de esta área?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.areasFisicasService.eliminarAsignacionElemento(elemento.id).subscribe({
                    next: (response: any) => {
                        Swal.fire('Eliminado', 'La asignación ha sido eliminada', 'success');
                        this.cargarElementosFisicosAsignados();
                    },
                    error: (error: any) => {
                        console.error("Error al eliminar", error);
                        Swal.fire('Error', 'No se pudo eliminar la asignación', 'error');
                    }
                });
            }
        });
    }

    calcularTotalElementos(): number {
        return this.elementosFisicosAsignados.reduce((total, elem) => total + (elem.cantidad || 0), 0);
    }

    obtenerResumenCondiciones(): any[] {
        const resumen: any = {};

        // Inicializar con todas las condiciones
        this.condicionesElemento.forEach(cond => {
            resumen[cond.nombre] = {
                nombre: cond.nombre,
                color: cond.color,
                cantidad: 0
            };
        });

        // Agregar "Sin evaluar"
        resumen['Sin evaluar'] = {
            nombre: 'Sin evaluar',
            color: '#6c757d',
            cantidad: 0
        };

        // Contar elementos por condición
        this.elementosFisicosAsignados.forEach(elem => {
            const condicion = elem.condicion_nombre || 'Sin evaluar';
            if (resumen[condicion]) {
                resumen[condicion].cantidad += elem.cantidad;
            }
        });

        return Object.values(resumen).filter((r: any) => r.cantidad > 0);
    }
}