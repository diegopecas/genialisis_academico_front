import { Component, OnInit } from '@angular/core';
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
    DocumentosPersonaComponent,
  ],
})
export class InstitucionComponent implements OnInit {
  titulo = 'Institución';
  regresar = '/administracion/datos-maestros';

  public seccionActiva: 'datos' | 'documentos' = 'datos';
  public tiposIdentificacion: any[] = [];
  public submitted = false;

  public model: any = {
    idInstitucion: null,
    idPersona: null,
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    razonSocial: '',
    direccion: '',
    telefono: '',
    correoElectronico: '',
  };

  constructor(
    private institucionesService: InstitucionesService,
    private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
    this.cargarInstitucion();
  }

  cargarTiposIdentificacion() {
    this.tiposIdentificacionService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tiposIdentificacion = response.body || [];
      },
      error: (error: any) =>
        console.error('Error al cargar tipos de identificación', error),
    });
  }

  cargarInstitucion() {
    this.institucionesService.obtener().subscribe({
      next: (response: any) => {
        const i = response.body;
        // Objeto vacío => aún no existe: se deja el formulario en blanco.
        if (i && i.id) {
          this.model.idInstitucion = i.id;
          this.model.idPersona = i.id_persona;
          this.model.tipoIdentificacion = i.id_tipo_identificacion || '';
          this.model.numeroIdentificacion = i.numero_identificacion || '';
          this.model.razonSocial = i.razon_social || '';
          this.model.direccion = i.direccion || '';
          this.model.telefono = i.telefono || '';
          this.model.correoElectronico = i.correo_electronico || '';
        }
      },
      error: (error: any) => {
        console.error('Error al cargar la institución', error);
        Swal.fire('Error', 'No se pudo cargar la institución', 'error');
      },
    });
  }

  cambiarSeccion(seccion: 'datos' | 'documentos') {
    this.seccionActiva = seccion;
  }

  private prepararDatosPersona(): any {
    return {
      id: this.model.idPersona || undefined,
      id_tipo_identificacion: this.model.tipoIdentificacion,
      numero_identificacion: this.model.numeroIdentificacion,
      razon_social: this.model.razonSocial,
      direccion: this.model.direccion || null,
      telefono: this.model.telefono || null,
      correo_electronico: this.model.correoElectronico || null,
    };
  }

  guardar() {
    this.submitted = true;

    if (
      !this.model.tipoIdentificacion ||
      !this.model.numeroIdentificacion ||
      !this.model.razonSocial
    ) {
      Swal.fire(
        'Campos incompletos',
        'Tipo/número de identificación y razón social son obligatorios',
        'warning'
      );
      return;
    }

    const personaData = this.prepararDatosPersona();

    if (this.model.idPersona) {
      // Institución ya existe: se actualiza su persona.
      this.personasService.actualizar(personaData).subscribe({
        next: () =>
          Swal.fire('Éxito', 'Datos de la institución actualizados', 'success'),
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al actualizar', 'error'),
      });
    } else {
      // Primera vez: crear persona y vincularla como institución del tenant.
      this.personasService.crear(personaData).subscribe({
        next: (r: any) => {
          this.model.idPersona = r.id;
          this.institucionesService
            .crear({ id_persona: this.model.idPersona })
            .subscribe({
              next: (resp: any) => {
                this.model.idInstitucion = resp.id;
                Swal.fire(
                  'Éxito',
                  'Institución creada. Ya puede adjuntar documentos.',
                  'success'
                );
              },
              error: (e: any) =>
                Swal.fire('Error', e.error?.error || 'Error al crear la institución', 'error'),
            });
        },
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al crear la persona', 'error'),
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}