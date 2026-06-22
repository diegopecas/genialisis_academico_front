import { Component } from '@angular/core';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';

@Component({
  selector: 'app-reportes-academicos-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reportes-academicos-estudiante.component.html',
  styleUrl: './reportes-academicos-estudiante.component.scss'
})
export class ReportesAcademicosEstudianteComponent {
  titulo = "Módulo de reportes academicos de estudiantes";

  public titulos = [] as any[];
  public datos = [] as any[];
  public datosFiltrados: any[] = [];
  public grupos: any[] = [];
  public estudiantes: any[] = [];

  public grupoSeleccionado: string = "";
  public estudianteSeleccionado: string = "";

  public filtrarIncluirInactivos: boolean = false;

  public acciones = [
    { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png' },
    { id: 'pmd', label: 'PDM', icono: '/assets/images/acciones/observador.png' },

  ] as any[];

  constructor(
    private estudiantesService: EstudiantesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerEstudiantesXGrupo();
  }

  obtenerEstudiantesXGrupo() {
    this.estudiantesService.obtenerTodosXGrupo(0).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerEstudiantesXGrupo", body);
      this.datos = body;
      this.datos.forEach((e: any) => {
        e.nombre_completo = `${e.primer_nombre} ${e.segundo_nombre} ${e.primer_apellido} ${e.segundo_apellido}`;
        e.color = e.activo === 0 ? "#e2e9f3" : "";
        e.estado = e.activo === 0 ? "Inactivo" : "Activo";
        e.alimentacion = e.alimentacion === 0 ? "No" : "Sí";
      });
      this.filtrarDatos();
      this.extraerGrupos();
      this.extraerEstudiantes();
    })


  }
  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'id',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo',
        alias: 'Nombre completo',
        alinear: 'izquierda',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      }
    ];
  }

  extraerGrupos() {
    const gruposMap = new Map();
    this.datosFiltrados.forEach(item => {
      if (!gruposMap.has(item.id_grupo)) {
        gruposMap.set(item.id_grupo, { id_grupo: item.id_grupo, nombre_grupo: item.nombre_grupo });
      }
    });
    this.grupos = Array.from(gruposMap.values());
  }

  extraerEstudiantes() {
    const estudiantesMap = new Map();
    this.datosFiltrados.forEach(item => {
      if (!estudiantesMap.has(item.id_estudiante)) {
        estudiantesMap.set(item.id_estudiante, {
          id_estudiante: item.id_estudiante,
          nombre_completo: item.nombre_completo
        });
      }
    });
    this.estudiantes = Array.from(estudiantesMap.values());
  }



  filtrarDatos() {
    this.datosFiltrados = this.datos.filter(item =>
      (this.grupoSeleccionado === "" || item.id_grupo === this.grupoSeleccionado) &&
      (this.estudianteSeleccionado === "" || item.id_estudiante === this.estudianteSeleccionado) &&
      (this.filtrarIncluirInactivos || item.activo === 1) // Solo mostrar activos si no se marca incluir inactivos
    );
  }
  filtrarDatosGrupos() {
    console.log("filtrarDatosGrupos", this.grupoSeleccionado)
    this.estudianteSeleccionado = "";
    this.filtrarDatos();
    this.extraerEstudiantes();

  }

  filtrarDatosPendientes() {
    this.filtrarDatos();
  }
  filtrarDatosEstudiantes() {
    this.filtrarDatos();
  }
  resetearFiltros() {
    this.grupoSeleccionado = "";
    this.estudianteSeleccionado = "";
    this.filtrarDatos();
  }



  buscar(event: any) {
    console.log("buscar", event);
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'editar':
        break;
      case 'pmd':
        this.calificaciones($event.registro.id_estudiante);
        break;
    }
  }
  calificaciones(idEstudiante: any) {
    this.router.navigate(['/reportes/calificacion-pdm-estudiante/' + idEstudiante]);
  }

}
