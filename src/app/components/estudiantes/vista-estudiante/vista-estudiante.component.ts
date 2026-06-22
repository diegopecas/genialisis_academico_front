import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { FormsModule } from '@angular/forms';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { PersonasService } from '../../../services/personas.service';
import { DocumentosPersonaComponent } from '../../../common/documentos-persona/documentos-persona.component';

import { EstudianteDatosComponent } from './estudiante-datos/estudiante-datos.component';
import { EstudianteMedidasComponent } from './estudiante-medidas/estudiante-medidas.component';
import { EstudianteCuentasComponent } from './estudiante-cuentas/estudiante-cuentas.component';
import { EstudianteObservacionesComponent } from './estudiante-observaciones/estudiante-observaciones.component';
import { EstudianteAsistenciaComponent } from './estudiante-asistencia/estudiante-asistencia.component';
import { EstudianteEvaluacionesComponent } from './estudiante-evaluaciones/estudiante-evaluaciones.component';
import { EstudianteEad3Component } from './estudiante-ead3/estudiante-ead3.component';
import { EstudianteDatosMedicosComponent } from './estudiante-datos-medicos/estudiante-datos-medicos.component';
import { EstudianteDatosAdicionalesComponent } from './estudiante-datos-adicionales/estudiante-datos-adicionales.component';

interface PestanaInfo {
  id: string;
  nombre: string;
  icono: string;
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
    EstudianteObservacionesComponent,
    EstudianteAsistenciaComponent,
    EstudianteEvaluacionesComponent,
    EstudianteEad3Component,
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
  public pestanaActiva = 'datos';
  public cargando = false;
  public isMobile = false;
  public dropdownAbierto = false;
  public menuRapidoAbierto = false;
  public usarSelectorDropdown = false;

  // Tabs que ya fueron visitados (lazy load + keep alive)
  public tabsCargados = new Set<string>(['datos']);

  private pestanas: PestanaInfo[] = [
    { id: 'datos', nombre: 'Datos Personales y Acudientes', icono: 'fas fa-user-circle' },
    { id: 'datos-medicos', nombre: 'Datos Médicos', icono: 'fas fa-heartbeat' },
    { id: 'datos-adicionales', nombre: 'Datos Adicionales', icono: 'fas fa-puzzle-piece' },
    { id: 'medidas', nombre: 'Medidas', icono: 'fas fa-weight' },
    { id: 'cuenta', nombre: 'Estado de Cuenta', icono: 'fas fa-file-invoice-dollar' },
    { id: 'observaciones', nombre: 'Observaciones', icono: 'fas fa-comment-alt' },
    { id: 'asistencia', nombre: 'Asistencia', icono: 'fas fa-calendar-check' },
    { id: 'evaluaciones', nombre: 'Evaluaciones', icono: 'fas fa-graduation-cap' },
    { id: 'ead3', nombre: 'EAD-3', icono: 'fas fa-brain' },
    { id: 'documentos', nombre: 'Documentos', icono: 'fas fa-file-alt' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private personasService: PersonasService
  ) {}

  ngOnInit(): void {
    this.checkDevice();

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
      const currentIndex = this.pestanas.findIndex((p) => p.id === this.pestanaActiva);
      if (diffX > 0 && currentIndex < this.pestanas.length - 1) {
        this.cambiarPestana(this.pestanas[currentIndex + 1].id);
      } else if (diffX < 0 && currentIndex > 0) {
        this.cambiarPestana(this.pestanas[currentIndex - 1].id);
      }
    }
  }
}