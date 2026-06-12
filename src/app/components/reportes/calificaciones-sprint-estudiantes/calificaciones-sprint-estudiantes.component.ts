import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { SprintsService } from '../../../services/sprints.service';
import Swal from 'sweetalert2';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Define interfaces for better type safety
interface Sprint {
  id: string;
  nombre_sprint: string;
  actual: number;
  es_sprint_actual?: number;
}

interface Calificacion {
  id: string;
  nombre_grupo: string;
  area_academica_nombre: string;
  nombre_completo_estudiante: string;
  actividad_academica_titulo: string;
  esfera_desarrollo_nombre: string;
  corte_academico_nombre: string;
  parametro_calificacion: string;
  valor_cualitativo: string;
  valor_cuantitativo: number;
  estado_tarea_nombre: string;
  fecha_ejecucion: string;
  nombre_completo_docente: string;
  id_estudiante: number;
  id_area_academica: number;
  id_grupo: number;
  // Campos de parámetros posibles
  id_parametro_calificacion?: number;
  parametro_calificacion_id?: number;
  id_parametro?: number;
  // Campos para indicador de logro
  id_indicador_logro?: number;
  descripcion_indicador_logro?: string;
  [key: string]: any; // Índice dinámico para acceder a propiedades por nombre
  color?: string;
}

interface CalificacionPromedio {
  id_estudiante: number;
  nombre_completo_estudiante: string;
  id_area_academica: number;
  area_academica_nombre: string;
  valores: number[];
  promedio: number;
  valor_cualitativo: string;
  nombre_grupo?: string;
  id_grupo?: number;
  color?: string;
}

interface CalificacionPromedioGrupo {
  id_grupo: number;
  nombre_grupo: string;
  id_area_academica: number;
  area_academica_nombre: string;
  valores: number[];
  promedio: number;
  valor_cualitativo: string;
  num_estudiantes: number;
  estudiantes?: Set<number>; // Para contar estudiantes únicos
  color?: string;
}

// Nueva interfaz para indicadores de logro agrupados
interface IndicadorLogroAgrupado {
  id_estudiante: number;
  nombre_completo_estudiante: string;
  id_area_academica: number;
  area_academica_nombre: string;
  nombre_grupo: string;
  id_grupo: number;
  id_indicador_logro: number;
  descripcion_indicador_logro: string;
  valores: number[];
  promedio: number;
  valor_cualitativo: string;
  color?: string;
}

interface AgrupadoCalificaciones {
  [key: string]: CalificacionPromedio;
}

interface AgrupadoCalificacionesGrupo {
  [key: string]: CalificacionPromedioGrupo;
}

interface AgrupadoIndicadoresLogro {
  [key: string]: IndicadorLogroAgrupado;
}

// Definición de tipo para los colores de calificación
type ValorCalificativo = 'Excelente' | 'Sobresaliente' | 'Bueno' | 'Aceptable' | 'Insuficiente' | 'Enfermo' | 'Sin calificación' | string;

// Interfaz para el mapa de colores
interface MapaColores {
  [key: string]: string;
}

@Component({
  selector: 'app-calificaciones-sprint-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './calificaciones-sprint-estudiantes.component.html',
  styleUrl: './calificaciones-sprint-estudiantes.component.scss'
})
export class CalificacionesSprintEstudiantesComponent implements OnInit {
  public titulo = "Calificaciones por Sprint";
  public path = "/calificaciones";
  public titulos: any[] = [];
  public datos: Calificacion[] = [];
  public sprints: Sprint[] = [];
  public sprintSeleccionado: string = "";
  public sprintActual: string = "";
  public columnasFiltro = ['Grupo', 'Estudiante', 'Actividad', 'Indicador de Logro', 'Área Académica', 'Esfera Desarrollo', 'Corte Académico', 'Parámetro', 'Valor Cualitativo', 'Estado Tarea', 'Docente'];
  public cargando = false;

  // Propiedades para la tabla de promedios por estudiante
  public titulosPromedio: any[] = [];
  public datosPromedio: CalificacionPromedio[] = [];
  public mostrarTablaPromedio = false;
  public columnasFiltroPromedio = ['Grupo', 'Estudiante', 'Área Académica'];

  // Propiedades para la tabla de promedios por grupo
  public titulosPromedioGrupo: any[] = [];
  public datosPromedioGrupo: CalificacionPromedioGrupo[] = [];
  public mostrarTablaPromedioGrupo = false;
  public columnasFiltroPromedioGrupo = ['Grupo', 'Área Académica'];

  // Propiedades para la tabla de indicadores de logro
  public titulosIndicadoresLogro: any[] = [];
  public datosIndicadoresLogro: IndicadorLogroAgrupado[] = [];
  public mostrarTablaIndicadoresLogro = false;
  public columnasFiltroIndicadoresLogro = ['Grupo', 'Estudiante', 'Área Académica', 'Indicador de Logro'];

  // Mapa de colores pastel para calificaciones
  private coloresCalificacion: MapaColores = {
    'Excelente': '#d4f7d4', // Verde pastel claro
    'Sobresaliente': '#c7f0c7', // Verde pastel medio
    'Bueno': '#f7f5d4', // Amarillo pastel claro
    'Aceptable': '#f7e9d4', // Naranja pastel claro
    'Insuficiente': '#f7d4d4', // Rojo pastel claro
    'Enfermo': '#f5d4f7', // Púrpura pastel claro
    'Sin calificación': '#e9e9e9' // Gris pastel claro
  };

  // Colores para gráficos
  private coloresGrafico: string[] = [
    'rgba(54, 162, 235, 0.8)', // Azul
    'rgba(255, 99, 132, 0.8)', // Rosa
    'rgba(255, 206, 86, 0.8)', // Amarillo
    'rgba(75, 192, 192, 0.8)',  // Verde azulado
    'rgba(153, 102, 255, 0.8)', // Morado
    'rgba(255, 159, 64, 0.8)',  // Naranja
    'rgba(199, 199, 199, 0.8)'  // Gris
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private calificacionesService: CalificacionesService,
    private sprintsService: SprintsService
  ) {
    // Registrar Chart.js y plugin de datalabels
    Chart.register(...registerables, ChartDataLabels);
  }

  ngOnInit() {
    this.crearTitulos();
    this.crearTitulosPromedio();
    this.crearTitulosPromedioGrupo();
    this.crearTitulosIndicadoresLogro();
    this.consultarSprints();
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'area_academica_nombre',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo_estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        clave: 'actividad_academica_titulo',
        alias: 'Actividad',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion_indicador_logro',
        alias: 'Indicador de Logro',
        alinear: 'izquierda',
      },
      {
        clave: 'esfera_desarrollo_nombre',
        alias: 'Esfera Desarrollo',
        alinear: 'izquierda',
      },
      {
        clave: 'corte_academico_nombre',
        alias: 'Corte Académico',
        alinear: 'izquierda',
      },
      {
        clave: 'parametro_calificacion',
        alias: 'Parámetro',
        alinear: 'izquierda',
      },
      {
        clave: 'valor_cualitativo',
        alias: 'Valor Cualitativo',
        alinear: 'centrado',
        colorFondo: 'color'
      },
      {
        clave: 'estado_tarea_nombre',
        alias: 'Estado Tarea',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_ejecucion',
        alias: 'Fecha',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_completo_docente',
        alias: 'Docente',
        alinear: 'izquierda',
      }
    ];
  }

  crearTitulosPromedio() {
    this.titulosPromedio = [
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo_estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        clave: 'area_academica_nombre',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'promedio',
        alias: 'Promedio',
        alinear: 'centrado',
      },
      {
        clave: 'valor_cualitativo',
        alias: 'Clasificación',
        alinear: 'centrado',
        colorFondo: 'color'
      }
    ];
  }

  crearTitulosPromedioGrupo() {
    this.titulosPromedioGrupo = [
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'area_academica_nombre',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'num_estudiantes',
        alias: 'Número de Estudiantes',
        alinear: 'centrado',
      },
      {
        clave: 'promedio',
        alias: 'Promedio',
        alinear: 'centrado',
      },
      {
        clave: 'valor_cualitativo',
        alias: 'Clasificación',
        alinear: 'centrado',
        colorFondo: 'color'
      }
    ];
  }

  // Nuevos títulos para la tabla de indicadores de logro
  crearTitulosIndicadoresLogro() {
    this.titulosIndicadoresLogro = [
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo_estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        clave: 'area_academica_nombre',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion_indicador_logro',
        alias: 'Indicador de Logro',
        alinear: 'izquierda',
      },
      {
        clave: 'promedio',
        alias: 'Promedio',
        alinear: 'centrado',
      },
      {
        clave: 'valor_cualitativo',
        alias: 'Clasificación',
        alinear: 'centrado',
        colorFondo: 'color'
      }
    ];
  }

  // Método para obtener el color según el valor cualitativo
  obtenerColorPorCalificacion(valorCualitativo: ValorCalificativo): string {
    return this.coloresCalificacion[valorCualitativo] || this.coloresCalificacion['Sin calificación'];
  }

  // Método para obtener un color de gráfico por índice
  obtenerColorGrafico(indice: number): string {
    return this.coloresGrafico[indice % this.coloresGrafico.length];
  }

  consultarSprints() {
    this.cargando = true;
    this.sprintsService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.sprints = response.body || [];
        
        // Establecer el sprint seleccionado (el marcado como actual)
        const sprintActual = this.sprints.find(sprint => sprint.actual == 1);
        if (sprintActual) {
          this.sprintSeleccionado = sprintActual.id;
          this.sprintActual = sprintActual.id;
        } else if (this.sprints.length > 0) {
          this.sprintSeleccionado = this.sprints[0].id;
        }
        
        this.cargarCalificacionesPorSprint();
      },
      error: (error) => {
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los sprints',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error al cargar sprints:', error);
      }
    });
  }

  cargarCalificacionesPorSprint() {
    if (!this.sprintSeleccionado) {
      this.datos = [];
      this.datosPromedio = [];
      this.datosPromedioGrupo = [];
      this.datosIndicadoresLogro = [];
      this.mostrarTablaPromedio = false;
      this.mostrarTablaPromedioGrupo = false;
      this.mostrarTablaIndicadoresLogro = false;
      return;
    }

    this.cargando = true;
    this.calificacionesService.obtenerCalificacionesPorSprintEstudiantes(this.sprintSeleccionado).subscribe({
      next: (response: any) => {
        this.datos = response.body || [];
        console.log("Datos recibidos:", this.datos);
        
        // Asignar colores a los datos originales
        this.datos.forEach(item => {
          item.color = this.obtenerColorPorCalificacion(item.valor_cualitativo);
        });
        
        // Generar datos para las tablas de promedios
        this.generarDatosPromedio();
        
        // Generar datos para la tabla de indicadores de logro
        this.generarDatosIndicadoresLogro();

        // Generar gráficos
        setTimeout(() => {
          this.generarGraficosPromedio();
        }, 500);
        
        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las calificaciones',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error al cargar calificaciones:', error);
      }
    });
  }

  // Método para generar datos de indicadores de logro
  generarDatosIndicadoresLogro() {
    if (this.datos.length === 0) {
      this.datosIndicadoresLogro = [];
      this.mostrarTablaIndicadoresLogro = false;
      return;
    }

    // Detectar si tenemos datos de indicadores de logro
    const tieneIndicadoresLogro = this.datos.some(item => 
      item.id_indicador_logro !== undefined && 
      item.descripcion_indicador_logro !== undefined
    );

    if (!tieneIndicadoresLogro) {
      console.log("No se encontraron datos de indicadores de logro");
      this.datosIndicadoresLogro = [];
      this.mostrarTablaIndicadoresLogro = false;
      return;
    }

    // Agrupar por estudiante, área académica e indicador de logro
    const agrupado: AgrupadoIndicadoresLogro = {};
    
    this.datos.forEach(item => {
      if (!item.id_estudiante || !item.id_area_academica || !item.id_indicador_logro) {
        return; // Saltar este registro si falta información importante
      }
      
      // Si no tiene descripción del indicador de logro, saltar este registro
      if (!item.descripcion_indicador_logro) {
        return;
      }
      
      const key = `${item.id_estudiante}-${item.id_area_academica}-${item.id_indicador_logro}`;
      
      if (!agrupado[key]) {
        agrupado[key] = {
          id_estudiante: item.id_estudiante,
          nombre_completo_estudiante: item.nombre_completo_estudiante,
          id_area_academica: item.id_area_academica,
          area_academica_nombre: item.area_academica_nombre,
          nombre_grupo: item.nombre_grupo,
          id_grupo: item.id_grupo,
          id_indicador_logro: item.id_indicador_logro,
          descripcion_indicador_logro: item.descripcion_indicador_logro,
          valores: [],
          promedio: 0,
          valor_cualitativo: ''
        };
      }
      
      // Agregar el valor cuantitativo (si existe)
      if (item.valor_cuantitativo !== undefined && item.valor_cuantitativo !== null) {
        const valor = parseFloat(item.valor_cuantitativo.toString());
        if (!isNaN(valor)) {
          agrupado[key].valores.push(valor);
        }
      }
    });
    
    // Calcular promedios y determinar valor cualitativo
    this.datosIndicadoresLogro = Object.values(agrupado).map((grupo: IndicadorLogroAgrupado) => {
      if (grupo.valores.length > 0) {
        const suma = grupo.valores.reduce((a: number, b: number) => a + b, 0);
        grupo.promedio = parseFloat((suma / grupo.valores.length).toFixed(2));
        
        // Determinar valor cualitativo basado en el promedio
        grupo.valor_cualitativo = this.determinarValorCualitativo(grupo.promedio);
        // Asignar color basado en el valor cualitativo
        grupo.color = this.obtenerColorPorCalificacion(grupo.valor_cualitativo);
      } else {
        grupo.promedio = 0;
        grupo.valor_cualitativo = 'Sin calificación';
        grupo.color = this.obtenerColorPorCalificacion('Sin calificación');
      }
      
      return grupo;
    });
    
    // Ordenar por grupo, estudiante, área académica e indicador de logro
    this.datosIndicadoresLogro.sort((a, b) => {
      if (a.nombre_grupo < b.nombre_grupo) return -1;
      if (a.nombre_grupo > b.nombre_grupo) return 1;
      if (a.nombre_completo_estudiante < b.nombre_completo_estudiante) return -1;
      if (a.nombre_completo_estudiante > b.nombre_completo_estudiante) return 1;
      if (a.area_academica_nombre < b.area_academica_nombre) return -1;
      if (a.area_academica_nombre > b.area_academica_nombre) return 1;
      if (a.descripcion_indicador_logro < b.descripcion_indicador_logro) return -1;
      if (a.descripcion_indicador_logro > b.descripcion_indicador_logro) return 1;
      return 0;
    });
    
    this.mostrarTablaIndicadoresLogro = this.datosIndicadoresLogro.length > 0;
    console.log("Indicadores de logro generados:", this.datosIndicadoresLogro.length);
  }

  generarDatosPromedio() {
    if (this.datos.length === 0) {
      this.datosPromedio = [];
      this.datosPromedioGrupo = [];
      this.mostrarTablaPromedio = false;
      this.mostrarTablaPromedioGrupo = false;
      return;
    }

    // Detectar qué campo usar para el parámetro
    const primerRegistro = this.datos[0];
    let campoParametro = '';
    
    if (primerRegistro.id_parametro_calificacion !== undefined) {
      campoParametro = 'id_parametro_calificacion';
    } else if (primerRegistro.parametro_calificacion_id !== undefined) {
      campoParametro = 'parametro_calificacion_id';
    } else if (primerRegistro.id_parametro !== undefined) {
      campoParametro = 'id_parametro';
    }
    
    console.log("Campo de parámetro detectado:", campoParametro);
    
    // Si no encontramos un campo de parámetro, usamos todos los datos
    let calificacionesFiltradas = this.datos;
    
    // Si encontramos el campo de parámetro, intentamos filtrar por valor 3
    if (campoParametro) {
      calificacionesFiltradas = this.datos.filter(item => item[campoParametro] === 3);
      console.log("Registros con parámetro 3:", calificacionesFiltradas.length);
      
      // Si no hay registros con parámetro 3, usamos todos los datos
      if (calificacionesFiltradas.length === 0) {
        console.log("No se encontraron registros con parámetro 3. Usando todos los datos.");
        calificacionesFiltradas = this.datos;
      }
    }
    
    // Primero generamos los promedios por estudiante
    this.generarPromediosPorEstudiante(calificacionesFiltradas);
    
    // Luego generamos los promedios por grupo
    this.generarPromediosPorGrupo(calificacionesFiltradas);
  }

  generarPromediosPorEstudiante(calificaciones: Calificacion[]) {
    // Agrupar por estudiante y área académica
    const agrupado: AgrupadoCalificaciones = {};
    
    calificaciones.forEach(item => {
      if (!item.id_estudiante || !item.id_area_academica) {
        return; // Saltar este registro si falta información importante
      }
      
      const key = `${item.id_estudiante}-${item.id_area_academica}`;
      
      if (!agrupado[key]) {
        agrupado[key] = {
          id_estudiante: item.id_estudiante,
          nombre_completo_estudiante: item.nombre_completo_estudiante,
          id_area_academica: item.id_area_academica,
          area_academica_nombre: item.area_academica_nombre,
          nombre_grupo: item.nombre_grupo,
          id_grupo: item.id_grupo,
          valores: [],
          promedio: 0,
          valor_cualitativo: ''
        };
      }
      
      // Agregar el valor cuantitativo (si existe)
      if (item.valor_cuantitativo !== undefined && item.valor_cuantitativo !== null) {
        const valor = parseFloat(item.valor_cuantitativo.toString());
        if (!isNaN(valor)) {
          agrupado[key].valores.push(valor);
        }
      }
    });
    
    // Calcular promedios y determinar valor cualitativo
    this.datosPromedio = Object.values(agrupado).map((grupo: CalificacionPromedio) => {
      if (grupo.valores.length > 0) {
        const suma = grupo.valores.reduce((a: number, b: number) => a + b, 0);
        grupo.promedio = parseFloat((suma / grupo.valores.length).toFixed(2));
        
        // Determinar valor cualitativo basado en el promedio
        grupo.valor_cualitativo = this.determinarValorCualitativo(grupo.promedio);
        // Asignar color basado en el valor cualitativo
        grupo.color = this.obtenerColorPorCalificacion(grupo.valor_cualitativo);
      } else {
        grupo.promedio = 0;
        grupo.valor_cualitativo = 'Sin calificación';
        grupo.color = this.obtenerColorPorCalificacion('Sin calificación');
      }
      
      return grupo;
    });
    
    // Ordenar por grupo, estudiante y área académica
    this.datosPromedio.sort((a, b) => {
      if (a.nombre_grupo && b.nombre_grupo) {
        if (a.nombre_grupo < b.nombre_grupo) return -1;
        if (a.nombre_grupo > b.nombre_grupo) return 1;
      }
      if (a.nombre_completo_estudiante < b.nombre_completo_estudiante) return -1;
      if (a.nombre_completo_estudiante > b.nombre_completo_estudiante) return 1;
      if (a.area_academica_nombre < b.area_academica_nombre) return -1;
      if (a.area_academica_nombre > b.area_academica_nombre) return 1;
      return 0;
    });
    
    this.mostrarTablaPromedio = this.datosPromedio.length > 0;
    console.log("Promedios por estudiante generados:", this.datosPromedio.length);
  }

  generarPromediosPorGrupo(calificaciones: Calificacion[]) {
    // Agrupar por grupo y área académica
    const agrupado: AgrupadoCalificacionesGrupo = {};
    
    calificaciones.forEach(item => {
      if (!item.id_grupo || !item.id_area_academica) {
        return; // Saltar este registro si falta información importante
      }
      
      const key = `${item.id_grupo}-${item.id_area_academica}`;
      
      if (!agrupado[key]) {
        agrupado[key] = {
          id_grupo: item.id_grupo,
          nombre_grupo: item.nombre_grupo,
          id_area_academica: item.id_area_academica,
          area_academica_nombre: item.area_academica_nombre,
          valores: [],
          promedio: 0,
          valor_cualitativo: '',
          num_estudiantes: 0,
          estudiantes: new Set<number>() // Para contar estudiantes únicos
        };
      }
      
      // Agregar el estudiante al conjunto (para conteo)
      if (item.id_estudiante) {
        agrupado[key].estudiantes!.add(item.id_estudiante);
      }
      
      // Agregar el valor cuantitativo (si existe)
      if (item.valor_cuantitativo !== undefined && item.valor_cuantitativo !== null) {
        const valor = parseFloat(item.valor_cuantitativo.toString());
        if (!isNaN(valor)) {
          agrupado[key].valores.push(valor);
        }
      }
    });
    
    // Calcular promedios y determinar valor cualitativo
    this.datosPromedioGrupo = Object.values(agrupado).map((grupo: CalificacionPromedioGrupo) => {
      // Convertir el Set de estudiantes a un número
      grupo.num_estudiantes = grupo.estudiantes ? grupo.estudiantes.size : 0;
      
      // Crear un nuevo objeto sin la propiedad estudiantes
      const grupoSinEstudiantes: CalificacionPromedioGrupo = {
        id_grupo: grupo.id_grupo,
        nombre_grupo: grupo.nombre_grupo,
        id_area_academica: grupo.id_area_academica,
        area_academica_nombre: grupo.area_academica_nombre,
        valores: grupo.valores,
        promedio: 0,
        valor_cualitativo: '',
        num_estudiantes: grupo.num_estudiantes
      };
      
      if (grupo.valores.length > 0) {
        const suma = grupo.valores.reduce((a: number, b: number) => a + b, 0);
        grupoSinEstudiantes.promedio = parseFloat((suma / grupo.valores.length).toFixed(2));
        
        // Determinar valor cualitativo basado en el promedio
        grupoSinEstudiantes.valor_cualitativo = this.determinarValorCualitativo(grupoSinEstudiantes.promedio);
        // Asignar color basado en el valor cualitativo
        grupoSinEstudiantes.color = this.obtenerColorPorCalificacion(grupoSinEstudiantes.valor_cualitativo);
      } else {
        grupoSinEstudiantes.promedio = 0;
        grupoSinEstudiantes.valor_cualitativo = 'Sin calificación';
        grupoSinEstudiantes.color = this.obtenerColorPorCalificacion('Sin calificación');
      }
      
      return grupoSinEstudiantes;
    });
    
    // Ordenar por grupo y área académica
    this.datosPromedioGrupo.sort((a, b) => {
      if (a.nombre_grupo < b.nombre_grupo) return -1;
      if (a.nombre_grupo > b.nombre_grupo) return 1;
      if (a.area_academica_nombre < b.area_academica_nombre) return -1;
      if (a.area_academica_nombre > b.area_academica_nombre) return 1;
      return 0;
    });
    
    this.mostrarTablaPromedioGrupo = this.datosPromedioGrupo.length > 0;
    console.log("Promedios por grupo generados:", this.datosPromedioGrupo.length);
  }

  determinarValorCualitativo(promedio: number): ValorCalificativo {
    if (promedio >= 4.6) return 'Excelente';
    if (promedio >= 4.0) return 'Sobresaliente';
    if (promedio >= 3.5) return 'Bueno';
    if (promedio >= 3.0) return 'Aceptable';
    if (promedio >= 1.0) return 'Insuficiente';
    return 'Sin calificación';
  }

  // Método para generar gráficos después de cargar los datos
  generarGraficosPromedio() {
    // Limpiar cualquier gráfico existente
    this.limpiarGraficos();
    
    // Generar gráficos si hay datos
    if (this.datosPromedioGrupo.length > 0) {
      this.generarGraficoPromedioGrupoArea();
      this.generarGraficoComparativoGrupos();
    }
  }

  // Limpia cualquier gráfico existente para evitar duplicaciones
  limpiarGraficos() {
    // Destruir gráficos existentes si hay
    const graficoGrupoArea = Chart.getChart("graficoPromedioGrupoArea");
    if (graficoGrupoArea) graficoGrupoArea.destroy();
    
    const graficoComparativoGrupos = Chart.getChart("graficoComparativoGrupos");
    if (graficoComparativoGrupos) graficoComparativoGrupos.destroy();
  }

  // Genera un gráfico de barras que muestra los promedios por área académica para cada grupo
  generarGraficoPromedioGrupoArea() {
    // Extraer nombres de grupos únicos
    const grupos = [...new Set(this.datosPromedioGrupo.map(d => d.nombre_grupo))];
    
    // Extraer nombres de áreas académicas únicas
    const areasAcademicas = [...new Set(this.datosPromedioGrupo.map(d => d.area_academica_nombre))];
    
    // Preparar datasets para cada área académica
    const datasets = areasAcademicas.map((area, index) => {
      // Filtrar datos para esta área y extraer promedios por grupo
      const datosArea = grupos.map(grupo => {
        const dato = this.datosPromedioGrupo.find(d => d.nombre_grupo === grupo && d.area_academica_nombre === area);
        return dato ? dato.promedio : 0;
      });
      
      // Crear array de valoraciones cualitativas para cada grupo en esta área
      const valoracionesArea = grupos.map(grupo => {
        const dato = this.datosPromedioGrupo.find(d => d.nombre_grupo === grupo && d.area_academica_nombre === area);
        return dato ? dato.valor_cualitativo : 'Sin calificación';
      });
      
      return {
        label: area,
        data: datosArea,
        backgroundColor: this.obtenerColorGrafico(index),
        borderColor: this.obtenerColorGrafico(index),
        borderWidth: 1,
        borderRadius: 6,
        // Guardar valoraciones como metadatos para usar en tooltip y datalabels
        valoraciones: valoracionesArea
      };
    });
    
    // Crear el gráfico
    const ctx = document.getElementById('graficoPromedioGrupoArea') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: grupos,
          datasets: datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Promedios por Grupo y Área Académica',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context) {
                  // Obtener la valoración del dataset
                  const dataset = context.chart.data.datasets[context.datasetIndex] as any;
                  const valoracion = dataset.valoraciones ? dataset.valoraciones[context.dataIndex] : '';
                  
                  // Devolver línea adicional con la valoración
                  return 'Valoración: ' + valoracion;
                }
              }
            },
            datalabels: {
              align: 'center',
              anchor: 'center',
              formatter: (value, context) => {
                // Obtener valoración del dataset
                const dataset = context.chart.data.datasets[context.datasetIndex] as any;
                const valoracion = dataset.valoraciones ? dataset.valoraciones[context.dataIndex] : '';
                
                // Mostrar valor y valoración abreviada
                return value.toFixed(1) + '\n(' + this.abreviarValoracion(valoracion) + ')';
              },
              font: {
                weight: 'bold',
                size: 10
              },
              color: '#333'
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 5.0,
              title: {
                display: true,
                text: 'Promedio'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Grupos'
              }
            }
          }
        }
      });
    } else {
      console.error("No se encontró el elemento para el gráfico de promedios por grupo y área");
    }
  }
  
  // Método auxiliar para abreviar las valoraciones (útil en el espacio limitado de las etiquetas)
  abreviarValoracion(valoracion: string): string {
    switch (valoracion) {
      case 'Excelente': return 'Exc';
      case 'Sobresaliente': return 'Sob';
      case 'Bueno': return 'Bue';
      case 'Aceptable': return 'Ace';
      case 'Insuficiente': return 'Ins';
      case 'Sin calificación': return 'S/C';
      default: return valoracion;
    }
  }

  // Genera un gráfico que compara el promedio general por grupo
  generarGraficoComparativoGrupos() {
    // Agrupar datos por grupo para calcular un promedio general
    const promediosPorGrupo = new Map<string, { total: number, count: number, estudiantes: Set<number> }>();
    
    // Calcular promedio general por grupo
    this.datosPromedioGrupo.forEach(dato => {
      const grupo = dato.nombre_grupo;
      if (!promediosPorGrupo.has(grupo)) {
        promediosPorGrupo.set(grupo, { 
          total: 0, 
          count: 0,
          estudiantes: new Set<number>()
        });
      }
      
      // Sumar el promedio ponderado por la cantidad de valores
      promediosPorGrupo.get(grupo)!.total += dato.promedio * dato.valores.length;
      promediosPorGrupo.get(grupo)!.count += dato.valores.length;
      
      // Añadir estudiantes
      if (dato.estudiantes) {
        dato.estudiantes.forEach(estudiante => {
          promediosPorGrupo.get(grupo)!.estudiantes.add(estudiante);
        });
      }
    });
    
    // Convertir a array con promedios finales
    const datosGrafico = Array.from(promediosPorGrupo.entries()).map(([grupo, datos], index) => {
      const promedio = datos.count > 0 ? datos.total / datos.count : 0;
      const numEstudiantes = datos.estudiantes.size;
      
      return {
        grupo,
        promedio: parseFloat(promedio.toFixed(2)),
        color: this.obtenerColorGrafico(index),
        numEstudiantes,
        valorCualitativo: this.determinarValorCualitativo(promedio)
      };
    });
    
    // Ordenar por promedio (de mayor a menor)
    datosGrafico.sort((a, b) => b.promedio - a.promedio);
    
    // Preparar datos para el gráfico
    const grupos = datosGrafico.map(d => d.grupo);
    const promedios = datosGrafico.map(d => d.promedio);
    const colores = datosGrafico.map(d => d.color);
    const valoresCualitativos = datosGrafico.map(d => d.valorCualitativo);
    
    // Crear el gráfico
    const ctx = document.getElementById('graficoComparativoGrupos') as HTMLCanvasElement;
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: grupos,
          datasets: [{
            label: 'Promedio General',
            data: promedios,
            backgroundColor: colores,
            borderColor: colores.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y', // Barras horizontales
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Promedio General por Grupo',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                afterLabel: function(context) {
                  const index = context.dataIndex;
                  return [
                    'Valoración: ' + valoresCualitativos[index],
                    'Estudiantes: ' + datosGrafico[index].numEstudiantes
                  ];
                }
              }
            },
            datalabels: {
              align: 'end',
              anchor: 'end',
              formatter: (value, context) => {
                return value.toFixed(2) + ' (' + valoresCualitativos[context.dataIndex] + ')';
              },
              font: {
                weight: 'bold'
              },
              color: '#333'
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 5.0,
              title: {
                display: true,
                text: 'Promedio'
              }
            }
          }
        }
      });
    } else {
      console.error("No se encontró el elemento para el gráfico comparativo de grupos");
    }
  }

  seleccionar(event: any) {
    if (event.accion === 'consultar') {
      this.router.navigate(['/calificaciones/detalle', event.id]);
    }
  }
}