import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { EstudiantesService } from '../../../../services/estudiantes.service';
import { PersonasService } from '../../../../services/personas.service';
import { AcudientesService } from '../../../../services/acudientes.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../../services/generos.service';
import { GruposService } from '../../../../services/grupos.service';
import { CiudadesService } from '../../../../services/ciudades.service';
import { FotoPersonaComponent } from '../../../../common/foto-persona/foto-persona.component';

@Component({
  selector: 'app-estudiante-datos',
  standalone: true,
  imports: [CommonModule, FormsModule, FotoPersonaComponent],
  templateUrl: './estudiante-datos.component.html',
  styleUrl: './estudiante-datos.component.scss'
})
export class EstudianteDatosComponent implements OnInit {
  @Input() idEstudiante: string = "0";

  // Variables para almacenar datos
  public estudiante: any = null;
  public acudientes: any[] = [];
  public tiposIdentificacion: any[] = [];
  public generos: any[] = [];
  public grupos: any[] = [];
  public ciudades: any[] = [];
  public grupoActual: any = null;
  public nombreCompleto = "";

  // Indicadores de carga
  public cargando = {
    datos: false,
    acudientes: false
  };

  // Control de expansión de acudientes
  public acudienteExpandido: boolean[] = [];

  constructor(
    private estudiantesService: EstudiantesService,
    private personasService: PersonasService,
    private acudientesService: AcudientesService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private gruposService: GruposService,
    private ciudadesService: CiudadesService
  ) { }

  ngOnInit(): void {
    if (this.idEstudiante && this.idEstudiante !== "0") {
      // Cargar listas para tener los datos de referencia
      this.cargarListas();

      // Cargar los datos del estudiante
      this.cargarDatosEstudiante();
    }
  }

  cargarListas(): void {
    // Cargar tipos de identificación
    this.tiposIdentificacionService.obtenerTodos().subscribe((response: any) => {
      this.tiposIdentificacion = response.body;
    });

    // Cargar géneros
    this.generosService.obtenerTodos().subscribe((response: any) => {
      this.generos = response.body;
    });

    // Cargar grupos
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.grupos = response.body;
    });

    // Cargar ciudades
    this.ciudadesService.obtenerTodos().subscribe((response: any) => {
      this.ciudades = response.body;
    });
  }

  cargarDatosEstudiante(): void {
    this.cargando.datos = true;

    // Obtener datos del estudiante
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          this.estudiante = response.body[0];

          // Obtener datos de la persona
          this.cargarDatosPersona(this.estudiante.id_persona);

          // Obtener el grupo actual del estudiante
          this.obtenerGrupoEstudiante();

          // Cargamos los acudientes
          this.cargarAcudientes();
        } else {
          Swal.fire('Error', 'No se encontró el estudiante', 'error');
        }
        this.cargando.datos = false;
      },
      error: (error: any) => {
        console.error("Error al obtener estudiante", error);
        Swal.fire('Error', 'Error al cargar los datos del estudiante', 'error');
        this.cargando.datos = false;
      }
    });
  }

  cargarDatosPersona(idPersona: any): void {
    this.personasService.obtenerById(idPersona).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          const persona = response.body[0];

          // Fusionar datos de persona con estudiante
          this.estudiante = { ...this.estudiante, ...persona };

          // Crear nombre completo para el título
          this.nombreCompleto = [
            persona.primer_nombre,
            persona.segundo_nombre,
            persona.primer_apellido,
            persona.segundo_apellido
          ].filter(Boolean).join(' ');
        }
      },
      error: (error: any) => {
        console.error("Error al obtener datos de persona", error);
      }
    });
  }

  obtenerGrupoEstudiante(): void {
    this.estudiantesService.obtenerGrupoByEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          this.grupoActual = response.body[0];
        }
      },
      error: (error: any) => {
        console.error("Error al obtener grupo del estudiante", error);
      }
    });
  }

  cargarAcudientes(): void {
    this.cargando.acudientes = true;

    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.acudientes = response.body;

        // Inicializar el array para controlar la expansión
        this.acudienteExpandido = this.acudientes.map((_, index) => index === 0);

        // Para cada acudiente, obtener datos completos de la persona
        if (this.acudientes && this.acudientes.length > 0) {
          this.acudientes.forEach((acudiente, index) => {
            this.cargarDatosAcudiente(acudiente, index);
          });
        }

        this.cargando.acudientes = false;
      },
      error: (error: any) => {
        console.error("Error al obtener acudientes", error);
        this.cargando.acudientes = false;
      }
    });
  }

  cargarDatosAcudiente(acudiente: any, index: number): void {
    if (acudiente && acudiente.id_persona) {
      this.personasService.obtenerById(acudiente.id_persona).subscribe({
        next: (response: any) => {
          if (response.body && response.body.length > 0) {
            const persona = response.body[0];
            // Actualizar el acudiente con los datos de la persona
            this.acudientes[index] = {
              ...this.acudientes[index],
              persona_data: persona
            };
          }
        },
        error: (error: any) => {
          console.error(`Error al obtener datos de persona para acudiente ${acudiente.id}`, error);
        }
      });
    }
  }

  toggleAcudiente(index: number): void {
    this.acudienteExpandido[index] = !this.acudienteExpandido[index];
  }

  // Métodos de ayuda para mostrar datos de referencia
  obtenerTipoDocumento(id: any): string {
    const tipo = this.tiposIdentificacion.find(t => t.id === id);
    return tipo ? tipo.nombre : 'No especificado';
  }

  obtenerGenero(id: any): string {
    const genero = this.generos.find(g => g.id === id);
    return genero ? genero.nombre : 'No especificado';
  }

  obtenerGrupo(id: any): string {
    const grupo = this.grupos.find(g => g.id === id);
    return grupo ? grupo.nombre : 'No especificado';
  }

  obtenerCiudad(id: any): string {
    const ciudad = this.ciudades.find(c => c.id === id);
    return ciudad ? ciudad.nombre : 'No especificada';
  }

  // Funciones auxiliares para el cálculo de edad
  obtenerAnios(fechaNacimiento: string): number {
    if (!fechaNacimiento) {
      return 0;
    }

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();

    // Verificar que la fecha sea válida
    if (isNaN(fechaNac.getTime())) {
      return 0;
    }

    let años = hoy.getFullYear() - fechaNac.getFullYear();
    const meses = hoy.getMonth() - fechaNac.getMonth();

    // Ajustar si aún no ha cumplido el mes exacto
    if (meses < 0 || (meses === 0 && hoy.getDate() < fechaNac.getDate())) {
      años--;
    }

    return años;
  }

  obtenerMeses(fechaNacimiento: string): number {
    if (!fechaNacimiento) {
      return 0;
    }

    const fechaNac = new Date(fechaNacimiento);
    const hoy = new Date();

    // Verificar que la fecha sea válida
    if (isNaN(fechaNac.getTime())) {
      return 0;
    }

    let meses = hoy.getMonth() - fechaNac.getMonth();

    // Ajustar si aún no ha cumplido el día exacto
    if (hoy.getDate() < fechaNac.getDate()) {
      meses--;
    }

    // Si los meses son negativos, ajustar
    if (meses < 0) {
      meses = meses + 12;
    }

    return meses;
  }
}