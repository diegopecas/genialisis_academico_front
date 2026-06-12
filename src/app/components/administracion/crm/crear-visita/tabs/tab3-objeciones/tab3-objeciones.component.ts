import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tab3-objeciones',
  templateUrl: './tab3-objeciones.component.html',
  styleUrl: './tab3-objeciones.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule],
  animations: [
    trigger('slideDown', [
      state('collapsed', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('expanded', style({
        height: '*',
        opacity: '1',
        overflow: 'visible'
      })),
      transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class Tab3ObjecionesComponent implements OnInit, OnChanges {

  @Input() visitaData: any = {};
  @Input() soloLectura: boolean = false;
  @Input() catalogos: any = null;
  @Output() datosActualizados = new EventEmitter<any>();

  // ✅ CONTROL DE CARDS COLAPSABLES
  cardsExpandidas: boolean[] = [true]; // Primera card (objeciones encontradas) expandida
  todasExpandidas: boolean = false;

  // ✅ DIRTY TRACKING - Rastreo de cambios
  private seccionesModificadas = new Set<string>();
  private debounceTimer: any;

  // Catálogo de objeciones
  tiposObjeciones: any[] = [];
  tiposObjecionesFiltrados: any[] = [];
  
  // Objeciones encontradas
  objecionesEncontradas: any[] = [];

  // Buscador
  textoBusqueda: string = '';

  constructor() {}

  ngOnInit(): void {
    if (this.catalogos) {
      this.asignarCatalogos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['catalogos'] && this.catalogos) {
      this.asignarCatalogos();
    }

    if (changes['visitaData'] && !changes['visitaData'].firstChange) {
      this.cargarDatosExistentes();
    }
  }

  asignarCatalogos(): void {
    console.log('✅ TAB 3 - Asignando catálogos recibidos del padre');
    
    this.tiposObjeciones = this.catalogos.tipos_objeciones || [];
    
    // Inicializar cards expandidas: 1 para objeciones encontradas + 1 por cada tipo
    this.cardsExpandidas = [true, ...this.tiposObjeciones.map(() => false)];
    
    // Parsear JSON de cada objeción
    this.tiposObjeciones.forEach(objecion => {
      try {
        // Estrategia
        if (objecion.estrategia) {
          objecion.estrategia_array = typeof objecion.estrategia === 'string'
            ? JSON.parse(objecion.estrategia)
            : objecion.estrategia;
        }
        
        // Role plays
        if (objecion.role_plays) {
          objecion.role_plays_array = typeof objecion.role_plays === 'string'
            ? JSON.parse(objecion.role_plays)
            : objecion.role_plays;
        }
        
        // Respuestas rápidas
        if (objecion.respuestas_rapidas) {
          objecion.respuestas_rapidas_array = typeof objecion.respuestas_rapidas === 'string'
            ? JSON.parse(objecion.respuestas_rapidas)
            : objecion.respuestas_rapidas;
        }

        // Tips
        if (objecion.tips) {
          objecion.tips_object = typeof objecion.tips === 'string'
            ? JSON.parse(objecion.tips)
            : objecion.tips;
        }
      } catch (e) {
        console.error('Error parseando JSON de objeción:', e);
      }
    });

    // Inicializar lista filtrada con todas las objeciones
    this.tiposObjecionesFiltrados = [...this.tiposObjeciones];

    console.log('⚠️ Tipos de objeciones:', this.tiposObjeciones.length);
  }

  cargarDatosExistentes(): void {
    if (this.visitaData.objeciones) {
      this.objecionesEncontradas = [...this.visitaData.objeciones];
    }
  }

  // =====================================================
  // ✅ MÉTODOS PARA CARDS COLAPSABLES
  // =====================================================
  toggleCard(index: number): void {
    if (this.soloLectura) return;
    this.cardsExpandidas[index] = !this.cardsExpandidas[index];
    this.actualizarEstadoTodasExpandidas();
  }

  toggleTodasLasCards(): void {
    if (this.soloLectura) return;
    this.todasExpandidas = !this.todasExpandidas;
    this.cardsExpandidas = this.cardsExpandidas.map(() => this.todasExpandidas);
  }

  actualizarEstadoTodasExpandidas(): void {
    this.todasExpandidas = this.cardsExpandidas.every(expandida => expandida);
  }

  esCardCompleta(index: number): boolean {
    if (index === 0) {
      // Card de objeciones encontradas
      return this.objecionesEncontradas.length > 0;
    }

    // Cards de tipos de objeciones (registrada o no)
    const objecionIndex = index - 1;
    if (objecionIndex >= 0 && objecionIndex < this.tiposObjeciones.length) {
      const objecion = this.tiposObjeciones[objecionIndex];
      return this.esObjecionRegistrada(objecion.id);
    }

    return false;
  }

  tieneProgreso(index: number): boolean {
    if (index === 0) {
      return this.objecionesEncontradas.length > 0;
    }

    const objecionIndex = index - 1;
    if (objecionIndex >= 0 && objecionIndex < this.tiposObjeciones.length) {
      const objecion = this.tiposObjeciones[objecionIndex];
      return this.esObjecionRegistrada(objecion.id);
    }

    return false;
  }

  // =====================================================
  // ✅ MÉTODOS DE DIRTY TRACKING
  // =====================================================
  marcarCambio(seccion: string): void {
    if (this.soloLectura) return;

    console.log('🔄 TAB 3 - Sección modificada:', seccion);
    this.seccionesModificadas.add(seccion);

    // Debounce: esperar 300ms antes de emitir
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.emitirCambios();
    }, 300);
  }

  limpiarCambios(): void {
    this.seccionesModificadas.clear();
    console.log('🧹 TAB 3 - Cambios limpiados');
  }

  // =====================================================
  // MÉTODOS EXISTENTES - Ahora llaman a marcarCambio()
  // =====================================================
  agregarObjecionEncontrada(idTipoObjecion: number): void {
    const yaExiste = this.objecionesEncontradas.find(o => o.id_tipo_objecion === idTipoObjecion);
    if (yaExiste) {
      Swal.fire({
        icon: 'info',
        title: 'Objeción ya registrada',
        text: 'Esta objeción ya está en tu lista',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end'
      });
      return;
    }

    const nuevaObjecion = {
      id_tipo_objecion: idTipoObjecion,
      como_se_manejo: '',
      superada: false,
      notas_adicionales: ''
    };

    this.objecionesEncontradas.push(nuevaObjecion);
    this.marcarCambio('objeciones');

    Swal.fire({
      icon: 'success',
      title: 'Objeción registrada',
      showConfirmButton: false,
      timer: 1500,
      toast: true,
      position: 'top-end'
    });
  }

  eliminarObjecionEncontrada(index: number): void {
    Swal.fire({
      title: '¿Eliminar objeción?',
      text: 'Se eliminará esta objeción de la lista',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d4af37',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.objecionesEncontradas.splice(index, 1);
        this.marcarCambio('objeciones');
      }
    });
  }

  actualizarObjecion(index: number, campo: string, valor: any): void {
    this.objecionesEncontradas[index][campo] = valor;
    this.marcarCambio('objeciones');
  }

  obtenerNombreObjecion(idTipoObjecion: number): string {
    const objecion = this.tiposObjeciones.find(o => o.id === idTipoObjecion);
    return objecion?.nombre || 'Objeción';
  }

  esObjecionRegistrada(idTipoObjecion: number): boolean {
    return this.objecionesEncontradas.some(o => o.id_tipo_objecion === idTipoObjecion);
  }

  emitirCambios(): void {
    console.log('🔄 TAB 3 - Emitiendo solo secciones modificadas:', Array.from(this.seccionesModificadas));

    const datosCompletos: any = {};

    // Solo incluir las secciones que fueron modificadas
    if (this.seccionesModificadas.has('objeciones')) {
      datosCompletos.objeciones = this.objecionesEncontradas;
    }

    this.datosActualizados.emit(datosCompletos);
  }

  // =====================================================
  // 🔍 MÉTODOS DEL BUSCADOR
  // =====================================================
  filtrarObjeciones(): void {
    const busqueda = this.textoBusqueda.toLowerCase().trim();

    if (!busqueda) {
      this.tiposObjecionesFiltrados = [...this.tiposObjeciones];
      return;
    }

    this.tiposObjecionesFiltrados = this.tiposObjeciones.filter(objecion => {
      // Buscar en el nombre
      if (objecion.nombre?.toLowerCase().includes(busqueda)) {
        return true;
      }

      // Buscar en la descripción
      if (objecion.descripcion?.toLowerCase().includes(busqueda)) {
        return true;
      }

      // Buscar en estrategia
      if (objecion.estrategia_array) {
        const encontradoEnEstrategia = objecion.estrategia_array.some((item: string) =>
          item.toLowerCase().includes(busqueda)
        );
        if (encontradoEnEstrategia) return true;
      }

      // Buscar en respuestas rápidas
      if (objecion.respuestas_rapidas_array) {
        const encontradoEnRespuestas = objecion.respuestas_rapidas_array.some((item: string) =>
          item.toLowerCase().includes(busqueda)
        );
        if (encontradoEnRespuestas) return true;
      }

      return false;
    });
  }

  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.tiposObjecionesFiltrados = [...this.tiposObjeciones];
  }
}