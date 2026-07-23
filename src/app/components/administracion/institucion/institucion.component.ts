import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../common/documentos-persona/documentos-persona.component';
import { InstitucionesService } from '../../../services/instituciones.service';
import { PersonasService } from '../../../services/personas.service';
import { TiposIdentificacionService } from '../../../services/tipos-identificacion.service';

@Component({
  selector: 'app-institucion',
  templateUrl: './institucion.component.html',
  styleUrl: './institucion.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    DocumentosPersonaComponent
  ]
})
export class InstitucionComponent implements OnInit {

  titulo = 'Institución';

  public seccionActiva: 'datos-institucion' | 'documentos' = 'datos-institucion';
  public sidebarAbierto = false;
  public submitted = false;
  public cargando = false;

  public listas = {
    tiposIdentificacion: [] as any[]
  };

  public model: any = {
    idInstitucion: null,
    idPersona: null,
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    razonSocial: '',
    direccion: '',
    telefono: '',
    correoElectronico: ''
  };

  constructor(
    private institucionesService: InstitucionesService,
    private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.consultarListas();
    this.consultarInstitucion();
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cerrarSidebar() { this.sidebarAbierto = false; }
  @HostListener('document:keydown.escape') onEscape() { this.cerrarSidebar(); }

  obtenerNombreSeccion(): string {
    const n: any = { 'datos-institucion': 'Datos de la Institución', 'documentos': 'Documentos' };
    return n[this.seccionActiva] || '';
  }

  obtenerIconoSeccion(): string {
    const i: any = { 'datos-institucion': 'fas fa-school', 'documentos': 'fas fa-file-alt' };
    return i[this.seccionActiva] || 'fas fa-circle';
  }

  cambiarSeccion(seccion: 'datos-institucion' | 'documentos') {
    this.seccionActiva = seccion;
    this.cerrarSidebar();
  }

  consultarListas() {
    this.tiposIdentificacionService.obtenerTodos().subscribe({
      next: (response: any) => { this.listas.tiposIdentificacion = response.body || []; },
      error: (error: any) => console.error('Error al obtener tipos de identificación', error)
    });
  }

  consultarInstitucion() {
    this.cargando = true;
    this.institucionesService.obtener().subscribe({
      next: (response: any) => {
        const institucion = response.body;
        // Objeto vacío => aún no está creada: el formulario queda en blanco.
        if (institucion && institucion.id) {
          this.model.idInstitucion = institucion.id;
          this.model.idPersona = institucion.id_persona;
          this.model.tipoIdentificacion = institucion.id_tipo_identificacion || '';
          this.model.numeroIdentificacion = institucion.numero_identificacion || '';
          this.model.razonSocial = institucion.razon_social || '';
          this.model.direccion = institucion.direccion || '';
          this.model.telefono = institucion.telefono || '';
          this.model.correoElectronico = institucion.correo_electronico || '';
          // El encabezado muestra la razón social, no el UUID.
          this.titulo = 'Institución: ' + (institucion.razon_social || '');
        }
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al consultar la institución', error);
        this.cargando = false;
        Swal.fire({ title: 'Error', text: 'No se pudo cargar la institución', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  private prepararDatosPersona(): any {
    return {
      id: this.model.idPersona || undefined,
      id_tipo_identificacion: this.model.tipoIdentificacion,
      numero_identificacion: this.model.numeroIdentificacion,
      razon_social: this.model.razonSocial,
      direccion: this.model.direccion || null,
      telefono: this.model.telefono || null,
      correo_electronico: this.model.correoElectronico || null
    };
  }

  guardar() {
    this.submitted = true;

    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion || !this.model.razonSocial) {
      Swal.fire({ title: 'Campos incompletos', text: 'Tipo, número de identificación y razón social son obligatorios', icon: 'warning', confirmButtonText: 'Aceptar' });
      return;
    }

    const personaData = this.prepararDatosPersona();

    if (this.model.idPersona) {
      this.personasService.actualizar(personaData).subscribe({
        next: () => {
          Swal.fire({ title: 'Éxito', text: 'Datos de la institución actualizados', icon: 'success', confirmButtonText: 'Aceptar' });
        },
        error: (error: any) => {
          console.error('Error al actualizar la institución', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al actualizar la institución', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    } else {
      // Primera vez: se crea la persona y se vincula como institución del tenant.
      this.personasService.crear(personaData).subscribe({
        next: (response: any) => {
          this.model.idPersona = response.id;
          this.institucionesService.crear({ id_persona: this.model.idPersona }).subscribe({
            next: (respuesta: any) => {
              this.model.idInstitucion = respuesta.id;
              Swal.fire({ title: 'Éxito', text: 'Institución creada. Ya puede adjuntar documentos.', icon: 'success', confirmButtonText: 'Aceptar' });
            },
            error: (error: any) => {
              console.error('Error al crear la institución', error);
              Swal.fire({ title: 'Error', text: error.error?.error || 'Error al crear la institución', icon: 'error', confirmButtonText: 'Aceptar' });
            }
          });
        },
        error: (error: any) => {
          console.error('Error al crear la persona', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al crear la persona', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/administracion/datos-maestros']);
  }
}