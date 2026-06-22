import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProductosService } from '../../../../services/productos.service';
import { ProductosLimpiezaService } from '../../../../services/productos-limpieza.service';
import { TiposProductosLimpiezaService } from '../../../../services/tipos-productos-limpieza.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ExportarPdfFichaTecnicaService } from '../../../../services/exportar-pdf-ficha-tecnica.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { ViewChild, ElementRef } from '@angular/core';
import { lastValueFrom } from 'rxjs';
interface ProductoLimpiezaModel {
    id: string;
    idProducto: string | string;
    nombreProducto?: string;
    idTipoProductoLimpieza: string | string;
    componentes: string;
    modoUso: string;
}
declare var ClassicEditor: any;
@Component({
    selector: 'app-crear-producto-limpieza',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-producto-limpieza.component.html',
    styleUrl: './crear-producto-limpieza.component.scss'
})
export class CrearProductoLimpiezaComponent implements OnInit {
    private editorComponentes: any = null;
    public caracteresRestantesComponentes = 3000;
    private maxCaracteresComponentes = 3000;
    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de producto de limpieza";
    public regresar = '/administracion/productos-limpieza';

    public listas = {
        productos: [] as any[],
        tiposProductoLimpieza: [] as any[]
    }

    @ViewChild('componentesTextarea') componentesTextarea!: ElementRef;
    public imagenProducto: string = '/assets/images/producto.png';
    public datosProductoCompleto: any = null;

    public model: ProductoLimpiezaModel = {
        id: '',
        idProducto: "",
        nombreProducto: "",
        idTipoProductoLimpieza: "",
        componentes: "",  // CAMBIADO de concentracion a componentes
        modoUso: ""
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productosLimpiezaService: ProductosLimpiezaService,
        private tiposProductosLimpiezaService: TiposProductosLimpiezaService,
        private productosService: ProductosService,
        private sanitizer: DomSanitizer,  // AGREGADO
        private exportarPdfService: ExportarPdfFichaTecnicaService,  // AGREGADO
        private institucionConfigService: InstitucionConfigService
    ) { }

    ngOnInit(): void {
        this.cargarTiposProductoLimpieza();

        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear producto de limpieza";
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar producto de limpieza";
                    this.obtenerProductoLimpieza(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar producto de limpieza";
                    this.obtenerProductoLimpieza(this.id);
                    break;
            }
        });
    }
    ngAfterViewInit() {
        // Solo inicializar en crear, en editar/consultar se hace después de cargar datos
        if (this.accion === 'crear') {
            setTimeout(() => {
                this.initializeEditor();
            }, 100);
        }
    }
    ngOnDestroy() {
        // Destruir el editor al salir del componente
        if (this.editorComponentes) {
            this.editorComponentes.destroy()
                .then(() => console.log('Editor componentes destruido correctamente'))
                .catch((error: any) => console.error('Error destruyendo el editor:', error));
        }
    }
    initializeEditor() {
        // Verificar si ClassicEditor está disponible
        if (typeof ClassicEditor === 'undefined') {
            console.warn('CKEditor no está cargado aún, reintentando...');
            setTimeout(() => this.initializeEditor(), 1000);
            return;
        }

        const editorElement = document.querySelector('#editor-componentes');
        if (!editorElement) {
            console.warn('Elemento del editor no encontrado, reintentando...');
            setTimeout(() => this.initializeEditor(), 500);
            return;
        }

        ClassicEditor
            .create(editorElement, {
                toolbar: {
                    items: [
                        'heading', '|',
                        'bold', 'italic', 'underline', '|',
                        'bulletedList', 'numberedList', '|',
                        'outdent', 'indent', '|',
                        'undo', 'redo'
                    ]
                },
                language: 'es',
                placeholder: 'Ingrese los componentes del producto de limpieza...',
            })
            .then((editor: any) => {
                this.editorComponentes = editor;

                console.log('Editor componentes inicializado correctamente');

                // Establecer el contenido inicial si existe
                if (this.model.componentes) {
                    editor.setData(this.model.componentes);
                    this.actualizarContadorCaracteres();
                }

                // Deshabilitar si es solo consulta
                if (!this.editable) {
                    editor.enableReadOnlyMode('readonly');
                }

                // Escuchar cambios
                editor.model.document.on('change:data', () => {
                    const data = editor.getData();
                    this.model.componentes = data;
                    this.actualizarContadorCaracteres();
                });
            })
            .catch((error: any) => {
                console.error('Error al inicializar CKEditor:', error);
            });
    }
    // Método para actualizar contador de caracteres
    actualizarContadorCaracteres() {
        const text = this.stripHtml(this.model.componentes);
        this.caracteresRestantesComponentes = this.maxCaracteresComponentes - text.length;

        if (this.caracteresRestantesComponentes < 0) {
            Swal.fire({
                title: 'Límite de caracteres',
                text: `Ha alcanzado el límite máximo de ${this.maxCaracteresComponentes} caracteres`,
                icon: 'warning',
                timer: 3000,
                showConfirmButton: false
            });
        }
    }

    // Método para limpiar HTML
    stripHtml(html: string): string {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html || '';
        return tmp.textContent || tmp.innerText || "";
    }


    cargarTiposProductoLimpieza() {
        this.tiposProductosLimpiezaService.obtenerTodos().subscribe({
            next: (response: any) => {
                const tipos = response.body || [];
                this.listas.tiposProductoLimpieza = tipos.map((t: any) => ({
                    value: t.id,
                    label: t.nombre
                }));
            },
            error: (error: any) => {
                console.error("Error al cargar tipos de producto de limpieza", error);
            }
        });
    }

    abrirModalBuscarProducto() {
        this.productosLimpiezaService.obtenerDisponiblesParaLimpieza().subscribe({
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
                                    <p class="mb-0">No hay productos disponibles para registrar como productos de limpieza</p>
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
                        // Cargar la imagen del producto
                        this.cargarImagenProducto(result.value.id);
                    }
                });
            },
            error: (error: any) => {
                console.error("Error al obtener productos", error);
                Swal.fire('Error', 'No se pudieron cargar los productos disponibles', 'error');
            }
        });
    }

    cargarImagenProducto(idProducto: any) {
        this.productosService.obtenerById(idProducto).subscribe({
            next: (response: any) => {
                const producto = response.body[0];
                if (producto && producto.imagen) {
                    this.imagenProducto = this.productosService.obtenerUrlImagen(producto.imagen);
                } else {
                    this.imagenProducto = '/assets/images/producto.png';
                }
                // Guardar datos completos para el PDF
                this.datosProductoCompleto = producto;
            },
            error: (error: any) => {
                console.error("Error al cargar imagen del producto", error);
                this.imagenProducto = '/assets/images/producto.png';
            }
        });
    }
    async generarFichaTecnica() {
        try {
            // Mostrar mensaje de carga
            const loadingMessage = document.createElement('div');
            loadingMessage.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Generando ficha técnica...</div>';
            loadingMessage.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 5px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
            document.body.appendChild(loadingMessage);

            // Cargar el logo
            const logoBase64 = await this.cargarLogoBase64();

            // Obtener la imagen en base64 usando el servicio
            let imagenProductoBase64 = '';

            if (this.model.idProducto) {
                try {
                    // Convertir idProducto a número
                    const idProducto = typeof this.model.idProducto === 'string'
                        ? this.model.idProducto
                        : this.model.idProducto;

                    // Usar el servicio de productos para obtener la imagen en base64
                    const response = await lastValueFrom(this.productosService.obtenerImagenBase64(idProducto));
                    const data = response.body;
                    if (data && data.imagen_base64) {
                        imagenProductoBase64 = data.imagen_base64;
                        console.log('Imagen base64 obtenida exitosamente del servidor');
                    } else {
                        console.log('No se recibió imagen base64 del servidor');
                    }
                } catch (error) {
                    console.error('Error obteniendo imagen base64:', error);
                }
            }

            // Preparar datos para el PDF
            const datosPDF = {
                productoLimpieza: {
                    nombre_producto: this.model.nombreProducto,
                    tipo_limpieza: this.obtenerNombreTipoLimpieza(),
                    imagen_producto: imagenProductoBase64,
                    descripcion_producto: this.datosProductoCompleto?.descripcion || '',
                    precio_unitario: this.datosProductoCompleto?.precio_unitario || 0,
                    unidad_medida: this.datosProductoCompleto?.nombre_unidad || this.datosProductoCompleto?.unidad_medida || '',
                    componentes: this.model.componentes || '',
                    modo_uso: this.model.modoUso || ''
                },
                logoBase64: logoBase64,
                fechaGeneracion: new Date()
            };

            console.log('Generando PDF con imagen:', imagenProductoBase64 ? 'SI' : 'NO');

            // Generar el PDF
            this.exportarPdfService.generarPDF(datosPDF);

            // Remover mensaje de carga
            document.body.removeChild(loadingMessage);

            // Mostrar mensaje de éxito
            Swal.fire({
                title: 'Ficha técnica generada',
                text: 'El archivo PDF se ha descargado correctamente',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al generar ficha técnica:', error);
            // Remover mensaje de carga si existe
            const loadingMessage = document.querySelector('div[style*="position: fixed"]');
            if (loadingMessage) {
                document.body.removeChild(loadingMessage);
            }
            Swal.fire('Error', 'No se pudo generar la ficha técnica', 'error');
        }
    }



    private async cargarLogoBase64(): Promise<string> {
        try {
            const logoUrl = this.institucionConfigService.getLogoUrl();
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error al cargar el logo:', error);
            return '';
        }
    }

    private obtenerNombreTipoLimpieza(): string {
        const tipo = this.listas.tiposProductoLimpieza.find(
            t => t.value == this.model.idTipoProductoLimpieza
        );
        return tipo ? tipo.label : '';
    }


    obtenerProductoLimpieza(id: any) {
        if (id && id !== "0") {
            this.productosLimpiezaService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const producto = response.body[0];
                    if (producto) {
                        this.model.id = producto.id;
                        this.model.idProducto = producto.id_producto;
                        this.model.nombreProducto = producto.nombre_producto || '';
                        this.model.idTipoProductoLimpieza = producto.id_tipo_producto_limpieza;
                        this.model.componentes = producto.componentes || '';
                        this.model.modoUso = producto.modo_uso || '';

                        // Guardar datos completos para el PDF
                        this.datosProductoCompleto = producto;

                        // Cargar imagen si existe
                        if (producto.imagen_producto) {
                            this.imagenProducto = this.productosService.obtenerUrlImagen(producto.imagen_producto);
                            console.log('Imagen cargada en editar/consultar:', this.imagenProducto);
                        } else if (producto.id_producto) {
                            // Si no hay imagen en el registro pero hay id_producto, intentar cargarla
                            this.cargarImagenProducto(producto.id_producto);
                        } else {
                            this.imagenProducto = '/assets/images/producto.png';
                        }

                        // Inicializar el editor después de cargar los datos
                        setTimeout(() => {
                            this.initializeEditor();
                        }, 500);

                        if (this.accion === 'editar') {
                            this.titulo = `Editar producto: ${producto.nombre_producto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar producto: ${producto.nombre_producto}`;
                        }
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener producto de limpieza", error);
                    Swal.fire('Error', 'Error al cargar los datos del producto de limpieza', 'error');
                }
            });
        }
    }

    formatearPrecio(precio: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(precio);
    }

    guardarProductoLimpieza() {
        this.submitted = true;

        // Asegurar que tenemos el contenido más reciente del editor
        if (this.editorComponentes) {
            this.model.componentes = this.editorComponentes.getData();
        }

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
            this.productosLimpiezaService.crear(productoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Producto de limpieza creado correctamente', 'success')
                        .then(() => this.volver());
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al crear el producto de limpieza', 'error');
                }
            });
        } else if (this.accion === 'editar') {
            this.productosLimpiezaService.actualizar(productoData).subscribe({
                next: (response: any) => {
                    Swal.fire('Éxito', 'Producto de limpieza actualizado correctamente', 'success')
                        .then(() => this.volver());
                },
                error: (error: any) => {
                    console.error("Error", error);
                    Swal.fire('Error', 'Error al actualizar el producto de limpieza', 'error');
                }
            });
        }
    }
    prepararDatos() {
        return {
            id: this.model.id || 0,
            id_producto: this.model.idProducto,
            id_tipo_producto_limpieza: this.model.idTipoProductoLimpieza,
            componentes: this.model.componentes,
            modo_uso: this.model.modoUso
        };
    }

    formularioValido(): boolean {
        return Boolean(
            this.model.idProducto &&
            this.model.idTipoProductoLimpieza
        );
    }

    volver(): void {
        this.router.navigate(['/administracion/productos-limpieza']);
    }

}