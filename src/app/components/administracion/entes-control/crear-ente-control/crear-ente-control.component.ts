import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';
import { RecursosEnteControlComponent } from './recursos-ente-control/recursos-ente-control.component';
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
    RecursosEnteControlComponent
  ]
})
export class CrearEnteControlComponent implements OnInit {

  titulo = 'Ente de Control';
  accion = '';
  public id = '0';

  public nuevo = false;
  public seccionActiva: 'datos-ente' | 'documentos' | 'recursos' = 'datos-ente';

  public editable = true;
  public documentoEncontrado = false;
  public camposHabilitados = false;
  public submitted = false;
  public sidebarAbierto = false;

  public listas = {
    tiposIdentificacion: [] as any[]
  };

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
    activo: 1
  };

  constructor(
    private entesControlService: EntesControlService,
    private personasService: PersonasService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'] || '0';

      switch (this.accion) {
        case 'crear':
          this.titulo = 'Ente de Control';
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.consultarListas();
          break;
        case 'editar':
          this.titulo = 'Ente de Control';
          this.editable = true;
          this.camposHabilitados = true;
          this.documentoEncontrado = true;
          this.consultarListas();
          this.consultarEnteControl();
          break;
        case 'ver':
        case 'consultar':
          this.titulo = 'Ente de Control';
          this.editable = false;
          this.camposHabilitados = false;
          this.documentoEncontrado = true;
          this.consultarListas();
          this.consultarEnteControl();
          break;
        default:
          this.titulo = 'Ente de Control';
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.consultarListas();
          break;
      }
    });
  }

  toggleSidebar() { this.sidebarAbierto = !this.sidebarAbierto; }
  cerrarSidebar() { this.sidebarAbierto = false; }
  @HostListener('document:keydown.escape') onEscape() { this.cerrarSidebar(); }

  obtenerNombreSeccion(): string {
    const n: any = { 'datos-ente': 'Datos del Ente', 'documentos': 'Documentos', 'recursos': 'Recursos' };
    return n[this.seccionActiva] || '';
  }

  obtenerIconoSeccion(): string {
    const i: any = { 'datos-ente': 'fas fa-landmark', 'documentos': 'fas fa-file-alt', 'recursos': 'fas fa-list-check' };
    return i[this.seccionActiva] || 'fas fa-circle';
  }

  cambiarSeccion(seccion: 'datos-ente' | 'documentos' | 'recursos') {
    this.seccionActiva = seccion;
    this.cerrarSidebar();
  }

  consultarListas() {
    this.tiposIdentificacionService.obtenerTodos().subscribe({
      next: (response: any) => { this.listas.tiposIdentificacion = response.body || []; },
      error: (error: any) => console.error('Error al obtener tipos de identificación', error)
    });
  }

  consultarEnteControl() {
    this.entesControlService.obtenerPorId(this.id).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        if (body && body.length > 0) {
          const ente = body[0];
          this.model.idEnte = ente.id;
          this.model.idPersona = ente.id_persona;
          this.model.tipoIdentificacion = ente.id_tipo_identificacion || '';
          this.model.numeroIdentificacion = ente.numero_identificacion || '';
          this.model.razonSocial = ente.razon_social || '';
          this.model.direccion = ente.direccion || '';
          this.model.telefono = ente.telefono || '';
          this.model.correoElectronico = ente.correo_electronico || '';
          this.model.funciones = ente.funciones || '';
          this.model.activo = ente.activo;
          // El encabezado muestra el nombre del ente, no el UUID.
          this.titulo = 'Ente de Control: ' + (ente.razon_social || '');
        }
      },
      error: (error: any) => {
        console.error('Error al consultar el ente de control', error);
        Swal.fire({ title: 'Error', text: 'No se pudo cargar el ente de control', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  // Busca la persona por identificación: si existe la reutiliza, si no habilita
  // los campos para capturarla nueva.
  consultaPersona() {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) {
      Swal.fire({ title: 'Campos incompletos', text: 'Por favor ingrese tipo y número de documento para verificar', icon: 'warning', confirmButtonText: 'Aceptar' });
      return;
    }

    if (!this.editable) { return; }

    this.personasService.obtenerByIdentificacion(this.model.tipoIdentificacion, this.model.numeroIdentificacion).subscribe({
      next: (response: any) => {
        const datos = response.body as any[];
        if (datos && datos.length > 0) {
          const persona = datos[0];
          this.entesControlService.verificarDuplicados(persona.id).subscribe({
            next: (respuesta: any) => {
              if (respuesta.body?.existe) {
                Swal.fire({ title: 'Ente existente', text: 'Esta persona ya está registrada como ente de control', icon: 'warning', confirmButtonText: 'Aceptar' });
                return;
              }
              this.llenarFormularioPersona(persona);
              this.documentoEncontrado = true;
              this.camposHabilitados = true;
              Swal.fire({ title: 'Persona encontrada', text: 'Se encontró una persona con esta identificación', icon: 'success', confirmButtonText: 'Aceptar' });
            },
            error: (error: any) => {
              console.error('Error al verificar duplicados', error);
              Swal.fire({ title: 'Error', text: 'Error al verificar duplicados', icon: 'error', confirmButtonText: 'Aceptar' });
            }
          });
        } else {
          this.documentoEncontrado = true;
          this.camposHabilitados = true;
          Swal.fire({ title: 'Persona no encontrada', text: 'No se encontró ninguna persona con esta identificación. Ahora puede ingresar los datos.', icon: 'info', confirmButtonText: 'Aceptar' });
        }
      },
      error: (error: any) => {
        console.error('Error al consultar la persona', error);
        Swal.fire({ title: 'Error', text: 'Error al consultar la persona', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
  }

  llenarFormularioPersona(persona: any) {
    this.model.idPersona = persona.id;
    this.model.razonSocial = persona.razon_social || [persona.primer_nombre, persona.primer_apellido].filter(Boolean).join(' ');
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
      correo_electronico: this.model.correoElectronico || null
    };
  }

  guardar() {
    this.submitted = true;

    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion || !this.model.razonSocial) {
      Swal.fire({ title: 'Campos incompletos', text: 'Tipo, número de identificación y nombre del ente son obligatorios', icon: 'warning', confirmButtonText: 'Aceptar' });
      return;
    }

    const personaData = this.prepararDatosPersona();

    if (this.model.idPersona) {
      this.personasService.actualizar(personaData).subscribe({
        next: () => this.guardarEnte(),
        error: (error: any) => {
          console.error('Error al actualizar la persona', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al actualizar la persona', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    } else {
      this.personasService.crear(personaData).subscribe({
        next: (response: any) => {
          this.model.idPersona = response.id;
          this.guardarEnte();
        },
        error: (error: any) => {
          console.error('Error al crear la persona', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al crear la persona', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    }
  }

  private guardarEnte() {
    if (this.model.idEnte) {
      const data = {
        id: this.model.idEnte,
        funciones: this.model.funciones || null,
        activo: this.model.activo
      };
      this.entesControlService.actualizar(data).subscribe({
        next: () => {
          Swal.fire({ title: 'Éxito', text: 'Ente de control actualizado correctamente', icon: 'success', confirmButtonText: 'Aceptar' });
        },
        error: (error: any) => {
          console.error('Error al actualizar el ente de control', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al actualizar el ente de control', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    } else {
      const data = {
        id_persona: this.model.idPersona,
        funciones: this.model.funciones || null,
        activo: this.model.activo
      };
      this.entesControlService.crear(data).subscribe({
        next: (response: any) => {
          this.model.idEnte = response.id;
          // Pasa a modo edición para habilitar las pestañas (documentos).
          this.nuevo = false;
          this.accion = 'editar';
          this.titulo = 'Ente de Control: ' + (this.model.razonSocial || '');
          Swal.fire({ title: 'Éxito', text: 'Ente de control creado. Ya puede adjuntar documentos.', icon: 'success', confirmButtonText: 'Aceptar' });
        },
        error: (error: any) => {
          console.error('Error al crear el ente de control', error);
          Swal.fire({ title: 'Error', text: error.error?.error || 'Error al crear el ente de control', icon: 'error', confirmButtonText: 'Aceptar' });
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/administracion/operaciones/entes-control']);
  }
}
