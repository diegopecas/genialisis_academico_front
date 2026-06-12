import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AyudaService } from '../../services/ayuda.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';

interface NodoAyuda {
  id: number;
  id_padre: number | null;
  nombre: string;
  ruta: string | null;
  ruta_principal: string | null;
  descripcion: string | null;
  descripcion_texto: string | null;
  icono: string | null;
  orden: number;
  imagenes: string[];
  tags: string | null;
  tiene_acceso?: boolean;
  hijos: NodoAyuda[];
  expandido: boolean;
  visible: boolean;
  relevancia: number;
}

@Component({
  selector: 'app-ayuda-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss'
})
export class AyudaComponent implements OnInit, OnDestroy {

  abierto = false;
  arbol: NodoAyuda[] = [];
  cargando = false;
  cargado = false;
  terminoBusqueda = '';

  moduloSeleccionado: NodoAyuda | null = null;

  galeriaAbierta = false;
  galeriaImagenIdx = 0;

  private sub!: Subscription;

  constructor(
    private ayudaService: AyudaService,
    private ayudaModalService: AyudaModalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.ayudaModalService.abierto$.subscribe(abierto => {
      this.abierto = abierto;
      if (abierto && !this.cargado) {
        this.cargarModulos();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  cerrar(): void {
    this.ayudaModalService.cerrar();
    this.moduloSeleccionado = null;
    this.galeriaAbierta = false;
  }

  // =====================================================
  // CARGA DE DATOS
  // =====================================================

  cargarModulos(): void {
    this.cargando = true;
    this.ayudaService.obtenerModulos().subscribe({
      next: (response: any) => {
        const data = response.body as any[];
        this.arbol = this.procesarArbol(data);
        this.cargando = false;
        this.cargado = true;
      },
      error: (error: any) => {
        console.error('Error cargando módulos de ayuda:', error);
        this.cargando = false;
        this.cargado = true;
      }
    });
  }

  private procesarArbol(nodos: any[]): NodoAyuda[] {
    return nodos.map(n => ({
      id: n.id,
      id_padre: n.id_padre,
      nombre: n.nombre,
      ruta: n.ruta,
      ruta_principal: n.ruta_principal,
      descripcion: n.descripcion,
      descripcion_texto: n.descripcion_texto,
      icono: n.icono,
      orden: n.orden,
      imagenes: n.imagenes || [],
      tags: n.tags || null,
      tiene_acceso: n.tiene_acceso !== undefined ? n.tiene_acceso : true,
      hijos: this.procesarArbol(n.hijos || []),
      expandido: false,
      visible: true,
      relevancia: 0
    }));
  }

  // =====================================================
  // BUSCADOR INTELIGENTE: tokens + fuzzy + tags
  // =====================================================

  filtrarArbol(): void {
    const termino = this.terminoBusqueda.trim();
    if (!termino) {
      this.resetVisibilidad(this.arbol);
      return;
    }
    this.busquedaInteligente(this.arbol, termino.toLowerCase());
  }

  private busquedaInteligente(nodos: NodoAyuda[], termino: string): boolean {
    const tokens = termino.split(/\s+/).filter(t => t.length > 0);
    let algunoVisible = false;

    nodos.forEach(nodo => {
      const textosBusqueda = this.obtenerTextosBusqueda(nodo);
      const relevancia = this.calcularRelevancia(textosBusqueda, tokens);
      const hijosVisibles = this.busquedaInteligente(nodo.hijos, termino);

      nodo.relevancia = relevancia;
      nodo.visible = relevancia > 0 || hijosVisibles;

      if (nodo.visible) {
        nodo.expandido = true;
        algunoVisible = true;
      }
    });

    return algunoVisible;
  }

  private obtenerTextosBusqueda(nodo: NodoAyuda): string[] {
    const textos: string[] = [];
    if (nodo.nombre) textos.push(nodo.nombre.toLowerCase());
    if (nodo.descripcion_texto) textos.push(nodo.descripcion_texto.toLowerCase());
    if (nodo.tags) textos.push(nodo.tags.toLowerCase());
    return textos;
  }

  private calcularRelevancia(textos: string[], tokens: string[]): number {
    const textoCompleto = textos.join(' ');
    let relevancia = 0;

    for (const token of tokens) {
      let tokenEncontrado = false;

      if (textoCompleto.includes(token)) {
        relevancia += 10;
        tokenEncontrado = true;
      }

      if (!tokenEncontrado) {
        const palabrasTexto = textoCompleto.split(/[\s,;.]+/).filter(p => p.length > 0);
        let mejorDistancia = Infinity;

        for (const palabra of palabrasTexto) {
          const distancia = this.distanciaLevenshtein(token, palabra);
          if (distancia < mejorDistancia) {
            mejorDistancia = distancia;
          }
        }

        const umbral = token.length <= 4 ? 1 : 2;
        if (mejorDistancia <= umbral) {
          relevancia += Math.max(1, 6 - mejorDistancia * 2);
          tokenEncontrado = true;
        }
      }

      if (!tokenEncontrado) {
        return 0;
      }
    }

    return relevancia;
  }

  private distanciaLevenshtein(a: string, b: string): number {
    const lenA = a.length;
    const lenB = b.length;

    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    if (Math.abs(lenA - lenB) > 3) return Math.abs(lenA - lenB);

    const matriz: number[][] = [];

    for (let i = 0; i <= lenA; i++) {
      matriz[i] = [i];
    }
    for (let j = 0; j <= lenB; j++) {
      matriz[0][j] = j;
    }

    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        const costo = a[i - 1] === b[j - 1] ? 0 : 1;
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j - 1] + costo
        );
      }
    }

    return matriz[lenA][lenB];
  }

  private resetVisibilidad(nodos: NodoAyuda[]): void {
    nodos.forEach(n => {
      n.visible = true;
      n.relevancia = 0;
      this.resetVisibilidad(n.hijos);
    });
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.resetVisibilidad(this.arbol);
  }

  // =====================================================
  // NAVEGACIÓN ÁRBOL
  // =====================================================

  toggleExpandir(nodo: NodoAyuda): void {
    nodo.expandido = !nodo.expandido;
  }

  seleccionarModulo(nodo: NodoAyuda): void {
    this.moduloSeleccionado = nodo;
    this.galeriaAbierta = false;
  }

  irAlModulo(nodo: NodoAyuda): void {
    const ruta = nodo.ruta_principal || nodo.ruta;
    if (ruta) {
      this.cerrar();
      this.router.navigateByUrl(ruta);
    }
  }

  expandirTodos(): void {
    const expandir = (nodos: NodoAyuda[]) => {
      nodos.forEach(n => { n.expandido = true; expandir(n.hijos); });
    };
    expandir(this.arbol);
  }

  contraerTodos(): void {
    const contraer = (nodos: NodoAyuda[]) => {
      nodos.forEach(n => { n.expandido = false; contraer(n.hijos); });
    };
    contraer(this.arbol);
  }

  // =====================================================
  // GALERÍA DE IMÁGENES
  // =====================================================

  abrirGaleria(idx: number): void {
    this.galeriaImagenIdx = idx;
    this.galeriaAbierta = true;
  }

  cerrarGaleria(): void {
    this.galeriaAbierta = false;
  }

  galeriaAnterior(): void {
    if (!this.moduloSeleccionado) return;
    const total = this.moduloSeleccionado.imagenes.length;
    this.galeriaImagenIdx = (this.galeriaImagenIdx - 1 + total) % total;
  }

  galeriaSiguiente(): void {
    if (!this.moduloSeleccionado) return;
    const total = this.moduloSeleccionado.imagenes.length;
    this.galeriaImagenIdx = (this.galeriaImagenIdx + 1) % total;
  }

  getRutaImagen(img: string): string {
    return 'assets/images/' + img;
  }
}