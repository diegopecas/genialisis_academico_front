import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../../../services/productos.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { UnidadesMedidaService } from '../../../../services/unidades-medida.service';
import { TiposProductoService } from '../../../../services/tipos-producto.service';


interface ProductoModel {
    id: number;
    idTipoProducto: number | string;
    nombre: string;
    descripcion: string;
    idUnidadMedida: number | string;
    stockActual: number;
    stockMinimo: number;
    precioUnitario: number;
    activo: number;
    imagen: string | null;
}

@Component({
    selector: 'app-crear-producto',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-producto.component.html',
    styleUrl: './crear-producto.component.scss'
})
export class CrearProductoComponent implements OnInit, OnDestroy {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public guardando = false;
    public titulo = "Registro de producto";
    public regresar = '/administracion/productos';
    public productoActivoSwitch = true;
    public proveedoresAsignados: any[] = [];

    // Propiedades para manejo de imagen
    public imagenPreview: string = '/assets/images/producto.png';
    public imagenFile: File | null = null;
    public imagenCambiada: boolean = false;
    public imagenAnterior: string | null = null;
    public cargandoImagen: boolean = false;

    // Modal de imagen y cámara (patrón FotoPersonaComponent)
    @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
    @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
    public mostrarModalImagen: boolean = false;
    public modoCamara: boolean = false;
    public camaraActiva: boolean = false;
    public stream?: MediaStream;
    public camaraDisponible: boolean = false;
    public archivoSeleccionado?: File;
    public previewUrl?: string;

    public listas = {
        unidadesMedida: [] as any[],
        proveedores: [] as any[],
        tiposProducto: [] as any[]
    }

    public model: ProductoModel = {
        id: 0,
        idTipoProducto: "",
        nombre: "",
        descripcion: "",
        idUnidadMedida: "",
        stockActual: 0,
        stockMinimo: 0,
        precioUnitario: 0,
        activo: 1,
        imagen: null
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productosService: ProductosService,
        private proveedoresService: ProveedoresService,
        private unidadesMedidaService: UnidadesMedidaService,
        private tiposProductoService: TiposProductoService
    ) {
        this.verificarCamara();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.titulo = "Crear producto";
                    this.establecerValoresPorDefecto();
                    break;
                case 'editar':
                    this.editable = true;
                    this.titulo = "Editar producto";
                    this.obtenerProducto(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.titulo = "Consultar producto";
                    this.obtenerProducto(this.id);
                    break;
                default:
                    this.editable = true;
                    this.titulo = "Crear producto";
                    this.establecerValoresPorDefecto();
                    break;
            }
        });

        this.consultarTiposProducto();
        this.consultarUnidadesMedida();
        this.consultarProveedores();
    }

    ngOnDestroy(): void {
        this.detenerCamara();
    }

    // ==========================================
    // CONSULTAS INICIALES
    // ==========================================

    consultarTiposProducto() {
        this.tiposProductoService.obtenerActivos().subscribe((response: any) => {
            console.log("tiposProducto", response.body);
            this.listas.tiposProducto = response.body;
        });
    }

    consultarUnidadesMedida() {
        this.unidadesMedidaService.obtenerTodos().subscribe((response: any) => {
            console.log("unidadesMedidaService", response.body);
            this.listas.unidadesMedida = response.body;
        });
    }

    consultarProveedores() {
        this.proveedoresService.obtenerActivos().subscribe((response: any) => {
            console.log("proveedoresService", response.body);
            this.listas.proveedores = response.body;
        });
    }

    obtenerProducto(id: any) {
        if (id && id !== "0") {
            this.productosService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const producto = response.body[0];
                    console.log("Producto recibido:", producto);

                    if (producto) {
                        this.model.id = producto.id;
                        this.model.nombre = producto.nombre || "";
                        this.model.descripcion = producto.descripcion || "";
                        this.model.idTipoProducto = producto.id_tipo_producto || "";
                        this.model.idUnidadMedida = producto.id_unidad_medida || "";
                        this.model.stockActual = producto.stock_actual || 0;
                        this.model.stockMinimo = producto.stock_minimo || 0;
                        this.model.precioUnitario = producto.precio_unitario || 0;
                        this.model.activo = producto.activo;
                        this.model.imagen = producto.imagen || null;
                        this.productoActivoSwitch = (producto.activo == 1 || producto.activo === "1");

                        this.imagenAnterior = producto.imagen;
                        this.imagenPreview = this.productosService.obtenerUrlImagen(producto.imagen);

                        this.cargarProveedoresProducto(id);

                        console.log("Model después de asignar:", this.model);

                        if (this.accion === 'editar') {
                            this.titulo = `Editar producto: ${this.model.nombre}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar producto: ${this.model.nombre}`;
                        }
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener producto", error);
                    Swal.fire('Error', 'Error al cargar los datos del producto', 'error');
                }
            });
        }
    }

    // ==========================================
    // MODAL DE IMAGEN (patrón FotoPersonaComponent)
    // ==========================================

    verificarCamara() {
        this.camaraDisponible = !!(navigator.mediaDevices?.getUserMedia);
    }

    abrirModalImagen() {
        this.archivoSeleccionado = undefined;
        this.previewUrl = undefined;
        this.mostrarModalImagen = true;
    }

    cerrarModalImagen() {
        this.detenerCamara();
        this.mostrarModalImagen = false;
        this.archivoSeleccionado = undefined;
        this.previewUrl = undefined;
        this.modoCamara = false;
    }

    /** Cuando el usuario selecciona un archivo desde el modal */
    onArchivoSeleccionado(event: any) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!tiposPermitidos.includes(file.type)) {
            Swal.fire('Error', 'Solo se permiten imágenes JPG, PNG, GIF y WEBP', 'error');
            event.target.value = '';
            return;
        }

        // Comprimir y redimensionar automáticamente
        this.comprimirImagen(file).then((fileComprimido) => {
            this.archivoSeleccionado = fileComprimido;

            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewUrl = e.target.result;
            };
            reader.readAsDataURL(fileComprimido);
        }).catch((error) => {
            console.error('Error al procesar imagen:', error);
            Swal.fire('Error', 'No se pudo procesar la imagen', 'error');
        });
    }

    /**
     * Redimensiona la imagen a máximo 1200px de ancho/alto
     * y comprime a JPEG con calidad 0.85.
     * Retorna un File listo para subir.
     */
    private comprimirImagen(file: File, maxAncho = 1200, maxAlto = 1200, calidad = 0.85): Promise<File> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const img = new Image();
                img.onload = () => {
                    let ancho = img.width;
                    let alto = img.height;

                    // Si ya es pequeña, no redimensionar
                    if (ancho <= maxAncho && alto <= maxAlto && file.size <= 1048576) {
                        resolve(file);
                        return;
                    }

                    // Calcular nuevas dimensiones manteniendo proporción
                    if (ancho > maxAncho) {
                        alto = Math.round(alto * (maxAncho / ancho));
                        ancho = maxAncho;
                    }
                    if (alto > maxAlto) {
                        ancho = Math.round(ancho * (maxAlto / alto));
                        alto = maxAlto;
                    }

                    // Dibujar en canvas redimensionado
                    const canvas = document.createElement('canvas');
                    canvas.width = ancho;
                    canvas.height = alto;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('No se pudo crear contexto de canvas'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, ancho, alto);

                    // Convertir a blob JPEG comprimido
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('No se pudo generar blob'));
                            return;
                        }

                        const nombreArchivo = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
                        const fileComprimido = new File([blob], nombreArchivo, { type: 'image/jpeg' });

                        console.log(`Imagen comprimida: ${(file.size / 1024).toFixed(0)}KB → ${(fileComprimido.size / 1024).toFixed(0)}KB (${ancho}x${alto})`);
                        resolve(fileComprimido);
                    }, 'image/jpeg', calidad);
                };

                img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    /** Confirma la imagen seleccionada/capturada y la asigna al producto */
    confirmarImagen() {
        if (!this.archivoSeleccionado) return;

        this.imagenFile = this.archivoSeleccionado;
        this.imagenCambiada = true;

        if (this.previewUrl) {
            this.imagenPreview = this.previewUrl;
        }

        this.cerrarModalImagen();
    }

    eliminarImagen() {
        this.imagenFile = null;
        this.imagenCambiada = true;
        this.imagenPreview = '/assets/images/producto.png';
        this.model.imagen = null;
    }

    // ==========================================
    // CÁMARA (lógica idéntica a FotoPersonaComponent)
    // ==========================================

    activarCamara() {
        this.modoCamara = true;
        this.archivoSeleccionado = undefined;
        this.previewUrl = undefined;

        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                this.stream = stream;

                setTimeout(() => {
                    if (this.videoElement) {
                        const video = this.videoElement.nativeElement;
                        video.srcObject = stream;

                        video.onloadedmetadata = () => {
                            video.play().then(() => {
                                this.camaraActiva = true;
                            }).catch((error) => {
                                console.error('Error al reproducir video:', error);
                            });
                        };
                    }
                }, 100);
            })
            .catch((error) => {
                console.error('Error al acceder a la cámara:', error);
                Swal.fire('Error', 'No se pudo acceder a la cámara', 'error');
                this.modoCamara = false;
            });
    }

    detenerCamara() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = undefined;
        }
        this.camaraActiva = false;
    }

    capturarFoto() {
        if (!this.videoElement || !this.canvasElement) return;

        const video = this.videoElement.nativeElement;
        const canvas = this.canvasElement.nativeElement;
        const context = canvas.getContext('2d');

        if (!context) return;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            Swal.fire('Error', 'La cámara no está lista. Intenta de nuevo.', 'error');
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        this.previewUrl = imageDataUrl;

        // Convertir dataURL a File
        const arr = imageDataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });

        const file = new File([blob], `producto_foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.archivoSeleccionado = file;

        this.detenerCamara();
        this.modoCamara = false;
    }

    cambiarCamara() {
        if (!this.stream) return;

        const videoTrack = this.stream.getVideoTracks()[0];
        const currentFacingMode = videoTrack.getSettings().facingMode;

        this.detenerCamara();

        const constraints = {
            video: {
                facingMode: currentFacingMode === 'user' ? 'environment' : 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                this.stream = stream;

                if (this.videoElement) {
                    const video = this.videoElement.nativeElement;
                    video.srcObject = stream;

                    video.onloadedmetadata = () => {
                        video.play().then(() => {
                            this.camaraActiva = true;
                        });
                    };
                }
            })
            .catch((error) => {
                console.error('Error al cambiar cámara:', error);
                this.activarCamara();
            });
    }

    volverASeleccion() {
        this.detenerCamara();
        this.modoCamara = false;
        this.archivoSeleccionado = undefined;
        this.previewUrl = undefined;
    }

    // ==========================================
    // SUBIDA DE IMAGEN AL SERVIDOR
    // ==========================================

    async subirImagen(): Promise<string | null> {
        if (!this.imagenFile) {
            return null;
        }

        this.cargandoImagen = true;
        try {
            const response = await this.productosService.subirImagen(
                this.imagenFile, 
                this.model.id || undefined
            ).toPromise();
            
            this.cargandoImagen = false;
            return response.path;
        } catch (error) {
            this.cargandoImagen = false;
            console.error('Error al subir imagen:', error);
            throw error;
        }
    }

    async eliminarImagenAnterior() {
        if (this.imagenAnterior && this.imagenAnterior !== this.model.imagen) {
            try {
                const filename = this.imagenAnterior.split('/').pop();
                if (filename) {
                    await this.productosService.eliminarImagen(filename).toPromise();
                }
            } catch (error) {
                console.error('Error al eliminar imagen anterior:', error);
            }
        }
    }

    // ==========================================
    // PROVEEDORES
    // ==========================================

    cargarProveedoresProducto(idProducto: any) {
        this.productosService.obtenerProveedoresProducto(idProducto).subscribe({
            next: (response: any) => {
                this.proveedoresAsignados = response.body || [];
                console.log('Proveedores cargados:', this.proveedoresAsignados);
            },
            error: (error: any) => {
                console.error("Error al cargar proveedores del producto", error);
            }
        });
    }

    abrirModalProveedores() {
        const idsAsignados = this.proveedoresAsignados.map(p => p.id_proveedor);
        const proveedoresDisponibles = this.listas.proveedores.filter(
            p => !idsAsignados.includes(p.id)
        );

        if (proveedoresDisponibles.length === 0) {
            Swal.fire('Sin proveedores', 'No hay más proveedores disponibles para asignar', 'info');
            return;
        }

        Swal.fire({
            title: 'Seleccionar Proveedor',
            html: `
                <div class="form-group">
                    <label for="proveedor-select">Proveedor</label>
                    <select id="proveedor-select" class="form-control">
                        <option value="">Seleccionar...</option>
                        ${proveedoresDisponibles.map(p =>
                `<option value="${p.id}">${p.nombre_completo}</option>`
            ).join('')}
                    </select>
                </div>
                <div class="form-group mt-3">
                    <label for="codigo-proveedor">Código del proveedor (opcional)</label>
                    <input id="codigo-proveedor" class="form-control" type="text" placeholder="Código interno del proveedor">
                </div>
                <div class="form-group mt-3">
                    <label for="precio-compra">Precio de compra (opcional)</label>
                    <input id="precio-compra" class="form-control" type="number" placeholder="0.00" step="0.01">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Asignar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const idProveedor = (document.getElementById('proveedor-select') as HTMLSelectElement).value;
                const codigoProveedor = (document.getElementById('codigo-proveedor') as HTMLInputElement).value;
                const precioCompra = (document.getElementById('precio-compra') as HTMLInputElement).value;

                if (!idProveedor) {
                    Swal.showValidationMessage('Por favor seleccione un proveedor');
                    return false;
                }

                return { idProveedor, codigoProveedor, precioCompra };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.asignarProveedor(result.value);
            }
        });
    }

    asignarProveedor(datos: any) {
        const payload = datos.id_producto ? datos : {
            id_producto: this.model.id,
            id_proveedor: datos.idProveedor,
            codigo_proveedor: datos.codigoProveedor || null,
            precio_compra: datos.precioCompra || null
        };

        this.productosService.asignarProveedor(payload).subscribe({
            next: (response: any) => {
                Swal.fire('Éxito', 'Proveedor asignado correctamente', 'success');
                this.cargarProveedoresProducto(this.model.id);
            },
            error: (error: any) => {
                console.error("Error al asignar proveedor", error);
                Swal.fire('Error', 'Error al asignar el proveedor', 'error');
            }
        });
    }

    editarProveedorAsignado(prov: any) {
        console.log('Proveedor completo:', prov);

        if (!prov.id_proveedor) {
            console.error('El objeto proveedor no tiene id_proveedor:', prov);
            Swal.fire('Error', 'No se pudo identificar el proveedor', 'error');
            return;
        }

        Swal.fire({
            title: 'Editar Proveedor',
            html: `
            <div class="form-group">
                <label>Proveedor: <strong>${prov.nombre_proveedor}</strong></label>
            </div>
            <div class="form-group mt-3">
                <label for="codigo-proveedor">Código del proveedor</label>
                <input id="codigo-proveedor" class="form-control" type="text" 
                    value="${prov.codigo_proveedor || ''}" placeholder="Código interno del proveedor">
            </div>
            <div class="form-group mt-3">
                <label for="precio-compra">Precio de compra</label>
                <input id="precio-compra" class="form-control" type="number" 
                    value="${prov.precio_compra || ''}" placeholder="0.00" step="0.01">
            </div>
        `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const codigoProveedor = (document.getElementById('codigo-proveedor') as HTMLInputElement).value;
                const precioCompra = (document.getElementById('precio-compra') as HTMLInputElement).value;
                return { codigoProveedor, precioCompra };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const payload = {
                    id_producto: this.model.id,
                    id_proveedor: prov.id_proveedor,
                    codigo_proveedor: result.value.codigoProveedor || null,
                    precio_compra: result.value.precioCompra || null
                };

                console.log('Payload final:', payload);
                this.asignarProveedor(payload);
            }
        });
    }

    async quitarProveedor(prov: any) {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: `¿Desea quitar al proveedor ${prov.nombre_proveedor} de este producto?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            this.productosService.quitarProveedor(this.model.id, prov.id_proveedor).subscribe({
                next: (response: any) => {
                    Swal.fire('Quitado', 'El proveedor ha sido quitado del producto', 'success');
                    this.cargarProveedoresProducto(this.model.id);
                },
                error: (error: any) => {
                    console.error("Error al quitar proveedor", error);
                    Swal.fire('Error', 'Error al quitar el proveedor', 'error');
                }
            });
        }
    }

    // ==========================================
    // UTILIDADES Y GUARDADO
    // ==========================================

    formatearPrecio(precio: number): string {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(precio);
    }

    cambiarEstadoProducto(): void {
        this.model.activo = this.productoActivoSwitch ? 1 : 0;
        const estado = this.productoActivoSwitch ? 'activo' : 'inactivo';
        console.log(`Estado del producto cambiado a: ${estado}`);
    }

    async guardarProducto() {
        this.submitted = true;
        console.log("Guardar producto", this.model);

        if (!this.formularioValido()) {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor complete todos los campos obligatorios',
                icon: 'warning',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        if (this.accion === 'crear' || (this.accion === 'editar' && this.model.nombre)) {
            this.guardando = true;

            this.productosService.verificarDuplicados(this.model.nombre, this.model.id).subscribe({
                next: (respuesta: any) => {
                    if (respuesta.existe) {
                        this.guardando = false;
                        Swal.fire({
                            title: 'Producto duplicado',
                            text: 'Ya existe un producto con este nombre',
                            icon: 'warning',
                            confirmButtonText: 'Aceptar'
                        });
                        return;
                    } else {
                        this.procesarGuardado();
                    }
                },
                error: (error: any) => {
                    this.guardando = false;
                    console.error("Error al verificar duplicados", error);
                    Swal.fire({
                        title: 'Error',
                        text: 'Error al verificar si el producto ya existe',
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                }
            });
        } else {
            this.procesarGuardado();
        }
    }

    async procesarGuardado() {
        try {
            if (this.imagenCambiada && this.imagenFile) {
                try {
                    const rutaImagen = await this.subirImagen();
                    this.model.imagen = rutaImagen;
                } catch (error) {
                    this.guardando = false;
                    Swal.fire('Error', 'Error al subir la imagen', 'error');
                    return;
                }
            } else if (this.imagenCambiada && !this.imagenFile) {
                this.model.imagen = null;
            }

            const productoData = this.prepararDatosProducto();

            if (this.accion === 'crear') {
                this.productosService.crear(productoData).subscribe({
                    next: async (response: any) => {
                        this.guardando = false;
                        console.log("Producto creado", response);
                        
                        Swal.fire({
                            title: 'Éxito',
                            text: 'Producto creado correctamente',
                            icon: 'success',
                            confirmButtonText: 'Aceptar'
                        }).then(() => {
                            this.volver();
                        });
                    },
                    error: (error: any) => {
                        this.guardando = false;
                        this.manejarError(error, 'crear');
                    }
                });
            } else if (this.accion === 'editar') {
                if (this.imagenCambiada && this.imagenAnterior) {
                    await this.eliminarImagenAnterior();
                }

                this.productosService.actualizar(productoData).subscribe({
                    next: (response: any) => {
                        this.guardando = false;
                        console.log("Producto actualizado", response);
                        Swal.fire({
                            title: 'Éxito',
                            text: 'Producto actualizado correctamente',
                            icon: 'success',
                            confirmButtonText: 'Aceptar'
                        }).then(() => {
                            this.volver();
                        });
                    },
                    error: (error: any) => {
                        this.guardando = false;
                        this.manejarError(error, 'actualizar');
                    }
                });
            }
        } catch (error) {
            this.guardando = false;
            console.error('Error en procesarGuardado:', error);
            Swal.fire('Error', 'Error al procesar el guardado', 'error');
        }
    }

    prepararDatosProducto() {
        return {
            id: this.model.id || 0,
            id_tipo_producto: this.model.idTipoProducto,
            nombre: this.model.nombre,
            descripcion: this.model.descripcion || null,
            imagen: this.model.imagen,
            id_unidad_medida: this.model.idUnidadMedida,
            stock_actual: this.model.stockActual,
            stock_minimo: this.model.stockMinimo,
            precio_unitario: this.model.precioUnitario,
            activo: this.model.activo
        };
    }

    formularioValido(): boolean {
        return Boolean(
            this.model.idTipoProducto &&
            this.model.nombre &&
            this.model.idUnidadMedida &&
            this.model.stockActual >= 0 &&
            this.model.stockMinimo >= 0 &&
            this.model.precioUnitario >= 0
        );
    }

    manejarError(error: any, accion: string): void {
        console.error(`Error al ${accion} producto`, error);
        Swal.fire({
            title: 'Error',
            text: error.error?.error || `Error al ${accion} el producto`,
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }

    obtenerAbreviaturaUnidad(): string {
        if (!this.model.idUnidadMedida) return 'unidades';
        const unidad = this.listas.unidadesMedida.find(u => u.id == this.model.idUnidadMedida);
        return unidad ? unidad.abreviatura : 'unidades';
    }

    limpiarFormulario(): void {
        this.model = {
            id: 0,
            nombre: "",
            descripcion: "",
            idUnidadMedida: "",
            stockActual: 0,
            stockMinimo: 0,
            precioUnitario: 0,
            idTipoProducto: "",
            activo: 1,
            imagen: null
        };
        this.submitted = false;
        this.guardando = false;
        this.productoActivoSwitch = true;
        this.proveedoresAsignados = [];
        this.imagenPreview = '/assets/images/producto.png';
        this.imagenFile = null;
        this.imagenCambiada = false;
        this.imagenAnterior = null;
    }

    volver(): void {
        this.router.navigate(['/administracion/productos']);
    }

    establecerValoresPorDefecto(): void {
        this.model.activo = 1;
        this.model.stockActual = 0;
        this.model.stockMinimo = 0;
        this.model.precioUnitario = 0;
        this.productoActivoSwitch = true;
        this.imagenPreview = '/assets/images/producto.png';
    }
}