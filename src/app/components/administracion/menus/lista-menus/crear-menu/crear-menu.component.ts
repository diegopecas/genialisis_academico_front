import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { ItemsMenuService } from '../../../../../services/items-menu.service';
import { MenusService } from '../../../../../services/menus.service';
import { MenuMinutasService } from '../../../../../services/menu-minutas.service';
import { ProductosServiciosService } from '../../../../../services/productos-servicios.service';
import { ClasificacionMenusService } from '../../../../../services/clasificacion-menus.service';


interface MenuModel {
    id: string;
    nombre: string;
    descripcion: string;
    activo: number;
    id_clasificacion_menu: string | null;
}

interface ItemMenuAsignado {
    id?: string;
    id_item_menu: string;
    nombre_item?: string;
    nombre_porcion?: string;
    ingredientes_nombres?: string;
    es_opcional: boolean;
}

interface ProductoServicioAsignado {
    id?: string;
    id_producto_servicio: string;
    nombre_producto_servicio?: string;
    detalles?: string;
    valor_sugerido?: number;
    nombre_clasificacion?: string;
    nombre_categoria?: string;
    nombre_periodicidad?: string;
    nombre_horario_alimentacion?: string;
}

interface MinutaCelda {
    semana: number;
    dia: number;
    seleccionado: boolean;
    menuExistente?: string;
}

@Component({
    selector: 'app-crear-menu',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-menu.component.html',
    styleUrl: './crear-menu.component.scss'
})
export class CrearMenuComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de menú";
    public regresar = '/administracion/lista-menus';
    public tabActivo = 'datos-generales';

    public itemsAsignados: ItemMenuAsignado[] = [];
    public itemsDisponibles: any[] = [];

    // Productos y Servicios
    public productosAsignados: ProductoServicioAsignado[] = [];
    public productosDisponibles: any[] = [];

    // Catálogos
    public clasificacionesMenu: any[] = [];

    // Minuta
    public grillaMinuta: MinutaCelda[][] = [];
    public diasSemana = [
        { valor: 1, nombre: 'Lunes' },
        { valor: 2, nombre: 'Martes' },
        { valor: 3, nombre: 'Miércoles' },
        { valor: 4, nombre: 'Jueves' },
        { valor: 5, nombre: 'Viernes' },
        { valor: 6, nombre: 'Sábado' }
    ];
    public semanas = [1, 2, 3, 4, 5];
    public minutasAsignadas: any[] = [];
    public minutaCompleta: any[] = [];

    public model: MenuModel = {
        id: '',
        nombre: "",
        descripcion: "",
        activo: 1,
        id_clasificacion_menu: null
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private menusService: MenusService,
        private itemsMenuService: ItemsMenuService,
        private menuMinutasService: MenuMinutasService,
        private productosServiciosService: ProductosServiciosService,
        private clasificacionMenusService: ClasificacionMenusService
    ) { }

    ngOnInit(): void {
        this.inicializarGrilla();
        this.cargarCatalogos();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear menú";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar menú";
                    this.obtenerMenu(this.id);
                    this.cargarItemsDisponibles();
                    this.cargarProductosAsignados();
                    this.cargarProductosDisponibles();
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar menú";
                    this.obtenerMenu(this.id);
                    this.cargarProductosAsignados();
                    break;
            }
        });
    }

    // ==================== CATÁLOGOS ====================

    cargarCatalogos() {
        this.clasificacionMenusService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.clasificacionesMenu = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar clasificaciones de menú", error);
            }
        });
    }

    onClasificacionChange() {
        if (this.accion !== 'crear') {
            this.cargarMinutas();
        }
    }

    getNombreClasificacion(): string {
        if (!this.model.id_clasificacion_menu) return '';
        const clas = this.clasificacionesMenu.find(c => c.id == this.model.id_clasificacion_menu);
        return clas ? clas.nombre : '';
    }

    // ==================== MINUTA ====================

    inicializarGrilla() {
        this.grillaMinuta = [];
        for (const semana of this.semanas) {
            const fila: MinutaCelda[] = [];
            for (const dia of this.diasSemana) {
                fila.push({
                    semana: semana,
                    dia: dia.valor,
                    seleccionado: false,
                    menuExistente: undefined
                });
            }
            this.grillaMinuta.push(fila);
        }
    }

    cargarMinutas() {
        if (!this.model.id_clasificacion_menu) {
            this.inicializarGrilla();
            return;
        }

        forkJoin({
            porMenu: this.menuMinutasService.obtenerPorMenu(this.id),
            completa: this.menuMinutasService.obtenerMinutaCompleta(this.model.id_clasificacion_menu)
        }).subscribe({
            next: (responses: any) => {
                this.minutasAsignadas = responses.porMenu.body || [];
                this.minutaCompleta = responses.completa.body || [];
                this.actualizarGrilla();
            },
            error: (error: any) => {
                console.error("Error al cargar minutas", error);
            }
        });
    }

    actualizarGrilla() {
        this.inicializarGrilla();

        const idMenuActual = this.id;

        for (const minuta of this.minutasAsignadas) {
            const indiceSemana = Number(minuta.semana) - 1;
            const indiceDia = Number(minuta.dia) - 1;

            if (this.grillaMinuta[indiceSemana] && this.grillaMinuta[indiceSemana][indiceDia]) {
                this.grillaMinuta[indiceSemana][indiceDia].seleccionado = true;
            }
        }

        for (const minuta of this.minutaCompleta) {
            const indiceSemana = Number(minuta.semana) - 1;
            const indiceDia = Number(minuta.dia) - 1;

            if (minuta.id_menu !== idMenuActual) {
                const celda = this.grillaMinuta[indiceSemana]?.[indiceDia];
                if (celda && !celda.seleccionado) {
                    celda.menuExistente = minuta.nombre_menu;
                }
            }
        }
    }

    toggleMinuta(celda: MinutaCelda) {
        if (!this.editable) return;

        if (!celda.seleccionado && celda.menuExistente) {
            const nombreDia = this.diasSemana.find(d => d.valor === celda.dia)?.nombre;

            Swal.fire({
                title: 'Menú ya asignado',
                html: `La <strong>Semana ${celda.semana} - ${nombreDia}</strong> ya tiene asignado el menú:<br><br>
                       <span class="badge bg-warning text-dark" style="font-size: 1rem;">${celda.menuExistente}</span><br><br>
                       ¿Desea reemplazarlo con el menú actual?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff9800',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, reemplazar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    celda.seleccionado = true;
                    celda.menuExistente = undefined;
                    this.guardarMinutas();
                }
            });
        } else {
            celda.seleccionado = !celda.seleccionado;
            if (!celda.seleccionado) {
                celda.menuExistente = undefined;
            }
            this.guardarMinutas();
        }
    }

    guardarMinutas() {
        const minutasData: any[] = [];

        for (const fila of this.grillaMinuta) {
            for (const celda of fila) {
                if (celda.seleccionado) {
                    minutasData.push({
                        semana: celda.semana,
                        dia: celda.dia
                    });
                }
            }
        }

        this.menuMinutasService.asignar(this.model.id, minutasData).subscribe({
            next: (response: any) => {
                if (response.conflictos && response.conflictos.length > 0) {
                    const conflictosHtml = response.conflictos.map((c: any) => {
                        const nombreDia = this.diasSemana.find(d => d.valor === c.dia)?.nombre;
                        return `Semana ${c.semana} - ${nombreDia}: <strong>${c.menu_existente}</strong>`;
                    }).join('<br>');

                    Swal.fire({
                        title: 'Minutas actualizadas',
                        html: `Se actualizaron las minutas correctamente.<br><br>
                               <small class="text-muted">Se reemplazaron los siguientes menús:</small><br>
                               ${conflictosHtml}`,
                        icon: 'success'
                    });
                } else {
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Minutas actualizadas correctamente',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }

                this.cargarMinutas();
            },
            error: (error: any) => {
                console.error("Error al guardar minutas", error);
                Swal.fire('Error', 'No se pudieron actualizar las minutas', 'error');
            }
        });
    }

    contarMinutasAsignadas(): number {
        let count = 0;
        for (const fila of this.grillaMinuta) {
            for (const celda of fila) {
                if (celda.seleccionado) count++;
            }
        }
        return count;
    }

    seleccionarSemana(indiceSemana: number) {
        if (!this.editable) return;
        const fila = this.grillaMinuta[indiceSemana];
        const todosSeleccionados = fila.every(c => c.seleccionado);

        for (const celda of fila) {
            celda.seleccionado = !todosSeleccionados;
        }
        this.guardarMinutas();
    }

    seleccionarDia(indiceDia: number) {
        if (!this.editable) return;
        const todosSeleccionados = this.grillaMinuta.every(fila => fila[indiceDia].seleccionado);

        for (const fila of this.grillaMinuta) {
            fila[indiceDia].seleccionado = !todosSeleccionados;
        }
        this.guardarMinutas();
    }

    // ==================== ITEMS ====================

    obtenerMenu(id: any) {
        if (id && id !== "0") {
            this.menusService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const menu = response.body;
                    if (menu) {
                        this.model.id = menu.id;
                        this.model.nombre = menu.nombre || '';
                        this.model.descripcion = menu.descripcion || '';
                        this.model.activo = menu.activo || 1;
                        this.model.id_clasificacion_menu = menu.id_clasificacion_menu || null;

                        if (this.accion === 'editar') {
                            this.titulo = `Editar menú: ${menu.nombre}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar menú: ${menu.nombre}`;
                        }

                        if (menu.items) {
                            this.itemsAsignados = menu.items;
                        } else {
                            this.cargarItemsAsignados();
                        }

                        // Cargar minutas después de tener la clasificación
                        this.cargarMinutas();
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener menú", error);
                    Swal.fire('Error', 'Error al cargar los datos del menú', 'error');
                }
            });
        }
    }

    cargarItemsDisponibles() {
        this.itemsMenuService.obtenerItemsDisponiblesParaMenu(this.id).subscribe({
            next: (response: any) => {
                this.itemsDisponibles = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar items disponibles", error);
            }
        });
    }

    cargarItemsAsignados() {
        this.menusService.obtenerItemsPorMenu(this.id).subscribe({
            next: (response: any) => {
                const items = response.body || [];
                
                items.forEach((item: any) => {
                    this.itemsMenuService.obtenerById(item.id_item_menu).subscribe({
                        next: (itemResponse: any) => {
                            const itemDetalle = itemResponse.body;
                            
                            const index = this.itemsAsignados.findIndex(i => i.id_item_menu === item.id_item_menu);
                            if (index !== -1) {
                                if (itemDetalle.ingredientes) {
                                    const ingredientesNombres = itemDetalle.ingredientes
                                        .map((ing: any) => ing.nombre_producto)
                                        .join(', ');
                                    this.itemsAsignados[index].ingredientes_nombres = ingredientesNombres;
                                }
                            }
                        }
                    });
                });
                
                this.itemsAsignados = items;
            },
            error: (error: any) => {
                console.error("Error al cargar items asignados", error);
            }
        });
    }

    abrirModalAsignarItem() {
        this.cargarItemsDisponibles();
        
        setTimeout(() => {
            if (this.itemsDisponibles.length === 0) {
                Swal.fire(
                    'Sin ítems disponibles',
                    'No hay ítems de menú disponibles para agregar. Puede crear nuevos ítems desde el módulo de Ítems de Menú.',
                    'info'
                );
                return;
            }

            let itemsSeleccionados: any[] = [];

            Swal.fire({
                title: 'Agregar Ítems al Menú',
                width: '900px',
                html: `
                    <div class="search-container">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" id="buscar-item" class="form-control" 
                                placeholder="Buscar ítem...">
                        </div>
                    </div>

                    <div class="items-list" id="items-list">
                        ${this.itemsDisponibles.map((item: any) => `
                            <div class="item-card" data-id="${item.id}" data-nombre="${item.nombre.toLowerCase()}">
                                <div class="item-header">
                                    <input type="checkbox" id="item-${item.id}" value="${item.id}" 
                                        data-nombre="${item.nombre}"
                                        data-porcion="${item.nombre_porcion || ''}"
                                        data-ingredientes="${item.ingredientes_nombres || ''}">
                                    <label for="item-${item.id}" class="item-name">${item.nombre}</label>
                                    <span class="badge bg-info">${item.nombre_porcion || 'Sin porción'}</span>
                                </div>
                                <div class="item-details">
                                    ${item.ingredientes_nombres ? 
                                        `<span class="ingredientes-text">Ingredientes: ${item.ingredientes_nombres}</span>` : 
                                        '<span class="ingredientes-text">Sin ingredientes</span>'
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="item-options">
                        <div class="form-check">
                            <input type="checkbox" id="marcar-opcionales" class="form-check-input">
                            <label for="marcar-opcionales" class="form-check-label">
                                Marcar todos los ítems como opcionales en este menú
                            </label>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Agregar Seleccionados',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                didOpen: () => {
                    const buscador = document.getElementById('buscar-item') as HTMLInputElement;
                    const itemsList = document.getElementById('items-list');
                    
                    if (buscador && itemsList) {
                        buscador.addEventListener('input', (e: any) => {
                            const filtro = e.target.value.toLowerCase();
                            const cards = itemsList.querySelectorAll('.item-card');
                            
                            cards.forEach((card: any) => {
                                const nombre = card.dataset.nombre || '';
                                if (nombre.includes(filtro)) {
                                    card.style.display = '';
                                } else {
                                    card.style.display = 'none';
                                }
                            });
                        });

                        buscador.focus();
                    }

                    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="item-"]');
                    checkboxes.forEach(checkbox => {
                        checkbox.addEventListener('change', (e: any) => {
                            const card = (e.target as HTMLElement).closest('.item-card');
                            if (e.target.checked) {
                                card?.classList.add('selected');
                            } else {
                                card?.classList.remove('selected');
                            }
                        });
                    });
                },
                preConfirm: () => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="item-"]:checked') as NodeListOf<HTMLInputElement>;
                    const marcarOpcionales = (document.getElementById('marcar-opcionales') as HTMLInputElement)?.checked;

                    if (checkboxes.length === 0) {
                        Swal.showValidationMessage('Debe seleccionar al menos un ítem');
                        return false;
                    }

                    itemsSeleccionados = Array.from(checkboxes).map(cb => {
                        const item = this.itemsDisponibles.find(i => i.id == cb.value);
                        return {
                            id_item_menu: parseInt(cb.value),
                            es_opcional: marcarOpcionales ? 1 : 0,
                            nombre_item: item?.nombre,
                            nombre_porcion: item?.nombre_porcion,
                            ingredientes_nombres: item?.ingredientes_nombres
                        };
                    });

                    return itemsSeleccionados;
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this.procesarAsignacionItems(result.value);
                }
            });
        }, 500);
    }

    procesarAsignacionItems(items: any[]) {
        items.forEach(item => {
            if (!this.itemsAsignados.find(i => i.id_item_menu === item.id_item_menu)) {
                this.itemsAsignados.push(item);
            }
        });

        this.actualizarItems();
    }

    toggleOpcional(item: ItemMenuAsignado) {
        item.es_opcional = !item.es_opcional;
        this.actualizarItems();
    }

    eliminarItem(item: ItemMenuAsignado) {
        Swal.fire({
            title: '¿Eliminar ítem?',
            text: `¿Está seguro de eliminar "${item.nombre_item}" del menú?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.itemsAsignados = this.itemsAsignados.filter(
                    i => i.id_item_menu !== item.id_item_menu
                );
                this.actualizarItems();
            }
        });
    }

    actualizarItems() {
        const itemsData = this.itemsAsignados.map(i => ({
            id_item_menu: i.id_item_menu,
            es_opcional: i.es_opcional ? 1 : 0
        }));

        this.menusService.asignarItems(this.model.id, itemsData).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Ítems actualizados correctamente', 'success');
                this.cargarItemsAsignados();
                this.cargarItemsDisponibles();
            },
            error: (error: any) => {
                console.error("Error al actualizar items", error);
                Swal.fire('Error', 'No se pudieron actualizar los ítems', 'error');
            }
        });
    }

    // ==================== PRODUCTOS Y SERVICIOS ====================

    cargarProductosDisponibles() {
        this.productosServiciosService.obtenerPorClasificacion(3).subscribe({
            next: (response: any) => {
                this.productosDisponibles = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar productos disponibles", error);
            }
        });
    }

    cargarProductosAsignados() {
        this.menusService.obtenerProductosServiciosPorMenu(this.id).subscribe({
            next: (response: any) => {
                this.productosAsignados = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar productos asignados", error);
            }
        });
    }

    abrirModalAsignarProducto() {
        this.cargarProductosDisponibles();

        setTimeout(() => {
            const idsAsignados = this.productosAsignados.map(p => p.id_producto_servicio);
            const disponiblesFiltrados = this.productosDisponibles.filter(
                p => !idsAsignados.includes(p.id)
            );

            if (disponiblesFiltrados.length === 0) {
                Swal.fire(
                    'Sin productos disponibles',
                    'No hay productos de alimentación disponibles para agregar, o ya se encuentran todos asignados.',
                    'info'
                );
                return;
            }

            Swal.fire({
                title: 'Agregar Productos al Menú',
                width: '900px',
                html: `
                    <div class="search-container">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" id="buscar-producto" class="form-control" 
                                placeholder="Buscar producto...">
                        </div>
                    </div>

                    <div class="items-list" id="productos-list">
                        ${disponiblesFiltrados.map((prod: any) => `
                            <div class="item-card" data-id="${prod.id}" data-nombre="${prod.nombre.toLowerCase()}">
                                <div class="item-header">
                                    <input type="checkbox" id="prod-${prod.id}" value="${prod.id}">
                                    <label for="prod-${prod.id}" class="item-name">${prod.nombre}</label>
                                    ${prod.nombre_categoria ? 
                                        `<span class="badge bg-secondary">${prod.nombre_categoria}</span>` : ''}
                                </div>
                                <div class="item-details">
                                    ${prod.detalles ? 
                                        `<span class="ingredientes-text">${prod.detalles}</span>` : ''}
                                    ${prod.valor_sugerido ? 
                                        `<span class="ingredientes-text">Valor sugerido: $${Number(prod.valor_sugerido).toLocaleString()}</span>` : ''}
                                    ${prod.nombre_horario_alimentacion ? 
                                        `<span class="ingredientes-text">Horario: ${prod.nombre_horario_alimentacion}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Agregar Seleccionados',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                didOpen: () => {
                    const buscador = document.getElementById('buscar-producto') as HTMLInputElement;
                    const productosList = document.getElementById('productos-list');

                    if (buscador && productosList) {
                        buscador.addEventListener('input', (e: any) => {
                            const filtro = e.target.value.toLowerCase();
                            const cards = productosList.querySelectorAll('.item-card');

                            cards.forEach((card: any) => {
                                const nombre = card.dataset.nombre || '';
                                if (nombre.includes(filtro)) {
                                    card.style.display = '';
                                } else {
                                    card.style.display = 'none';
                                }
                            });
                        });

                        buscador.focus();
                    }

                    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="prod-"]');
                    checkboxes.forEach(checkbox => {
                        checkbox.addEventListener('change', (e: any) => {
                            const card = (e.target as HTMLElement).closest('.item-card');
                            if (e.target.checked) {
                                card?.classList.add('selected');
                            } else {
                                card?.classList.remove('selected');
                            }
                        });
                    });
                },
                preConfirm: () => {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="prod-"]:checked') as NodeListOf<HTMLInputElement>;

                    if (checkboxes.length === 0) {
                        Swal.showValidationMessage('Debe seleccionar al menos un producto');
                        return false;
                    }

                    return Array.from(checkboxes).map(cb => {
                        const prod = disponiblesFiltrados.find((p: any) => p.id == cb.value);
                        return {
                            id_producto_servicio: parseInt(cb.value),
                            nombre_producto_servicio: prod?.nombre,
                            detalles: prod?.detalles,
                            valor_sugerido: prod?.valor_sugerido,
                            nombre_categoria: prod?.nombre_categoria,
                            nombre_periodicidad: prod?.nombre_periodicidad,
                            nombre_horario_alimentacion: prod?.nombre_horario_alimentacion
                        };
                    });
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this.procesarAsignacionProductos(result.value);
                }
            });
        }, 500);
    }

    procesarAsignacionProductos(productos: any[]) {
        productos.forEach(prod => {
            if (!this.productosAsignados.find(p => p.id_producto_servicio === prod.id_producto_servicio)) {
                this.productosAsignados.push(prod);
            }
        });

        this.actualizarProductos();
    }

    eliminarProducto(producto: ProductoServicioAsignado) {
        Swal.fire({
            title: '¿Eliminar producto?',
            text: `¿Está seguro de eliminar "${producto.nombre_producto_servicio}" del menú?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.productosAsignados = this.productosAsignados.filter(
                    p => p.id_producto_servicio !== producto.id_producto_servicio
                );
                this.actualizarProductos();
            }
        });
    }

    actualizarProductos() {
        const productosData = this.productosAsignados.map(p => ({
            id_producto_servicio: p.id_producto_servicio
        }));

        this.menusService.asignarProductosServicios(this.model.id, productosData).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Productos actualizados correctamente', 'success');
                this.cargarProductosAsignados();
                this.cargarProductosDisponibles();
            },
            error: (error: any) => {
                console.error("Error al actualizar productos", error);
                Swal.fire('Error', 'No se pudieron actualizar los productos', 'error');
            }
        });
    }

    // ==================== AUXILIARES ====================

    contarItemsObligatorios(): number {
        return this.itemsAsignados.filter(i => !i.es_opcional).length;
    }

    contarItemsOpcionales(): number {
        return this.itemsAsignados.filter(i => i.es_opcional).length;
    }

    truncarTexto(texto: string, longitud: number): string {
        if (!texto) return '-';
        if (texto.length <= longitud) return texto;
        return texto.substring(0, longitud) + '...';
    }

    guardarMenu() {
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

        const menuData = this.prepararDatos();

        if (this.accion === 'crear') {
            this.menusService.crear(menuData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Menú creado correctamente', 'success')
                        .then(() => {
                            if (response.id) {
                                this.router.navigate(['/administracion/lista-menus/editar', response.id]);
                            } else {
                                this.volver();
                            }
                        });
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el menú', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.menusService.actualizar(menuData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Menú actualizado correctamente', 'success');
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el menú', 'error');
                }
            });
        }
    }

    prepararDatos() {
        return {
            id: this.model.id || 0,
            nombre: this.model.nombre,
            descripcion: this.model.descripcion,
            activo: this.model.activo,
            id_clasificacion_menu: this.model.id_clasificacion_menu
        };
    }

    formularioValido(): boolean {
        return Boolean(this.model.nombre) && Boolean(this.model.id_clasificacion_menu);
    }

    volver(): void {
        this.router.navigate(['/administracion/lista-menus']);
    }
}