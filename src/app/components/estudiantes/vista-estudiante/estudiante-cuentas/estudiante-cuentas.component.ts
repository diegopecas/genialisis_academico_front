import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { PagosRecibidosService } from '../../../../services/pagos-recibidos.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { ExportarPdfCuentasService, DatosCuentasPDF } from '../../../../services/exportar-pdf-cuentas.service';

@Component({
    selector: 'app-estudiante-cuentas',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estudiante-cuentas.component.html',
    styleUrl: './estudiante-cuentas.component.scss'
})
export class EstudianteCuentasComponent implements OnInit {
    @Input() idEstudiante: string = "0";

    // Propiedades básicas
    public estudiante: any;
    public datos: any[] = [];
    public datosPagos: any[] = [];
    public datosOriginales: any[] = [];

    // Año académico
    public anioAcademico: number = new Date().getFullYear();

    // Datos separados por año - Movimientos
    public datosAnioActual: any[] = [];
    public datosHistoricos: any[] = [];

    // Datos separados por año - Pagos
    public pagosAnioActual: any[] = [];
    public pagosHistoricos: any[] = [];

    // Sub-tabs
    public subTabMovimientos: 'actual' | 'historico' = 'actual';
    public subTabPagos: 'actual' | 'historico' = 'actual';

    // Variables para filtrar y buscar
    public searchTerm: string = '';

    // Variables para filtros múltiples
    public filtroEstados: string[] = [];
    public filtroCategorias: string[] = [];
    public filtroFechas: string[] = [];
    public filtroProductos: string[] = [];

    // Variables para mostrar/ocultar menús de filtro
    public mostrarFiltroEstados: boolean = false;
    public mostrarFiltroCategorias: boolean = false;
    public mostrarFiltroFechas: boolean = false;
    public mostrarFiltroProductos: boolean = false;

    // Búsqueda dentro de cada filtro
    public busquedaEstados: string = '';
    public busquedaCategorias: string = '';
    public busquedaFechas: string = '';
    public busquedaProductos: string = '';

    // Arrays para opciones disponibles en cada filtro
    public opcionesEstados: { valor: string, texto: string }[] = [
        { valor: 'pendiente', texto: 'Pendiente' },
        { valor: 'pagado', texto: 'Pagado' },
        { valor: 'vencido', texto: 'Vencido' }
    ];

    public opcionesCategorias: string[] = [];
    public opcionesFechas: string[] = [];
    public opcionesProductos: string[] = [];

    public datosFiltrados: any[] = [];
    public pagosFiltrados: any[] = [];

    // Selección de registros para exportar
    public registrosSeleccionados: Set<number> = new Set();
    public seleccionarTodosMovimientos: boolean = false;

    // Variables para paginación
    public paginacion = {
        paginaActual: 1,
        itemsPorPagina: 10
    };
    public paginacionPagos = {
        paginaActual: 1,
        itemsPorPagina: 10
    };
    public totalPaginas: number = 1;
    public totalPaginasPagos: number = 1;

    // Variables para totales
    public totalValorCobrado: number = 0;
    public totalValorCobradoAnio: number = 0;
    public totalValorPagado: number = 0;
    public totalSaldo: number = 0;
    public totalSaldoVencido: number = 0;
    public totalRecibido: number = 0;
    public totalAplicado: number = 0;
    public totalSaldoPagos: number = 0;

    // Control de UI
    public tabActiva: string = 'movimientos';
    public cargandoProductos: boolean = true;
    public cargandoPagos: boolean = true;

    // Variable para guardar el nombre completo del estudiante
    nombreCompleto: string = '';

    // Mapas para colores
    private categoriasColores: { [key: string]: string } = {
        'Académico': '#3498db',
        'Alimentación': '#e67e22',
        'Vestuario': '#9b59b6',
        'Transporte': '#1abc9c',
        'Actividades': '#f1c40f',
        'Matrícula': '#2ecc71',
        'Sanción': '#e74c3c'
    };
    // Variable para controlar la visibilidad del botón
    public mostrarBotonArriba: boolean = false;

    // Array completo de datos filtrados SIN paginación (para selección y exportación)
    private datosFiltradosCompletos: any[] = [];

    constructor(
        private estudiantesService: EstudiantesService,
        private cuentasPorCobrarService: CuentasPorCobrarService,
        private pagosRecibidosService: PagosRecibidosService,
        private institucionConfigService: InstitucionConfigService,
        private exportarPdfCuentasService: ExportarPdfCuentasService
    ) { }

    ngOnInit() {
        this.anioAcademico = this.institucionConfigService.getAnioAcademicoActual();

        if (this.idEstudiante && this.idEstudiante !== "0") {
            this.obtenerEstudiante(this.idEstudiante);
        }
        this.initScrollListener();
        console.log("ngOnInit", this.idEstudiante)
    }

    // Métodos para carga de datos
    obtenerEstudiante(id_estudiante: any) {
        this.estudiantesService.obtenerById(id_estudiante).subscribe({
            next: (response: any) => {
                const body = response.body as any[];
                this.estudiante = body[0];
                this.nombreCompleto = this.estudiante.nombre_completo
                console.log("obtenerEstudiante", this.estudiante)
                this.obtenerCuentasPorCobrar(this.estudiante?.id_persona);
                this.obtenerPagosRecibidos(this.idEstudiante);
            },
            error: (error: any) => {
                console.error('Error al obtener estudiante:', error);
                this.cargandoProductos = false;
                this.cargandoPagos = false;
            }
        });
    }

    obtenerCuentasPorCobrar(id_persona: any): void {
        this.cargandoProductos = true;

        this.cuentasPorCobrarService.obtenerTodosXPersona(id_persona).subscribe({
            next: (response: any) => {
                const body = response.body as any[];

                // Reiniciar totales
                this.totalValorCobrado = 0;
                this.totalValorCobradoAnio = 0;
                this.totalValorPagado = 0;
                this.totalSaldo = 0;
                this.totalSaldoVencido = 0;

                const fechaActual = new Date();
                const fechasUnicas = new Set<string>();

                this.datos = body.map(item => {
                    const fechaItem = new Date(item.fecha);
                    const vencido = fechaActual > fechaItem && item.saldo > 0;
                    const fechaFormateada = this.formatearFecha(item.fecha);
                    fechasUnicas.add(fechaFormateada);

                    // Totales globales
                    this.totalValorCobrado += Number(item.valor) || 0;
                    this.totalValorPagado += Number(item.valor_pagado) || 0;
                    this.totalSaldo += Number(item.saldo) || 0;

                    // Total cobrado del año académico
                    if (fechaItem.getFullYear() === this.anioAcademico) {
                        this.totalValorCobradoAnio += Number(item.valor) || 0;
                    }

                    if (vencido) {
                        this.totalSaldoVencido += Number(item.saldo) || 0;
                    }

                    return {
                        ...item,
                        vencido: vencido,
                        fechaFormateada: fechaFormateada
                    };
                });

                this.datosOriginales = [...this.datos];

                // Separar por año
                this.datosAnioActual = this.datosOriginales.filter(item => {
                    const anio = new Date(item.fecha).getFullYear();
                    return anio === this.anioAcademico;
                });

                this.datosHistoricos = this.datosOriginales.filter(item => {
                    const anio = new Date(item.fecha).getFullYear();
                    return anio < this.anioAcademico;
                });

                this.opcionesCategorias = this.obtenerCategorias();
                this.opcionesProductos = this.obtenerProductos();

                this.opcionesFechas = Array.from(fechasUnicas).sort((a, b) => {
                    const [diaA, mesA, anioA] = a.split('/').map(Number);
                    const [diaB, mesB, anioB] = b.split('/').map(Number);
                    if (anioA !== anioB) return anioA - anioB;
                    if (mesA !== mesB) return mesA - mesB;
                    return diaA - diaB;
                });

                this.filtrarDatos();
                this.cargandoProductos = false;
            },
            error: (error: any) => {
                console.error('Error al obtener cuentas por cobrar:', error);
                this.cargandoProductos = false;
            }
        });
    }

    formatearFecha(fecha: string): string {
        try {
            let date: Date;

            if (fecha.includes('T')) {
                const fechaParte = fecha.substring(0, 10);
                const [año, mes, dia] = fechaParte.split('-').map(Number);
                date = new Date(año, mes - 1, dia);
            } else if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [año, mes, dia] = fecha.split('-').map(Number);
                date = new Date(año, mes - 1, dia);
            } else {
                date = new Date(fecha);
                if (isNaN(date.getTime())) {
                    throw new Error('Fecha inválida');
                }
            }

            if (isNaN(date.getTime())) {
                console.warn(`Fecha inválida recibida: ${fecha}`);
                return fecha;
            }

            const dia = date.getDate().toString().padStart(2, '0');
            const mes = (date.getMonth() + 1).toString().padStart(2, '0');
            const anio = date.getFullYear();
            return `${dia}/${mes}/${anio}`;

        } catch (error) {
            console.error(`Error al formatear fecha ${fecha}:`, error);
            return fecha;
        }
    }

    obtenerPagosRecibidos(idEstudiante: any): void {
        this.cargandoPagos = true;

        this.pagosRecibidosService.obtenerByEstudiante(idEstudiante).subscribe({
            next: (response: any) => {
                const datos = response.body as any[];

                this.totalRecibido = 0;
                this.totalAplicado = 0;
                this.totalSaldoPagos = 0;

                this.datosPagos = datos.map(item => {
                    let estado = 'Registrado';
                    if (item.anulado === 1) {
                        estado = 'Anulado';
                    } else if (item.id_usuario_contable) {
                        estado = 'Contabilizado';
                    }

                    if (item.anulado !== 1) {
                        this.totalRecibido += Number(item.valor_recibido) || 0;
                        this.totalAplicado += Number(item.valor_aplicado_cuentas) || 0;
                        this.totalSaldoPagos += Number(item.saldo) || 0;
                    }

                    return {
                        ...item,
                        estado: estado
                    };
                });

                // Separar pagos por año
                this.pagosAnioActual = this.datosPagos.filter(item => {
                    const anio = new Date(item.fecha).getFullYear();
                    return anio === this.anioAcademico;
                });

                this.pagosHistoricos = this.datosPagos.filter(item => {
                    const anio = new Date(item.fecha).getFullYear();
                    return anio < this.anioAcademico;
                });

                this.filtrarPagos();
                this.cargandoPagos = false;
            },
            error: (error: any) => {
                console.error('Error al obtener pagos recibidos:', error);
                this.cargandoPagos = false;
            }
        });
    }

    // Obtener datos base según sub-tab activo
    private obtenerDatosBaseMovimientos(): any[] {
        return this.subTabMovimientos === 'actual' ? [...this.datosAnioActual] : [...this.datosHistoricos];
    }

    private obtenerDatosBasePagos(): any[] {
        return this.subTabPagos === 'actual' ? [...this.pagosAnioActual] : [...this.pagosHistoricos];
    }

    // Cambiar sub-tabs
    cambiarSubTabMovimientos(subTab: 'actual' | 'historico'): void {
        this.subTabMovimientos = subTab;
        this.paginacion.paginaActual = 1;
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    cambiarSubTabPagos(subTab: 'actual' | 'historico'): void {
        this.subTabPagos = subTab;
        this.paginacionPagos.paginaActual = 1;
        this.filtrarPagos();
    }

    // Obtener lista única de productos
    obtenerProductos(): string[] {
        const productos = new Set<string>();
        this.datos.forEach(item => {
            if (item.nombre_producto_servicio) {
                productos.add(item.nombre_producto_servicio);
            }
        });
        return Array.from(productos).sort();
    }

    // Aplicar filtros comunes a un conjunto de movimientos
    private aplicarFiltrosMovimientos(datos: any[]): any[] {
        let resultado = [...datos];

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const termino = this.searchTerm.toLowerCase();
            resultado = resultado.filter(item =>
                (item.nombre_producto_servicio || '').toLowerCase().includes(termino) ||
                (item.detalle || '').toLowerCase().includes(termino) ||
                (item.nombre_clasificacion || '').toLowerCase().includes(termino)
            );
        }

        if (this.filtroEstados.length > 0) {
            resultado = resultado.filter(item => {
                if (this.filtroEstados.includes('pendiente') && item.saldo > 0 && !item.vencido) {
                    return true;
                }
                if (this.filtroEstados.includes('pagado') && item.saldo <= 0) {
                    return true;
                }
                if (this.filtroEstados.includes('vencido') && item.vencido) {
                    return true;
                }
                return false;
            });
        }

        if (this.filtroCategorias.length > 0) {
            resultado = resultado.filter(item =>
                this.filtroCategorias.includes(item.nombre_clasificacion)
            );
        }

        if (this.filtroFechas.length > 0) {
            resultado = resultado.filter(item =>
                this.filtroFechas.includes(item.fechaFormateada)
            );
        }

        if (this.filtroProductos.length > 0) {
            resultado = resultado.filter(item =>
                this.filtroProductos.includes(item.nombre_producto_servicio)
            );
        }

        resultado.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        return resultado;
    }

    // Métodos para filtrado
    filtrarDatos(): void {
        let resultado = this.aplicarFiltrosMovimientos(this.obtenerDatosBaseMovimientos());

        this.datosFiltradosCompletos = [...resultado];
        this.datosFiltrados = [...resultado];

        this.totalPaginas = Math.ceil(this.datosFiltrados.length / this.paginacion.itemsPorPagina);

        if (this.paginacion.paginaActual > this.totalPaginas) {
            this.paginacion.paginaActual = 1;
        }

        this.aplicarPaginacion();
    }

    filtrarPagos(): void {
        let resultado = this.obtenerDatosBasePagos();

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const termino = this.searchTerm.toLowerCase();
            resultado = resultado.filter(item =>
                (item.nombre_acudiente || '').toLowerCase().includes(termino) ||
                (item.tipo_pago || '').toLowerCase().includes(termino) ||
                (item.referencia_bancaria || '').toLowerCase().includes(termino)
            );
        }

        resultado.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        this.pagosFiltrados = resultado;

        this.totalPaginasPagos = Math.ceil(this.pagosFiltrados.length / this.paginacionPagos.itemsPorPagina);

        if (this.paginacionPagos.paginaActual > this.totalPaginasPagos) {
            this.paginacionPagos.paginaActual = 1;
        }

        this.aplicarPaginacionPagos();
    }

    // Métodos para control de filtros múltiples
    toggleFiltroEstados(): void {
        this.mostrarFiltroEstados = !this.mostrarFiltroEstados;
        this.mostrarFiltroCategorias = false;
        this.mostrarFiltroFechas = false;
        this.mostrarFiltroProductos = false;
    }

    toggleFiltroCategorias(): void {
        this.mostrarFiltroCategorias = !this.mostrarFiltroCategorias;
        this.mostrarFiltroEstados = false;
        this.mostrarFiltroFechas = false;
        this.mostrarFiltroProductos = false;
    }

    toggleFiltroFechas(): void {
        this.mostrarFiltroFechas = !this.mostrarFiltroFechas;
        this.mostrarFiltroEstados = false;
        this.mostrarFiltroCategorias = false;
        this.mostrarFiltroProductos = false;
    }

    toggleFiltroProductos(): void {
        this.mostrarFiltroProductos = !this.mostrarFiltroProductos;
        this.mostrarFiltroEstados = false;
        this.mostrarFiltroCategorias = false;
        this.mostrarFiltroFechas = false;
    }

    toggleEstado(estado: string): void {
        const index = this.filtroEstados.indexOf(estado);
        if (index === -1) {
            this.filtroEstados.push(estado);
        } else {
            this.filtroEstados.splice(index, 1);
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    toggleCategoria(categoria: string): void {
        const index = this.filtroCategorias.indexOf(categoria);
        if (index === -1) {
            this.filtroCategorias.push(categoria);
        } else {
            this.filtroCategorias.splice(index, 1);
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    toggleFecha(fecha: string): void {
        const index = this.filtroFechas.indexOf(fecha);
        if (index === -1) {
            this.filtroFechas.push(fecha);
        } else {
            this.filtroFechas.splice(index, 1);
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    toggleProducto(producto: string): void {
        const index = this.filtroProductos.indexOf(producto);
        if (index === -1) {
            this.filtroProductos.push(producto);
        } else {
            this.filtroProductos.splice(index, 1);
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    seleccionarTodosEstados(seleccionado: boolean): void {
        if (seleccionado) {
            this.filtroEstados = this.obtenerOpcionesEstadosFiltradas().map(opcion => opcion.valor);
        } else {
            this.filtroEstados = [];
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    seleccionarTodasCategorias(seleccionado: boolean): void {
        if (seleccionado) {
            this.filtroCategorias = [...this.obtenerOpcionesCategoriasFiltradas()];
        } else {
            this.filtroCategorias = [];
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    seleccionarTodasFechas(seleccionado: boolean): void {
        if (seleccionado) {
            this.filtroFechas = [...this.obtenerOpcionesFechasFiltradas()];
        } else {
            this.filtroFechas = [];
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    seleccionarTodosProductos(seleccionado: boolean): void {
        if (seleccionado) {
            this.filtroProductos = [...this.obtenerOpcionesProductosFiltradas()];
        } else {
            this.filtroProductos = [];
        }
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    seleccionarTodosEstadosEvent(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        this.seleccionarTodosEstados(checkbox?.checked || false);
    }

    seleccionarTodasCategoriasEvent(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        this.seleccionarTodasCategorias(checkbox?.checked || false);
    }

    seleccionarTodasFechasEvent(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        this.seleccionarTodasFechas(checkbox?.checked || false);
    }

    seleccionarTodosProductosEvent(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        this.seleccionarTodosProductos(checkbox?.checked || false);
    }

    todasSeleccionadasEstados(): boolean {
        const opcionesFiltradas = this.obtenerOpcionesEstadosFiltradas();
        if (opcionesFiltradas.length === 0) return false;
        return opcionesFiltradas.every(opcion => this.filtroEstados.includes(opcion.valor));
    }

    todasSeleccionadasCategorias(): boolean {
        const opcionesFiltradas = this.obtenerOpcionesCategoriasFiltradas();
        if (opcionesFiltradas.length === 0) return false;
        return opcionesFiltradas.every(categoria => this.filtroCategorias.includes(categoria));
    }

    todasSeleccionadasFechas(): boolean {
        const opcionesFiltradas = this.obtenerOpcionesFechasFiltradas();
        if (opcionesFiltradas.length === 0) return false;
        return opcionesFiltradas.every(fecha => this.filtroFechas.includes(fecha));
    }

    todasSeleccionadasProductos(): boolean {
        const opcionesFiltradas = this.obtenerOpcionesProductosFiltradas();
        if (opcionesFiltradas.length === 0) return false;
        return opcionesFiltradas.every(producto => this.filtroProductos.includes(producto));
    }

    obtenerOpcionesEstadosFiltradas(): { valor: string, texto: string }[] {
        if (!this.busquedaEstados || this.busquedaEstados.trim() === '') {
            return this.opcionesEstados;
        }
        const busqueda = this.busquedaEstados.toLowerCase();
        return this.opcionesEstados.filter(opcion =>
            opcion.texto.toLowerCase().includes(busqueda));
    }

    obtenerOpcionesCategoriasFiltradas(): string[] {
        if (!this.busquedaCategorias || this.busquedaCategorias.trim() === '') {
            return this.opcionesCategorias;
        }
        const busqueda = this.busquedaCategorias.toLowerCase();
        return this.opcionesCategorias.filter(categoria =>
            categoria.toLowerCase().includes(busqueda));
    }

    obtenerOpcionesFechasFiltradas(): string[] {
        if (!this.busquedaFechas || this.busquedaFechas.trim() === '') {
            return this.opcionesFechas;
        }
        const busqueda = this.busquedaFechas.toLowerCase();
        return this.opcionesFechas.filter(fecha =>
            fecha.toLowerCase().includes(busqueda));
    }

    obtenerOpcionesProductosFiltradas(): string[] {
        if (!this.busquedaProductos || this.busquedaProductos.trim() === '') {
            return this.opcionesProductos;
        }
        const busqueda = this.busquedaProductos.toLowerCase();
        return this.opcionesProductos.filter(producto =>
            producto.toLowerCase().includes(busqueda));
    }

    limpiarFiltroEstados(): void {
        this.filtroEstados = [];
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    limpiarFiltroCategorias(): void {
        this.filtroCategorias = [];
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    limpiarFiltroFechas(): void {
        this.filtroFechas = [];
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    limpiarFiltroProductos(): void {
        this.filtroProductos = [];
        this.limpiarSeleccion();
        this.filtrarDatos();
    }

    obtenerTextoFiltroEstados(): string {
        if (this.filtroEstados.length === 0) {
            return 'Estado: Todos';
        } else if (this.filtroEstados.length === this.opcionesEstados.length) {
            return 'Estado: Todos';
        } else {
            return `Estado: ${this.filtroEstados.length} seleccionado(s)`;
        }
    }

    obtenerTextoFiltroCategorias(): string {
        if (this.filtroCategorias.length === 0) {
            return 'Categoría: Todas';
        } else if (this.filtroCategorias.length === this.opcionesCategorias.length) {
            return 'Categoría: Todas';
        } else {
            return `Categoría: ${this.filtroCategorias.length} seleccionada(s)`;
        }
    }

    obtenerTextoFiltroFechas(): string {
        if (this.filtroFechas.length === 0) {
            return 'Fecha: Todas';
        } else if (this.filtroFechas.length === this.opcionesFechas.length) {
            return 'Fecha: Todas';
        } else if (this.filtroFechas.length === 1) {
            return `Fecha: ${this.filtroFechas[0]}`;
        } else {
            return `Fecha: ${this.filtroFechas.length} seleccionada(s)`;
        }
    }

    obtenerTextoFiltroProductos(): string {
        if (this.filtroProductos.length === 0) {
            return 'Producto: Todos';
        } else if (this.filtroProductos.length === this.opcionesProductos.length) {
            return 'Producto: Todos';
        } else if (this.filtroProductos.length === 1) {
            return `Producto: ${this.filtroProductos[0]}`;
        } else {
            return `Producto: ${this.filtroProductos.length} seleccionado(s)`;
        }
    }

    estaSeleccionado(array: string[], valor: string): boolean {
        return array.includes(valor);
    }

    // Selección de registros (checkboxes)
    toggleSeleccionRegistro(item: any): void {
        const id = item.id_cuenta_cobrar || item.id;
        if (this.registrosSeleccionados.has(id)) {
            this.registrosSeleccionados.delete(id);
        } else {
            this.registrosSeleccionados.add(id);
        }
        this.actualizarEstadoSeleccionarTodos();
    }

    estaRegistroSeleccionado(item: any): boolean {
        const id = item.id_cuenta_cobrar || item.id;
        return this.registrosSeleccionados.has(id);
    }

    toggleSeleccionarTodosMovimientos(): void {
        if (this.seleccionarTodosMovimientos) {
            // Deseleccionar todos
            this.registrosSeleccionados.clear();
            this.seleccionarTodosMovimientos = false;
        } else {
            // Seleccionar todos los filtrados (no solo la página actual)
            this.datosFiltradosCompletos.forEach(item => {
                const id = item.id_cuenta_cobrar || item.id;
                this.registrosSeleccionados.add(id);
            });
            this.seleccionarTodosMovimientos = true;
        }
    }

    private actualizarEstadoSeleccionarTodos(): void {
        if (this.datosFiltradosCompletos.length === 0) {
            this.seleccionarTodosMovimientos = false;
            return;
        }
        this.seleccionarTodosMovimientos = this.datosFiltradosCompletos.every(item => {
            const id = item.id_cuenta_cobrar || item.id;
            return this.registrosSeleccionados.has(id);
        });
    }

    limpiarSeleccion(): void {
        this.registrosSeleccionados.clear();
        this.seleccionarTodosMovimientos = false;
    }

    obtenerTotalSeleccionados(): number {
        return this.registrosSeleccionados.size;
    }

    // Calcular totales de los registros seleccionados
    calcularTotalesSeleccionados(): { totalValor: number, totalPagado: number, totalSaldo: number } {
        let totalValor = 0;
        let totalPagado = 0;
        let totalSaldo = 0;

        this.datosFiltradosCompletos.forEach(item => {
            const id = item.id_cuenta_cobrar || item.id;
            if (this.registrosSeleccionados.has(id)) {
                totalValor += Number(item.valor) || 0;
                totalPagado += Number(item.valor_pagado) || 0;
                totalSaldo += Number(item.saldo) || 0;
            }
        });

        return { totalValor, totalPagado, totalSaldo };
    }

    // Paginación
    aplicarPaginacion(): void {
        const inicio = (this.paginacion.paginaActual - 1) * this.paginacion.itemsPorPagina;
        const fin = inicio + this.paginacion.itemsPorPagina;
        this.datosFiltrados = this.datosFiltradosCompletos.slice(inicio, fin);
    }

    aplicarPaginacionPagos(): void {
        const inicio = (this.paginacionPagos.paginaActual - 1) * this.paginacionPagos.itemsPorPagina;
        const fin = inicio + this.paginacionPagos.itemsPorPagina;
        const pagosCompletos = [...this.pagosFiltrados];
        this.pagosFiltrados = pagosCompletos.slice(inicio, fin);
    }

    cambiarPagina(nuevaPagina: number): void {
        this.paginacion.paginaActual = nuevaPagina;
        this.filtrarDatos();
    }

    cambiarPaginaPagos(nuevaPagina: number): void {
        this.paginacionPagos.paginaActual = nuevaPagina;
        this.filtrarPagos();
    }

    cambiarPaginacion(): void {
        this.paginacion.paginaActual = 1;
        this.filtrarDatos();
    }

    cambiarPaginacionPagos(): void {
        this.paginacionPagos.paginaActual = 1;
        this.filtrarPagos();
    }

    // Métodos de UI y navegación
    cambiarTab(tab: string): void {
        this.tabActiva = tab;
    }

    obtenerColorCategoria(categoria: string): string {
        return this.categoriasColores[categoria] || '#6c757d';
    }

    obtenerIniciales(texto: string): string {
        if (!texto) return '';
        return texto.split(' ')
            .map(palabra => palabra.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    esVencido(item: any): boolean {
        if (!item) return false;
        return item.vencido && item.saldo > 0;
    }

    // Métodos para los indicadores de resumen
    obtenerUltimoPago(): number {
        const ultimoPago = this.datosPagos
            .filter(pago => pago.anulado !== 1)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];
        return ultimoPago ? ultimoPago.valor_recibido : 0;
    }

    obtenerFechaUltimoPago(): string {
        const ultimoPago = this.datosPagos
            .filter(pago => pago.anulado !== 1)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

        if (!ultimoPago) return 'Sin pagos registrados';

        const fecha = new Date(ultimoPago.fecha);
        return `Realizado el ${fecha.toLocaleDateString()}`;
    }

    obtenerSaldoAFavor(): number {
        return this.datosPagos
            .filter(pago => pago.anulado !== 1 && pago.saldo > 0)
            .reduce((suma, pago) => suma + Number(pago.saldo), 0);
    }

    obtenerCategorias(): string[] {
        const categorias = new Set<string>();
        this.datos.forEach(item => {
            if (item.nombre_clasificacion) {
                categorias.add(item.nombre_clasificacion);
            }
        });
        return Array.from(categorias);
    }

    tienePendientePorAplicar(): boolean {
        return this.obtenerPendientePorAplicar() > 0;
    }

    obtenerPendientePorAplicar(): number {
        return this.totalSaldoPagos;
    }

    obtenerMensajePendientePorAplicar(): string {
        if (this.obtenerPendientePorAplicar() <= 0) {
            return 'No hay pagos pendientes por aplicar';
        }

        const pagosConSaldo = this.datosPagos.filter(pago =>
            pago.anulado !== 1 && pago.saldo > 0
        ).length;

        if (pagosConSaldo === 1) {
            return 'Hay 1 pago con saldo disponible para aplicar';
        } else {
            return `Hay ${pagosConSaldo} pagos con saldo disponible para aplicar`;
        }
    }

    // Totales filtrados (usa datos base según sub-tab)
    calcularTotalesFiltrados(): {
        totalValor: number,
        totalPagado: number,
        totalSaldo: number,
        totalRecibido?: number,
        totalAplicado?: number
    } {
        if (this.tabActiva === 'movimientos') {
            let resultado = this.aplicarFiltrosMovimientos(this.obtenerDatosBaseMovimientos());

            let totalValor = 0;
            let totalPagado = 0;
            let totalSaldo = 0;

            resultado.forEach(item => {
                totalValor += Number(item.valor) || 0;
                totalPagado += Number(item.valor_pagado) || 0;
                totalSaldo += Number(item.saldo) || 0;
            });

            return { totalValor, totalPagado, totalSaldo };
        } else {
            let resultado = this.obtenerDatosBasePagos();

            if (this.searchTerm && this.searchTerm.trim() !== '') {
                const termino = this.searchTerm.toLowerCase();
                resultado = resultado.filter(item =>
                    (item.nombre_acudiente || '').toLowerCase().includes(termino) ||
                    (item.tipo_pago || '').toLowerCase().includes(termino) ||
                    (item.referencia_bancaria || '').toLowerCase().includes(termino)
                );
            }

            let totalRecibido = 0;
            let totalAplicado = 0;
            let totalSaldo = 0;

            resultado.forEach(item => {
                if (item.estado !== 'Anulado') {
                    totalRecibido += Number(item.valor_recibido) || 0;
                    totalAplicado += Number(item.valor_aplicado_cuentas) || 0;
                    totalSaldo += Number(item.saldo) || 0;
                }
            });

            return {
                totalValor: totalRecibido,
                totalPagado: totalAplicado,
                totalSaldo,
                totalRecibido,
                totalAplicado
            };
        }
    }

    // Verifica si hay algún filtro activo en movimientos
    private hayFiltrosActivos(): boolean {
        return this.filtroEstados.length > 0 ||
            this.filtroCategorias.length > 0 ||
            this.filtroFechas.length > 0 ||
            this.filtroProductos.length > 0 ||
            (!!this.searchTerm && this.searchTerm.trim() !== '');
    }

    // Genera descripciones legibles de cada filtro para el PDF
    private generarDescripcionesFiltros(): string[] {
        const descripciones: string[] = [];

        if (this.filtroEstados.length > 0) {
            const nombres = this.filtroEstados.map(e => {
                const opcion = this.opcionesEstados.find(o => o.valor === e);
                return opcion ? opcion.texto : e;
            });
            descripciones.push(`Estado: solo ${nombres.join(', ').toLowerCase()}`);
        }

        if (this.filtroCategorias.length > 0) {
            if (this.filtroCategorias.length <= 3) {
                descripciones.push(`Categoría: ${this.filtroCategorias.join(', ')}`);
            } else {
                descripciones.push(`Categoría: ${this.filtroCategorias.length} de ${this.opcionesCategorias.length} seleccionadas`);
            }
        }

        if (this.filtroProductos.length > 0) {
            if (this.filtroProductos.length <= 3) {
                descripciones.push(`Producto: ${this.filtroProductos.join(', ')}`);
            } else {
                descripciones.push(`Producto: ${this.filtroProductos.length} de ${this.opcionesProductos.length} seleccionados`);
            }
        }

        if (this.filtroFechas.length > 0) {
            if (this.filtroFechas.length <= 3) {
                descripciones.push(`Fecha: ${this.filtroFechas.join(', ')}`);
            } else {
                descripciones.push(`Fecha: ${this.filtroFechas.length} de ${this.opcionesFechas.length} seleccionadas`);
            }
        }

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            descripciones.push(`Búsqueda: "${this.searchTerm}"`);
        }

        return descripciones;
    }

    // Exportar PDF
    async exportarPDF(): Promise<void> {
        try {
            const logoBase64 = await this.cargarLogoBase64();

            let movimientos = undefined;
            let movimientosHistoricosPendientes = undefined;
            let pagos = undefined;
            let pagosHistoricos = undefined;

            const haySeleccion = this.registrosSeleccionados.size > 0 && this.tabActiva === 'movimientos';
            const filtrosActivos = this.hayFiltrosActivos();

            if (this.tabActiva === 'movimientos') {
                if (haySeleccion) {
                    // Exportar solo los seleccionados
                    const seleccionados = this.datosFiltradosCompletos.filter(item => {
                        const id = item.id_cuenta_cobrar || item.id;
                        return this.registrosSeleccionados.has(id);
                    });
                    movimientos = this.prepararMovimientosParaPDF(seleccionados);
                } else if (filtrosActivos) {
                    // Exportar los datos filtrados del año actual
                    const filtradosAnioActual = this.aplicarFiltrosMovimientos(this.datosAnioActual);
                    movimientos = this.prepararMovimientosParaPDF(filtradosAnioActual);

                    // Históricos pendientes también filtrados
                    const filtradosHistoricos = this.aplicarFiltrosMovimientos(this.datosHistoricos);
                    const historicoPendiente = filtradosHistoricos.filter(item => item.saldo > 0);
                    if (historicoPendiente.length > 0) {
                        movimientosHistoricosPendientes = this.prepararMovimientosParaPDF(historicoPendiente);
                    }
                } else {
                    // Sin filtros: comportamiento original
                    movimientos = this.prepararMovimientosParaPDF(this.datosAnioActual);

                    const historicoPendiente = this.datosHistoricos.filter(item => item.saldo > 0);
                    if (historicoPendiente.length > 0) {
                        movimientosHistoricosPendientes = this.prepararMovimientosParaPDF(historicoPendiente);
                    }
                }
            } else {
                pagos = this.prepararPagosParaPDF(this.pagosAnioActual);

                if (this.pagosHistoricos.length > 0) {
                    pagosHistoricos = this.prepararPagosParaPDF(this.pagosHistoricos);
                }
            }

            const descripciones = this.generarDescripcionesFiltros();

            const datosPDF: DatosCuentasPDF = {
                nombreEstudiante: this.nombreCompleto || 'N/A',
                numeroIdentificacion: this.estudiante?.numero_identificacion,
                nombreGrupo: this.estudiante?.nombre_grupo,
                logoBase64: logoBase64,
                anioAcademico: this.anioAcademico,
                resumenFinanciero: {
                    saldoPendiente: this.totalSaldo,
                    valorPagado: this.totalValorPagado,
                    saldoVencido: this.totalSaldoVencido,
                    estado: this.totalSaldo <= 0 ? 'AL DÍA' : 'PENDIENTE'
                },
                tabActiva: this.tabActiva as 'movimientos' | 'pagos',
                movimientos: movimientos,
                movimientosHistoricosPendientes: movimientosHistoricosPendientes,
                pagos: pagos,
                pagosHistoricos: pagosHistoricos,
                filtrosAplicados: {
                    descripciones: descripciones,
                    seleccionManual: haySeleccion,
                    totalSeleccionados: haySeleccion ? this.registrosSeleccionados.size : undefined,
                    totalDisponibles: haySeleccion ? this.datosFiltradosCompletos.length : undefined
                }
            };

            this.exportarPdfCuentasService.generarPDF(datosPDF);
            console.log('PDF de cuentas generado exitosamente');
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            alert('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.');
        }
    }

    // Helpers para preparar datos de exportación
    private prepararMovimientosParaPDF(datos: any[]): any[] {
        let resultado = [...datos];
        resultado.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        return resultado.map((item, i) => ({
            id: i + 1,
            fecha: this.formatearFecha(item.fecha),
            concepto: item.nombre_producto_servicio || '-',
            valorTotal: this.parsearMoneda(this.formatearMoneda(item.valor || 0)),
            valorPagado: this.parsearMoneda(this.formatearMoneda(item.valor_pagado || 0)),
            saldo: this.parsearMoneda(this.formatearMoneda(item.saldo || 0)),
            estado: item.saldo <= 0 ? 'Pagado' : (item.vencido ? 'Vencido' : 'Pendiente')
        }));
    }

    private prepararPagosParaPDF(datos: any[]): any[] {
        let resultado = [...datos];
        resultado.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        return resultado.map((item, i) => ({
            id: i + 1,
            fecha: this.formatearFecha(item.fecha),
            acudiente: item.nombre_acudiente || '-',
            tipoPago: item.tipo_pago || '-',
            valorRecibido: this.parsearMoneda(this.formatearMoneda(item.valor_recibido || 0)),
            valorAplicado: this.parsearMoneda(this.formatearMoneda(item.valor_aplicado_cuentas || 0)),
            saldo: this.parsearMoneda(this.formatearMoneda(item.saldo || 0)),
            estado: item.estado || '-'
        }));
    }

    private async cargarLogoBase64(): Promise<string> {
        try {
            const logoUrl = this.institucionConfigService.getLogoUrl();
            const response = await fetch(logoUrl);
            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error al cargar el logo:', error);
            return '';
        }
    }

    private parsearMoneda(valor: string | number | undefined | null): number {
        if (valor === undefined || valor === null) {
            return 0;
        }
        
        if (typeof valor === 'number') {
            return valor;
        }
        
        let valorLimpio = valor.replace(/[$\s]/g, '');
        valorLimpio = valorLimpio.replace(/\./g, '');
        valorLimpio = valorLimpio.replace(/,/g, '.');
        
        const numero = parseFloat(valorLimpio);
        return isNaN(numero) ? 0 : numero;
    }

    // Datos para WhatsApp (usa datos base según sub-tab)
    obtenerDatosMovimientosFiltradorParaWhatsApp(): any[] {
        let movimientosFiltrados = this.aplicarFiltrosMovimientos(this.obtenerDatosBaseMovimientos());

        return movimientosFiltrados.map(item => ({
            fecha: this.formatearFecha(item.fecha),
            concepto: item.nombre_producto_servicio || '',
            saldo: item.saldo || 0,
            vencido: item.vencido
        }));
    }

    obtenerDatosPagosFiltradorParaWhatsApp(): any[] {
        let pagosFiltrados = this.obtenerDatosBasePagos();

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const termino = this.searchTerm.toLowerCase();
            pagosFiltrados = pagosFiltrados.filter(item =>
                (item.nombre_acudiente || '').toLowerCase().includes(termino) ||
                (item.tipo_pago || '').toLowerCase().includes(termino) ||
                (item.referencia_bancaria || '').toLowerCase().includes(termino)
            );
        }

        pagosFiltrados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        return pagosFiltrados.map(item => ({
            fecha: this.formatearFecha(item.fecha),
            tipoPago: item.tipo_pago || '',
            valorRecibido: item.valor_recibido || 0,
            estado: item.estado || ''
        }));
    }

    // Datos para exportar PDF (usa datos base según sub-tab)
    obtenerDatosMovimientosParaExportar(): any[] {
        let movimientosFiltrados = this.aplicarFiltrosMovimientos(this.obtenerDatosBaseMovimientos());

        return movimientosFiltrados.map((item, i) => ({
            id: (i + 1).toString(),
            fecha: this.formatearFecha(item.fecha),
            concepto: item.nombre_producto_servicio || '',
            detalle: item.detalle || 'N/A',
            valor: this.formatearMoneda(item.valor || 0),
            pagado: this.formatearMoneda(item.valor_pagado || 0),
            saldo: this.formatearMoneda(item.saldo || 0),
            estado: item.saldo <= 0 ? 'Pagado' : (item.vencido ? 'Vencido' : 'Pendiente')
        }));
    }

    obtenerDatosPagosParaExportar(): any[] {
        let pagosFiltrados = this.obtenerDatosBasePagos();

        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const termino = this.searchTerm.toLowerCase();
            pagosFiltrados = pagosFiltrados.filter(item =>
                (item.nombre_acudiente || '').toLowerCase().includes(termino) ||
                (item.tipo_pago || '').toLowerCase().includes(termino) ||
                (item.referencia_bancaria || '').toLowerCase().includes(termino)
            );
        }

        pagosFiltrados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        return pagosFiltrados.map((item, i) => ({
            id: (i + 1).toString(),
            fecha: this.formatearFecha(item.fecha),
            acudiente: item.nombre_acudiente || '',
            tipoPago: item.tipo_pago || '',
            referencia: item.referencia_bancaria || 'N/A',
            valorRecibido: this.formatearMoneda(item.valor_recibido || 0),
            aplicado: this.formatearMoneda(item.valor_aplicado_cuentas || 0),
            saldo: this.formatearMoneda(item.saldo || 0),
            estado: item.estado || ''
        }));
    }

    formatearMoneda(valor: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(valor);
    }

    // WhatsApp
    compartirPorWhatsApp(): void {
        let mensaje = `*Estado de Cuenta - ${this.institucionConfigService.getNombreInstitucion()}*\n`;
        mensaje += `📆 Fecha: ${new Date().toLocaleDateString('es-CO')}\n`;
        mensaje += `👨‍🎓 Estudiante: ${this.nombreCompleto}\n\n`;

        mensaje += `*Resumen Financiero*\n`;
        mensaje += `💰 Valor cobrado: ${this.formatearMoneda(this.totalValorCobrado)}\n`;
        mensaje += `💸 Valor pagado: ${this.formatearMoneda(this.totalValorPagado)}\n`;
        mensaje += `${this.totalSaldo > 0 ? '⚠️' : '✅'} Saldo pendiente: ${this.formatearMoneda(this.totalSaldo)}\n`;

        if (this.totalSaldoVencido > 0) {
            mensaje += `❗ Saldo vencido: ${this.formatearMoneda(this.totalSaldoVencido)}\n`;
        }

        if (this.tabActiva === 'movimientos') {
            // Pendientes de años anteriores
            const historicoPendiente = this.datosHistoricos.filter(item => item.saldo > 0);
            if (historicoPendiente.length > 0) {
                mensaje += `\n*⚠️ Movimientos pendientes de años anteriores:*\n`;
                const mostrar = historicoPendiente.slice(0, 10);
                mostrar.forEach(item => {
                    const icono = item.vencido ? '❗' : '⚠️';
                    mensaje += `${icono} ${this.formatearFecha(item.fecha)} - ${item.nombre_producto_servicio || ''}: ${this.formatearMoneda(item.saldo)}\n`;
                });
                if (historicoPendiente.length > 10) {
                    mensaje += `... y ${historicoPendiente.length - 10} más\n`;
                }
                const totalHistPendiente = historicoPendiente.reduce((sum, item) => sum + (Number(item.saldo) || 0), 0);
                mensaje += `*Saldo pendiente anterior: ${this.formatearMoneda(totalHistPendiente)}*\n`;
            }

            // Movimientos del año actual
            mensaje += `\n*📋 Movimientos del año ${this.anioAcademico}:*\n`;
            const movAnio = this.datosAnioActual.slice(0, 10);
            if (movAnio.length > 0) {
                movAnio.forEach(item => {
                    const icono = item.saldo <= 0 ? '✅' : (item.vencido ? '❗' : '⚠️');
                    mensaje += `${icono} ${this.formatearFecha(item.fecha)} - ${item.nombre_producto_servicio || ''}: ${this.formatearMoneda(item.saldo)}\n`;
                });
                if (this.datosAnioActual.length > 10) {
                    mensaje += `... y ${this.datosAnioActual.length - 10} más\n`;
                }
                const totalAnio = this.datosAnioActual.reduce((sum, item) => sum + (Number(item.saldo) || 0), 0);
                mensaje += `*Saldo año ${this.anioAcademico}: ${this.formatearMoneda(totalAnio)}*\n`;
            } else {
                mensaje += `No hay movimientos registrados.\n`;
            }
        } else {
            // Pagos de años anteriores
            if (this.pagosHistoricos.length > 0) {
                mensaje += `\n*📜 Pagos de años anteriores:*\n`;
                const mostrar = this.pagosHistoricos.slice(0, 10);
                mostrar.forEach(item => {
                    const icono = item.estado === 'Anulado' ? '❌' : (item.estado === 'Contabilizado' ? '✅' : '⏳');
                    mensaje += `${icono} ${this.formatearFecha(item.fecha)} - ${item.tipo_pago || ''}: ${this.formatearMoneda(item.valor_recibido)}\n`;
                });
                if (this.pagosHistoricos.length > 10) {
                    mensaje += `... y ${this.pagosHistoricos.length - 10} más\n`;
                }
            }

            // Pagos del año actual
            mensaje += `\n*📋 Pagos del año ${this.anioAcademico}:*\n`;
            const pagosAnio = this.pagosAnioActual.slice(0, 10);
            if (pagosAnio.length > 0) {
                pagosAnio.forEach(item => {
                    const icono = item.estado === 'Anulado' ? '❌' : (item.estado === 'Contabilizado' ? '✅' : '⏳');
                    mensaje += `${icono} ${this.formatearFecha(item.fecha)} - ${item.tipo_pago || ''}: ${this.formatearMoneda(item.valor_recibido)}\n`;
                });
                if (this.pagosAnioActual.length > 10) {
                    mensaje += `... y ${this.pagosAnioActual.length - 10} más\n`;
                }
            } else {
                mensaje += `No hay pagos registrados.\n`;
            }
        }

        mensaje += `\nEste mensaje ha sido generado automáticamente. Para más detalles, consulte con ${this.institucionConfigService.getNombreInstitucion()}.`;

        const mensajeCodificado = encodeURIComponent(mensaje);
        const urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`;
        window.open(urlWhatsApp, '_blank');
    }

    private initScrollListener(): void {
        window.addEventListener('scroll', this.checkScroll.bind(this));
    }

    private checkScroll(): void {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        this.mostrarBotonArriba = scrollPosition > 300;
    }

    public scrollToTop(): void {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    ngOnDestroy(): void {
        window.removeEventListener('scroll', this.checkScroll.bind(this));
    }
}