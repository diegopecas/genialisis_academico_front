import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { CocinaDisponibilidadService } from '../../../services/cocina-disponibilidad.service';
import { HorariosAlimentacionService } from '../../../services/horarios-alimentacion.service';

interface ProductoDisponibilidad {
  id: string;
  nombre: string;
  detalles: string;
  id_horario_alimentacion_sugerido: string | null;
  nombre_horario_sugerido: string | null;
  disponible_hoy: number;
  disponible_ultima_vez: number;
  pendiente: boolean;
}

@Component({
  selector: 'app-disponibilidad-cocina',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './disponibilidad-cocina.component.html',
  styleUrl: './disponibilidad-cocina.component.scss'
})
export class DisponibilidadCocinaComponent implements OnInit {

  titulo = 'Disponibilidad de Cocina';

  public fechaSeleccionada: string = this.obtenerFechaHoy();
  public horarioSeleccionado: string = '';
  public estadoSeleccionado: string = '';
  public textoBusqueda: string = '';
  public horarios: any[] = [];
  public productos: ProductoDisponibilidad[] = [];
  public productosFiltrados: ProductoDisponibilidad[] = [];
  public ultimaFecha: string | null = null;
  public cargando: boolean = false;
  public guardandoTodo: boolean = false;
  public errorMensaje: string | null = null;

  public get totalDisponibles(): number {
    return this.productosFiltrados.filter(p => p.disponible_hoy === 1).length;
  }
  public get totalNoDisponibles(): number {
    return this.productosFiltrados.filter(p => p.disponible_hoy === 0).length;
  }
  public get hayPendientes(): boolean {
    return this.productos.some(p => p.pendiente);
  }
  public get totalPendientes(): number {
    return this.productos.filter(p => p.pendiente).length;
  }

  constructor(
    private cocinaDisponibilidadService: CocinaDisponibilidadService,
    private horariosService: HorariosAlimentacionService
  ) {}

  ngOnInit(): void {
    this.obtenerHorarios();
    this.cargarProductos();
  }

  obtenerFechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
  }

  obtenerHorarios(): void {
    this.horariosService.obtenerTodos().subscribe((response: any) => {
      this.horarios = response.body || [];
    });
  }

  cargarProductos(): void {
    this.cargando = true;
    this.errorMensaje = null;
    this.textoBusqueda = '';
    this.estadoSeleccionado = '';

    this.cocinaDisponibilidadService.obtenerProductosPorFecha(this.fechaSeleccionada).subscribe({
      next: (response: any) => {
        this.ultimaFecha = response.ultima_fecha || null;
        this.productos = (response.productos || []).map((p: any) => ({
          ...p,
          disponible_hoy: Number(p.disponible_hoy),
          disponible_ultima_vez: Number(p.disponible_ultima_vez),
          pendiente: false
        }));
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: () => {
        this.errorMensaje = 'No se pudieron cargar los productos. Intenta de nuevo.';
        this.cargando = false;
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.productos];

    if (this.horarioSeleccionado) {
      resultado = resultado.filter(p =>
        p.id_horario_alimentacion_sugerido !== null &&
        String(p.id_horario_alimentacion_sugerido) === String(this.horarioSeleccionado)
      );
    }

    if (this.estadoSeleccionado !== '') {
      const estado = Number(this.estadoSeleccionado);
      resultado = resultado.filter(p => p.disponible_hoy === estado);
    }

    if (this.textoBusqueda.trim()) {
      const termino = this.normalizarTexto(this.textoBusqueda);
      resultado = resultado.filter(p =>
        this.normalizarTexto(p.nombre).includes(termino) ||
        this.normalizarTexto(p.detalles).includes(termino)
      );
    }

    this.productosFiltrados = resultado;
  }

  cambioFecha(): void {
    this.horarioSeleccionado = '';
    this.estadoSeleccionado = '';
    this.cargarProductos();
  }

  cambioHorario(): void {
    this.aplicarFiltros();
  }

  cambioEstado(): void {
    this.aplicarFiltros();
  }

  cambioBusqueda(): void {
    this.aplicarFiltros();
  }

  toggleDisponibilidad(producto: ProductoDisponibilidad): void {
    const nuevoEstado = producto.disponible_hoy === 1 ? 0 : 1;
    producto.disponible_hoy = nuevoEstado;

    this.cocinaDisponibilidadService
      .guardarUno(this.fechaSeleccionada, producto.id, nuevoEstado)
      .subscribe({
        next: () => {},
        error: () => {
          producto.disponible_hoy = nuevoEstado === 1 ? 0 : 1;
        }
      });
  }

  marcarTodosDisponibles(): void {
    this.productosFiltrados.forEach(p => {
      p.disponible_hoy = 1;
      p.pendiente = true;
    });
  }

  marcarTodosNoDisponibles(): void {
    this.productosFiltrados.forEach(p => {
      p.disponible_hoy = 0;
      p.pendiente = true;
    });
  }

  repetirUltimaSeleccion(): void {
    this.productos.forEach(p => {
      p.disponible_hoy = p.disponible_ultima_vez;
      p.pendiente = true;
    });
    this.aplicarFiltros();
  }

  guardarTodo(): void {
    const pendientes = this.productos.filter(p => p.pendiente);
    if (!pendientes.length) return;

    this.guardandoTodo = true;

    const payload = pendientes.map(p => ({
      id_producto_servicio: p.id,
      disponible: p.disponible_hoy
    }));

    this.cocinaDisponibilidadService.guardarBatch(this.fechaSeleccionada, payload).subscribe({
      next: () => {
        this.productos = this.productos.map(p => ({ ...p, pendiente: false }));
        this.aplicarFiltros();
        this.guardandoTodo = false;
      },
      error: () => {
        this.guardandoTodo = false;
      }
    });
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  trackById(index: number, item: ProductoDisponibilidad): string {
    return item.id;
  }
}