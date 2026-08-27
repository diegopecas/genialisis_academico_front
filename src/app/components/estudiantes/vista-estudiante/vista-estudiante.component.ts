import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { FormsModule } from '@angular/forms';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { PersonasService } from '../../../services/personas.service';
import { PermisosService } from '../../../services/permisos.service';
import { DocumentosPersonaComponent } from '../../../common/documentos-persona/documentos-persona.component';

import { EstudianteDatosComponent } from './estudiante-datos/estudiante-datos.component';
import { EstudianteMedidasComponent } from './estudiante-medidas/estudiante-medidas.component';
import { EstudianteCuentasComponent } from './estudiante-cuentas/estudiante-cuentas.component';
import { EstudianteMoraExencionesComponent } from './estudiante-mora-exenciones/estudiante-mora-exenciones.component';
import { EstudianteObservacionesComponent } from './estudiante-observaciones/estudiante-observaciones.component';
import { EstudianteAsistenciaComponent } from './estudiante-asistencia/estudiante-asistencia.component';
import { EstudianteEvaluacionesComponent } from './estudiante-evaluaciones/estudiante-evaluaciones.component';
import { EstudianteEad3Component } from './estudiante-ead3/estudiante-ead3.component';
import { EstudiantePerfilDesarrolloComponent } from './estudiante-perfil-desarrollo/estudiante-perfil-desarrollo.component';
import { EstudianteDatosMedicosComponent } from './estudiante-datos-medicos/estudiante-datos-medicos.component';
import { EstudianteDatosAdicionalesComponent } from './estudiante-datos-adicionales/estudiante-datos-adicionales.component';

interface PestanaInfo {
  id: string;
  nombre: string;
  nombreCorto: string;
  icono: string;
  permiso: string;
}

@Component({
  selector: 'app-vista-estudiante',
  standalone: true,
  imports: [
    HeaderComponent,
    CommonModule,
    FormsModule,
    EstudianteDatosComponent,
    EstudianteMedidasComponent,
    EstudianteCuentasComponent,
    EstudianteMoraExencionesComponent,
    EstudianteObservacionesComponent,
    EstudianteAsistenciaComponent,
    EstudianteEvaluacionesComponent,
    EstudianteEad3Component,
    EstudiantePerfilDesarrolloComponent,
    EstudianteDatosMedicosComponent,
    EstudianteDatosAdicionalesComponent,
    DocumentosPersonaComponent,
  ],
  templateUrl: './vista-estudiante.component.html',
  styleUrl: './vista-estudiante.component.scss',
})
export class VistaEstudianteComponent implements OnInit {
  public idEstudiante = '0';
  public idPersona = '';
  public nombreCompleto = '';
  public pestanaActiva = '';
  public cargando = false;
  public isMobile = false;
  public dropdownAbierto = false;
  public menuRapidoAbierto = false;
  public usarSelectorDropdown = false;

  // Tabs que ya fueron visitados (lazy load + keep alive)
  public tabsCargados = new Set<string>();

  private pestanas: PestanaInfo[] = [
    { id: 'datos', nombre: 'Datos Personales y Acudientes', nombreCorto: 'Datos Personales', icono: 'fas fa-user-circle', permiso: 'estudiantes.vista_360.datos' },
    { id: 'datos-medicos', nombre: 'Datos Médicos', nombreCorto: 'Datos Médicos', icono: 'fas fa-heartbeat', permiso: 'estudiantes.vista_360.datos_medicos' },
    { id: 'datos-adicionales', nombre: 'Datos Adicionales', nombreCorto: 'Datos Adicionales', icono: 'fas fa-puzzle-piece', permiso: 'estudiantes.vista_360.datos_adicionales' },
    { id: 'medidas', nombre: 'Medidas', nombreCorto: 'Medidas', icono: 'fas fa-weight', permiso: 'estudiantes.vista_360.medidas' },
    { id: 'cuenta', nombre: 'Estado de Cuenta', nombreCorto: 'Estado de Cuenta', icono: 'fas fa-file-invoice-dollar', permiso: 'estudiantes.vista_360.cuenta' },
    { id: 'exenciones-mora', nombre: 'Exenciones de Mora', nombreCorto: 'Exenciones de Mora', icono: 'fas fa-shield-alt', permiso: 'estudiantes.vista_360.exenciones_mora' },
    { id: 'observaciones', nombre: 'Observaciones', nombreCorto: 'Observaciones', icono: 'fas fa-comment-alt', permiso: 'estudiantes.vista_360.observaciones' },
    { id: 'asistencia', nombre: 'Asistencia', nombreCorto: 'Asistencia', icono: 'fas fa-calendar-check', permiso: 'estudiantes.vista_360.asistencia' },
    { id: 'evaluaciones', nombre: 'Evaluaciones', nombreCorto: 'Evaluaciones', icono: 'fas fa-graduation-cap', permiso: 'estudiantes.vista_360.evaluaciones' },
    { id: 'ead3', nombre: 'EAD-3', nombreCorto: 'EAD-3', icono: 'fas fa-brain', permiso: 'estudiantes.vista_360.ead3' },
    { id: 'perfil-desarrollo', nombre: 'Perfil de Desarrollo', nombreCorto: 'Perfil de Desarrollo', icono: 'fas fa-chart-line', permiso: 'estudiantes.vista_360.perfil_desarrollo' },
    { id: 'documentos', nombre: 'Documentos', nombreCorto: 'Documentos', icono: 'fas fa-file-alt', permiso: 'estudiantes.vista_360.documentos' },
  ];

  // Pestañas que el usuario puede ver según sus permisos
  public pestanasVisibles: PestanaInfo[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private personasService: PersonasService,
    private permisosService: PermisosService
  ) {}

  ngOnInit(): void {
    this.checkDevice();
    this.filtrarPestanasPorPermiso();

    this.route.params.subscribe((params) => {
      this.idEstudiante = params['id'];
      if (this.idEstudiante && this.idEstudiante !== '0') {
        this.cargarDatosBasicosEstudiante();
      } else {
        this.router.navigate(['/estudiantes']);
      }
    });

    this.setupOutsideClickListener();
  }

  // Deja solo las pestañas con permiso y arranca en la primera disponible,
  // porque 'datos' puede no estar habilitada para el rol.
  private filtrarPestanasPorPermiso(): void {
    this.pestanasVisibles = this.pestanas.filter((p) =>
      this.permisosService.tienePermiso(p.permiso)
    );

    if (this.pestanasVisibles.length > 0) {
      this.pestanaActiva = this.pestanasVisibles[0].id;
      this.tabsCargados.add(this.pestanaActiva);
    } else {
      this.pestanaActiva = '';
    }
  }

  // Usado por el template para no instanciar componentes sin permiso
  puedeVer(idPestana: string): boolean {
    return this.pestanasVisibles.some((p) => p.id === idPestana);
  }

  get sinPestanasVisibles(): boolean {
    return this.pestanasVisibles.length === 0;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkDevice();
  }

  checkDevice() {
    this.isMobile = window.innerWidth <= 768;
    if (!this.isMobile) {
      this.dropdownAbierto = false;
      this.menuRapidoAbierto = false;
    }
  }

  setupOutsideClickListener() {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (this.dropdownAbierto && !target.closest('.mobile-tab-selector')) {
        this.dropdownAbierto = false;
      }
      if (this.menuRapidoAbierto && !target.closest('.mobile-quick-nav')) {
        this.menuRapidoAbierto = false;
      }
    });
  }

  cargarDatosBasicosEstudiante(): void {
    this.cargando = true;
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          const estudiante = response.body[0];
          this.idPersona = estudiante.id_persona;

          this.personasService.obtenerById(estudiante.id_persona).subscribe({
            next: (personaResponse: any) => {
              if (personaResponse.body && personaResponse.body.length > 0) {
                const persona = personaResponse.body[0];
                this.nombreCompleto = [
                  persona.primer_nombre, persona.segundo_nombre,
                  persona.primer_apellido, persona.segundo_apellido,
                ].filter(Boolean).join(' ');

                if (this.isMobile && this.nombreCompleto.length > 20) {
                  this.nombreCompleto = `${persona.primer_nombre} ${persona.primer_apellido}`;
                }
              }
              this.cargando = false;
            },
            error: (error: any) => {
              console.error('Error al obtener datos de persona', error);
              this.cargando = false;
            },
          });
        } else {
          Swal.fire('Error', 'No se encontró el estudiante', 'error');
          this.router.navigate(['/estudiantes']);
          this.cargando = false;
        }
      },
      error: (error: any) => {
        console.error('Error al obtener estudiante', error);
        Swal.fire('Error', 'Error al cargar los datos del estudiante', 'error');
        this.cargando = false;
      },
    });
  }

  cambiarPestana(pestana: string): void {
    if (!this.puedeVer(pestana)) return;

    this.tabsCargados.add(pestana);
    this.pestanaActiva = pestana;
    if (this.isMobile) {
      setTimeout(() => {
        const contenido = document.querySelector('.tab-content');
        if (contenido) {
          contenido.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  toggleDropdown(): void { this.dropdownAbierto = !this.dropdownAbierto; }

  seleccionarPestanaDropdown(pestana: string): void {
    this.cambiarPestana(pestana);
    this.dropdownAbierto = false;
  }

  obtenerNombrePestana(id: string): string {
    const pestana = this.pestanas.find((p) => p.id === id);
    return pestana ? pestana.nombre : '';
  }

  obtenerIconoPestana(id: string): string {
    const pestana = this.pestanas.find((p) => p.id === id);
    return pestana ? pestana.icono : '';
  }

  toggleMenuRapido(): void { this.menuRapidoAbierto = !this.menuRapidoAbierto; }

  navegarRapido(pestana: string): void {
    this.cambiarPestana(pestana);
    this.menuRapidoAbierto = false;
  }

  trackByPestana(index: number, pestana: PestanaInfo): string {
    return pestana.id;
  }

  private startX = 0;
  private startY = 0;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (!this.isMobile) return;
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const diffX = this.startX - endX;
    const diffY = Math.abs(this.startY - endY);

    if (Math.abs(diffX) > 50 && diffY < 100) {
      // El swipe recorre solo las pestañas visibles para el rol
      const currentIndex = this.pestanasVisibles.findIndex((p) => p.id === this.pestanaActiva);
      if (diffX > 0 && currentIndex < this.pestanasVisibles.length - 1) {
        this.cambiarPestana(this.pestanasVisibles[currentIndex + 1].id);
      } else if (diffX < 0 && currentIndex > 0) {
        this.cambiarPestana(this.pestanasVisibles[currentIndex - 1].id);
      }
    }
  }
}