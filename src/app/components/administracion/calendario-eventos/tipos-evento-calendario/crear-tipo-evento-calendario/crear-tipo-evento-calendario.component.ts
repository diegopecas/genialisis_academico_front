import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { TiposEventoCalendarioService } from '../../../../../services/tipos-evento-calendario.service';

@Component({
  selector: 'app-crear-tipo-evento-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-tipo-evento-calendario.component.html',
  styleUrl: './crear-tipo-evento-calendario.component.scss'
})
export class CrearTipoEventoCalendarioComponent implements OnInit {

  public id = "0";
  public accion = "";
  public editable = true;
  public submitted = false;
  public titulo = "Tipo de Evento";
  public regresar = '/administracion/datos-maestros/calendario-eventos/tipos';

  public model = {
    id: "",
    nombre: "",
    icono: ""
  };

  // Modal de iconos
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tiposEventoCalendarioService: TiposEventoCalendarioService
  ) {}

  ngOnInit(): void {
    this.cargarImagenes();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Tipo de Evento";
          break;
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Tipo de Evento";
          this.obtenerRegistro(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Tipo de Evento";
          this.obtenerRegistro(this.id);
          break;
      }
    });
  }

  obtenerRegistro(id: any) {
    this.tiposEventoCalendarioService.obtenerById(id).subscribe((response: any) => {
      const body = response.body as any[];
      if (body && body.length > 0) {
        this.model = {
          id: body[0].id,
          nombre: body[0].nombre,
          icono: body[0].icono || ""
        };
      }
    });
  }

  cargarImagenes() {
    this.tiposEventoCalendarioService.obtenerCatalogoIconos().subscribe({
      next: (data: any) => {
        this.imagenesDisponibles = data?.imagenes ?? [];
        this.imagenesFiltradas = this.imagenesDisponibles;
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el catálogo de iconos', 'error');
      }
    });
  }

  /** En la tabla se guarda solo el nombre del archivo, sin la carpeta. */
  nombreArchivo(ruta: string): string {
    return (ruta || '').split('/').pop() || '';
  }

  /** Ruta del icono seleccionado, tomada del catálogo para no armarla a mano. */
  get rutaIconoSeleccionado(): string {
    const imagen = this.imagenesDisponibles.find(img => this.nombreArchivo(img.ruta) === this.model.icono);
    return imagen ? imagen.ruta : '';
  }

  abrirModalImagenes() {
    this.mostrarModalImagenes = true;
    this.busquedaImagen = '';
    this.imagenesFiltradas = this.imagenesDisponibles;
  }

  cerrarModalImagenes() {
    this.mostrarModalImagenes = false;
  }

  seleccionarImagen(imagen: any) {
    this.model.icono = this.nombreArchivo(imagen.ruta);
    this.cerrarModalImagenes();
  }

  filtrarImagenes() {
    if (!this.busquedaImagen) {
      this.imagenesFiltradas = this.imagenesDisponibles;
    } else {
      this.imagenesFiltradas = this.imagenesDisponibles.filter(img =>
        img.nombre.toLowerCase().includes(this.busquedaImagen.toLowerCase())
      );
    }
  }

  guardar() {
    this.submitted = true;
    if (!this.model.nombre.trim() || !this.model.icono) return;

    const servicio = this.accion === 'crear'
      ? this.tiposEventoCalendarioService.crear(this.model)
      : this.tiposEventoCalendarioService.actualizar(this.model);

    servicio.subscribe({
      next: () => {
        Swal.fire({
          title: this.accion === 'crear' ? 'Tipo de evento creado' : 'Tipo de evento actualizado',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => this.volver());
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'Hubo un problema al guardar', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
