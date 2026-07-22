import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';
import { EntesControlService } from '../../../../services/entes-control.service';
import { PersonasService } from '../../../../services/personas.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';

@Component({
  selector: 'app-crear-ente-control',
  templateUrl: './crear-ente-control.component.html',
  styleUrl: './crear-ente-control.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    DocumentosPersonaComponent,
  ],
})
export class CrearEnteControlComponent implements OnInit {
  titulo = 'Crear Ente de Control';
  accion = '';
  id: string | null = null;
  regresar = '/administracion/entes-control';

  public editable = true;
  public camposHabilitados = false;
  public submitted = false;
  public seccionActiva: 'datos' | 'documentos' = 'datos';

  public tiposIdentificacion: any[] = [];

  public model: any = {
    idEnte: null,
    idPersona: null,
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    razonSocial: '',
    direccion: '',
    telefono: '',
    correoElectronico: '',
    funciones: '',
    activo: 1,
  };

  constructor(
    private entesControlService: EntesControlService,
    private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTiposIdentificacion();

    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.titulo = 'Crear Ente de Control';
          this.editable = true;
          this.camposHabilitados = false;
          break;
        case 'editar':
          this.titulo = 'Editar Ente de Control';
          this.editable = true;
          this.camposHabilitados = true;
          this.cargarEnte(this.id);
          break;
        case 'consultar':
          this.titulo = 'Consultar Ente de Control';
          this.editable = false;
          this.camposHabilitados = true;
          this.cargarEnte(this.id);
          break;
        default:
          this.titulo = 'Crear Ente de Control';
          this.editable = true;
          this.camposHabilitados = false;
          break;
      }
    });
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

  cargarEnte(id: any) {
    this.entesControlService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const e = body[0];
          this.model.idEnte = e.id;
          this.model.idPersona = e.id_persona;
          this.model.tipoIdentificacion = e.id_tipo_identificacion || '';
          this.model.numeroIdentificacion = e.numero_identificacion || '';
          this.model.razonSocial = e.razon_social || '';
          this.model.direccion = e.direccion || '';
          this.model.telefono = e.telefono || '';
          this.model.correoElectronico = e.correo_electronico || '';
          this.model.funciones = e.funciones || '';
          this.model.activo = e.activo;
          this.titulo =
            (this.accion === 'consultar' ? 'Consultar' : 'Editar') +
            ' Ente de Control: ' +
            (e.razon_social || '');
        }
      },
      error: (error: any) => {
        console.error('Error al cargar ente de control', error);
        Swal.fire('Error', 'No se pudo cargar el ente de control', 'error');
      },
    });
  }

  cambiarSeccion(seccion: 'datos' | 'documentos') {
    this.seccionActiva = seccion;
  }

  // Busca una persona por identificación; si existe la reutiliza, si no habilita
  // los campos para capturarla nueva.
  verificarDocumento() {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) {
      Swal.fire(
        'Campos incompletos',
        'Ingrese tipo y número de identificación para verificar',
        'warning'
      );
      return;
    }

    this.personasService
      .obtenerByIdentificacion(
        this.model.tipoIdentificacion,
        this.model.numeroIdentificacion
      )
      .subscribe({
        next: (response: any) => {
          const datos = response.body;
          if (datos && datos.length > 0) {
            const persona = datos[0];
            this.entesControlService
              .verificarDuplicados(persona.id)
              .subscribe({
                next: (r: any) => {
                  if (r.body?.existe) {
                    Swal.fire(
                      'Ente existente',
                      'Esta persona ya está registrada como ente de control',
                      'warning'
                    );
                    return;
                  }
                  this.llenarFormularioPersona(persona);
                  this.camposHabilitados = true;
                  Swal.fire(
                    'Persona encontrada',
                    'Se encontró una persona con esta identificación',
                    'success'
                  );
                },
                error: () =>
                  Swal.fire('Error', 'Error al verificar duplicados', 'error'),
              });
          } else {
            this.camposHabilitados = true;
            Swal.fire(
              'Persona no encontrada',
              'No existe una persona con esta identificación. Puede ingresar los datos.',
              'info'
            );
          }
        },
        error: () =>
          Swal.fire('Error', 'Error al consultar la persona', 'error'),
      });
  }

  llenarFormularioPersona(persona: any) {
    this.model.idPersona = persona.id;
    this.model.razonSocial =
      persona.razon_social ||
      [persona.primer_nombre, persona.primer_apellido]
        .filter(Boolean)
        .join(' ');
    this.model.direccion = persona.direccion || '';
    this.model.telefono = persona.telefono || '';
    this.model.correoElectronico = persona.correo_electronico || '';
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
        'Tipo/número de identificación y nombre del ente son obligatorios',
        'warning'
      );
      return;
    }

    const personaData = this.prepararDatosPersona();

    if (this.model.idPersona) {
      // Persona ya existe: actualizar y luego crear/actualizar el ente.
      this.personasService.actualizar(personaData).subscribe({
        next: () => this.guardarEnte(),
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al actualizar la persona', 'error'),
      });
    } else {
      // Persona nueva: crearla y luego el ente.
      this.personasService.crear(personaData).subscribe({
        next: (r: any) => {
          this.model.idPersona = r.id;
          this.guardarEnte();
        },
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al crear la persona', 'error'),
      });
    }
  }

  private guardarEnte() {
    if (this.model.idEnte) {
      const data = {
        id: this.model.idEnte,
        funciones: this.model.funciones || null,
        activo: this.model.activo,
      };
      this.entesControlService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ente de control actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al actualizar el ente', 'error'),
      });
    } else {
      const data = {
        id_persona: this.model.idPersona,
        funciones: this.model.funciones || null,
        activo: this.model.activo,
      };
      this.entesControlService.crear(data).subscribe({
        next: (r: any) => {
          this.model.idEnte = r.id;
          Swal.fire(
            'Éxito',
            'Ente de control creado. Ya puede adjuntar documentos.',
            'success'
          );
        },
        error: (e: any) =>
          Swal.fire('Error', e.error?.error || 'Error al crear el ente', 'error'),
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}