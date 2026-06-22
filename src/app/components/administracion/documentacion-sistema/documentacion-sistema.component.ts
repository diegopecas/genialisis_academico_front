import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { OpcionesSistemaService } from '../../../services/opciones-sistema.service';

declare var ClassicEditor: any;

interface NodoDocumentacion {
  id: string;
  id_padre: string | null;
  nombre: string;
  ruta: string | null;
  ruta_principal: string | null;
  descripcion: string | null;
  descripcion_texto: string | null;
  componente: string | null;
  icono: string | null;
  orden: number;
  imagenes: string[];
  tags: string | null;
  portal: string;
  activo: number;
  nombre_padre: string | null;
  permisos_asociados: string | null;
  tiene_descripcion: boolean;
  tiene_imagenes: boolean;
  hijos: NodoDocumentacion[];
  expandido: boolean;
  visible: boolean;
}

@Component({
  selector: 'app-documentacion-sistema',
  templateUrl: './documentacion-sistema.component.html',
  styleUrl: './documentacion-sistema.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HeaderComponent]
})
export class DocumentacionSistemaComponent implements OnInit, OnDestroy {

  titulo = "Documentación del Sistema";

  // Árbol
  arbol: NodoDocumentacion[] = [];
  cargando = false;
  cargado = false;
  terminoBusqueda = '';
  filtroImagenes = 'todos';

  // Nodo seleccionado para edición
  nodoSeleccionado: NodoDocumentacion | null = null;
  imagenesArray: string[] = [];
  archivosPendientes: { archivo: File, preview: string, nombreFinal: string }[] = [];

  // CKEditor
  private editorDescripcion: any = null;

  // Galería
  galeriaAbierta = false;
  galeriaImagenIdx = 0;

  constructor(
    private opcionesSistemaService: OpcionesSistemaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarOpciones();
  }

  ngOnDestroy(): void {
    this.destruirEditor();
  }

  // =====================================================
  // CARGA DE DATOS
  // =====================================================

  cargarOpciones(): void {
    this.cargando = true;
    this.opcionesSistemaService.obtenerTodos().subscribe({
      next: (response: any) => {
        const data = response.body as any[];
        const nodosMapeados = data.map((item: any) => this.mapearNodo(item));
        this.arbol = this.construirArbol(nodosMapeados);
        this.cargando = false;
        this.cargado = true;
      },
      error: (error: any) => {
        console.error('Error cargando opciones:', error);
        this.cargando = false;
        this.cargado = true;
        Swal.fire('Error', 'No se pudieron cargar las opciones del sistema', 'error');
      }
    });
  }

  private mapearNodo(item: any): NodoDocumentacion {
    let imagenes: string[] = [];
    try {
      imagenes = item.imagenes ? JSON.parse(item.imagenes) : [];
    } catch (e) {
      imagenes = [];
    }

    return {
      id: item.id,
      id_padre: item.id_padre,
      nombre: item.nombre,
      ruta: item.ruta,
      ruta_principal: item.ruta_principal,
      descripcion: item.descripcion,
      descripcion_texto: item.descripcion_texto,
      componente: item.componente,
      icono: item.icono,
      orden: item.orden,
      imagenes: imagenes,
      tags: item.tags,
      portal: item.portal,
      activo: item.activo,
      nombre_padre: item.nombre_padre,
      permisos_asociados: item.permisos_asociados,
      tiene_descripcion: !!item.descripcion,
      tiene_imagenes: imagenes.length > 0,
      hijos: [],
      expandido: false,
      visible: true
    };
  }

  private construirArbol(nodos: NodoDocumentacion[]): NodoDocumentacion[] {
    const mapa = new Map<string, NodoDocumentacion>();
    nodos.forEach(n => mapa.set(n.id, n));

    const raices: NodoDocumentacion[] = [];
    nodos.forEach(n => {
      if (n.id_padre && mapa.has(n.id_padre)) {
        mapa.get(n.id_padre)!.hijos.push(n);
      } else {
        raices.push(n);
      }
    });

    return raices;
  }

  // =====================================================
  // BUSCADOR + FILTRO IMÁGENES
  // =====================================================

  filtrarArbol(): void {
    this.aplicarFiltros(this.arbol);
  }

  private aplicarFiltros(nodos: NodoDocumentacion[]): boolean {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    let algunoVisible = false;

    nodos.forEach(nodo => {
      let coincideTexto = true;
      if (termino) {
        const textos = [
          nodo.nombre,
          nodo.descripcion_texto || '',
          nodo.tags || '',
          nodo.permisos_asociados || ''
        ].join(' ').toLowerCase();
        coincideTexto = termino.split(/\s+/).every(t => textos.includes(t));
      }

      let coincideImagenes = true;
      if (this.filtroImagenes === 'con') {
        coincideImagenes = nodo.tiene_imagenes;
      } else if (this.filtroImagenes === 'sin') {
        coincideImagenes = !nodo.tiene_imagenes;
      }

      const hijosVisibles = this.aplicarFiltros(nodo.hijos);
      nodo.visible = (coincideTexto && coincideImagenes) || hijosVisibles;

      if (nodo.visible && (termino || this.filtroImagenes !== 'todos')) {
        nodo.expandido = true;
      }

      if (nodo.visible) algunoVisible = true;
    });

    return algunoVisible;
  }

  cambiarFiltroImagenes(): void {
    this.aplicarFiltros(this.arbol);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.filtroImagenes = 'todos';
    this.resetVisibilidad(this.arbol);
  }

  private resetVisibilidad(nodos: NodoDocumentacion[]): void {
    nodos.forEach(n => {
      n.visible = true;
      this.resetVisibilidad(n.hijos);
    });
  }

  // =====================================================
  // NAVEGACIÓN ÁRBOL
  // =====================================================

  toggleExpandir(nodo: NodoDocumentacion): void {
    nodo.expandido = !nodo.expandido;
  }

  expandirTodos(): void {
    const expandir = (nodos: NodoDocumentacion[]) => {
      nodos.forEach(n => { n.expandido = true; expandir(n.hijos); });
    };
    expandir(this.arbol);
  }

  contraerTodos(): void {
    const contraer = (nodos: NodoDocumentacion[]) => {
      nodos.forEach(n => { n.expandido = false; contraer(n.hijos); });
    };
    contraer(this.arbol);
  }

  // =====================================================
  // SELECCIÓN Y EDICIÓN
  // =====================================================

  seleccionarNodo(nodo: NodoDocumentacion): void {
    this.destruirEditor();
    this.nodoSeleccionado = nodo;
    this.archivosPendientes = [];
    this.galeriaAbierta = false;

    this.imagenesArray = (nodo.imagenes || []).map((img: string) => {
      if (!img.startsWith('assets/')) {
        return 'assets/images/' + img;
      }
      return img;
    });

    setTimeout(() => this.initializeEditor(), 150);
  }

  // =====================================================
  // CKEDITOR
  // =====================================================

  private initializeEditor(): void {
    if (typeof ClassicEditor === 'undefined') {
      setTimeout(() => this.initializeEditor(), 1000);
      return;
    }

    if (this.editorDescripcion) return;

    const editorElement = document.querySelector('#editor-descripcion');
    if (!editorElement) {
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
            'link', 'blockQuote', '|',
            'undo', 'redo'
          ]
        },
        language: 'es',
        placeholder: 'Escribe la descripción del módulo con formato...',
      })
      .then((editor: any) => {
        this.editorDescripcion = editor;

        if (this.nodoSeleccionado?.descripcion) {
          editor.setData(this.nodoSeleccionado.descripcion);
        }

        editor.model.document.on('change:data', () => {
          if (this.nodoSeleccionado) {
            this.nodoSeleccionado.descripcion = editor.getData();
          }
        });
      })
      .catch((error: any) => {
        console.error('Error al inicializar CKEditor:', error);
      });
  }

  private destruirEditor(): void {
    if (this.editorDescripcion) {
      this.editorDescripcion.destroy()
        .catch((error: any) => console.error('Error destruyendo editor:', error));
      this.editorDescripcion = null;
    }
  }

  // =====================================================
  // IMÁGENES
  // =====================================================

  generarNombreArchivo(indice: number, extension: string): string {
    if (!this.nodoSeleccionado) return `imagen-${indice}.${extension}`;

    const base = this.nodoSeleccionado.nombre
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const sufijo = indice > 0 ? `-${indice + 1}` : '';
    return `${base}${sufijo}.${extension}`;
  }

  onArchivosSeleccionados(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const indiceBase = this.imagenesArray.length + this.archivosPendientes.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const nombreFinal = this.generarNombreArchivo(indiceBase + i, extension);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.archivosPendientes.push({
          archivo: file,
          preview: e.target.result,
          nombreFinal: nombreFinal
        });
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }

  eliminarImagen(index: number): void {
    this.imagenesArray.splice(index, 1);
  }

  quitarPendiente(index: number): void {
    this.archivosPendientes.splice(index, 1);
  }

  // Drag & drop para reordenar imágenes existentes
  reordenarImagenes(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.imagenesArray, event.previousIndex, event.currentIndex);
  }

  // Drag & drop para reordenar imágenes pendientes
  reordenarPendientes(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.archivosPendientes, event.previousIndex, event.currentIndex);
  }

  descargarImagenes(): void {
    this.archivosPendientes.forEach(ap => {
      const link = document.createElement('a');
      link.href = ap.preview;
      link.download = ap.nombreFinal;
      link.click();
    });

    Swal.fire({
      icon: 'info',
      title: 'Imágenes descargadas',
      html: `Copia las imágenes descargadas a:<br><code>src/assets/images/documentacion/</code>`,
      confirmButtonColor: '#d4af37'
    });
  }

  obtenerNombreArchivo(ruta: string): string {
    return ruta.split('/').pop() || ruta;
  }

  onImageError(event: any): void {
    event.target.src = 'assets/images/no-image.png';
  }

  getRutaImagen(img: string): string {
    if (img.startsWith('assets/')) return img;
    return 'assets/images/' + img;
  }

  // =====================================================
  // GALERÍA
  // =====================================================

  abrirGaleria(idx: number): void {
    this.galeriaImagenIdx = idx;
    this.galeriaAbierta = true;
  }

  cerrarGaleria(): void {
    this.galeriaAbierta = false;
  }

  galeriaAnterior(): void {
    const total = this.imagenesArray.length;
    this.galeriaImagenIdx = (this.galeriaImagenIdx - 1 + total) % total;
  }

  galeriaSiguiente(): void {
    const total = this.imagenesArray.length;
    this.galeriaImagenIdx = (this.galeriaImagenIdx + 1) % total;
  }

  // =====================================================
  // GUARDAR
  // =====================================================

  guardar(): void {
    if (!this.nodoSeleccionado) return;

    const imagenesFinales = [
      ...this.imagenesArray.map((img: string) => {
        if (img.startsWith('assets/images/')) {
          return img.replace('assets/images/', '');
        }
        return img;
      }),
      ...this.archivosPendientes.map(ap => 'documentacion/' + ap.nombreFinal)
    ];

    const data = {
      id: this.nodoSeleccionado.id,
      descripcion: this.nodoSeleccionado.descripcion,
      descripcion_texto: this.nodoSeleccionado.descripcion_texto,
      imagenes: imagenesFinales,
      tags: this.nodoSeleccionado.tags
    };

    this.opcionesSistemaService.actualizarDocumentacion(data).subscribe({
      next: (response: any) => {
        this.nodoSeleccionado!.tiene_descripcion = !!data.descripcion;
        this.nodoSeleccionado!.imagenes = imagenesFinales;
        this.nodoSeleccionado!.tiene_imagenes = imagenesFinales.length > 0;

        this.imagenesArray = imagenesFinales.map((img: string) => {
          if (!img.startsWith('assets/')) return 'assets/images/' + img;
          return img;
        });
        this.archivosPendientes = [];

        Swal.fire('Éxito', 'Documentación actualizada correctamente', 'success');
      },
      error: (error: any) => {
        console.error("Error al actualizar documentación", error);
        Swal.fire('Error', 'No se pudo actualizar la documentación', 'error');
      }
    });
  }
}