import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { SprintsService } from '../../../services/sprints.service';
import { EstadosTareasService } from '../../../services/estados-tareas.service';
import { ParametrosCalificacionesService } from '../../../services/parametros-calificaciones.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { EsferasDesarrolloService } from '../../../services/esferas-desarrollo.service';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { HorariosService } from '../../../services/horarios.service';
import { CalendariosService } from '../../../services/calendarios.service';
@Component({
  selector: 'app-monitoreo-sprint',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './monitoreo-sprint.component.html',
  styleUrl: './monitoreo-sprint.component.scss'
})
export class MonitoreoSprintComponent {
  titulo = "Monitoreo Sprint";

  public titulos: any[] = [];
  public titulos_totales_por_dia: any[] = [];
  public titulos_actividades_ejecutadas: any[] = [];
  public titulos_errores_programacion: any[] = [];
  public titulos_errores_ejecucion: any[] = [];

  public datos: any[] = [];
  public datosFiltrados: any[] = [];
  public estadosTarea: any[] = [];
  public areasAcademicas: any[] = [];
  public esferasDesarrollo: any[] = [];
  public parametrosCalificaciones: any[] = [];
  public horarios: any[] = [];
  public calendarios: any[] = [];

  public grupos: any[] = [];
  public estudiantes: any[] = [];
  public sprints: any[] = [];
  public fechasEjecucion: any[] = [];
  public actividadesAcademicas: any[] = [];
  public docentes: any[] = [];

  public datosComparacion: any[] = [];
  public datosComparacionFiltrados: any[] = [];

  public datosActividadesEjecutadas: any[] = [];
  public datosActividadesEjecutadasFiltrados: any[] = [];

  public datosTotales: any[] = [];
  public datosTotalesPorDia: any[] = [];
  public datosTotalesPorDiaYGrupo: any[] = [];
  public datosCumplimiento: any[] = [];
  public datosCumplimientoParcial: any[] = [];
  public tareasEjecutadas: any[] = [];
  public tareasProgramadasArray: any[] = [];
  public calificacionesPorDocente: any[] = [];


  paneles = {
    panel1: true,
    panel2: false,
    panel3: false
  }

  public grupoSeleccionado: string = "";
  public estudianteSeleccionado: string = "";
  public estadoTareaSeleccionado: string = "";
  public areaAcademicaSeleccionada: string = "";
  public esferaDesarrolloSeleccionada: string = "";
  public parametroCalificacionSeleccionado: string = "";
  public valoracionActividadesEjecutadasSeleccionada: string = "";

  public fechaSeleccionada: string = "";
  public actividadSeleccionada: string = "";
  public docenteSeleccionado: string = "";

  public grupoSeleccionadoComparacion: string = "";
  public areaAcademicaSeleccionadaComparacion: string = "";
  public fechaSeleccionadaComparacion: string = "";
  public valoracionActividadesComparacion: string = "";


  public grupoSeleccionadoActividadesEjecutadas: string = "";
  public areaAcademicaSeleccionadaActividadesEjecutadas: string = "";
  public fechaSeleccionadaActividadesEjecutadas: string = "";
  public docenteSeleccionadoActividadesEjecutadas: string = "";
  public actividadSeleccionadaActividadesEjecutadas: string = "";


  public sprintSeleccionado: string = "";
  public sprintActual: string = "";
  public filtrarPendientes: boolean = false;

  constructor(private calificacionesService: CalificacionesService,
    private sprintsService: SprintsService,
    private estadosTareasService: EstadosTareasService,
    private parametrosCalificacionesService: ParametrosCalificacionesService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private areasAcademicasService: AreasAcademicasService,
    private horariosService: HorariosService,
    private calendariosService: CalendariosService


  ) {
    Chart.register(...registerables, ChartDataLabels);
  }

  ngOnInit() {
    this.consultarSprints();
    this.crearTitulos();
    this.consultarEstadosTareas();
    this.consultarAreasAcademicas();
    this.consultarEsferasDesarrollo();
    this.consultarHorarios();
    this.consultarParametrosCalificaciones();
    this.consultarCalendarios();


  }

  cambiar(panel: any) {
    switch (panel) {
      case "panel1": this.paneles.panel1 = !this.paneles.panel1; break;
      case "panel2": this.paneles.panel2 = !this.paneles.panel2; break;
      case "panel3": this.paneles.panel3 = !this.paneles.panel3; break;
    }
  }



  consultarSprints() {
    this.sprintsService.obtenerTodos().subscribe((response: any) => {
      this.sprints = response.body || [];
      // Modificar nombre_sprint si actual es igual a 1
      this.sprints.forEach(sprint => {
        if (sprint.actual === 1) {
          sprint.nombre_sprint += " (*** Actual*** )"; // Añadir el texto "(Actual)"
        }
      });

      // Establecer el sprint seleccionado
      this.sprintSeleccionado = this.sprints.find(sprint => sprint.actual === 1)?.id || 0;

      this.sprintActual = this.sprintSeleccionado;
      // Llamar a la función para consultar calificaciones
      this.consultarCalificacionesTareasSprintEstudiantes();
    });
  }
  consultarEstadosTareas() {
    this.estadosTareasService.obtenerTodos().subscribe((response: any) => {
      this.estadosTarea = response.body || [];
    });
  }

  consultarAreasAcademicas() {
    this.areasAcademicasService.obtenerTodos().subscribe((response: any) => {
      this.areasAcademicas = response.body || [];
    });
  }

  consultarEsferasDesarrollo() {
    this.esferasDesarrolloService.obtenerTodos().subscribe((response: any) => {
      this.esferasDesarrollo = response.body || [];
    });
  }
  consultarParametrosCalificaciones() {
    this.parametrosCalificacionesService.obtenerTodos().subscribe((response: any) => {
      this.parametrosCalificaciones = response.body || [];
    });
  }

  consultarHorarios() {
    this.horariosService.obtenerTodos().subscribe((response: any) => {
      this.horarios = response.body || [];
    });
  }
  consultarCalendarios() {
    this.calendariosService.obtenerTodos().subscribe((response: any) => {
      this.calendarios = response.body || [];
    });
  }

  consultarCalificacionesTareasSprintEstudiantes() {
    this.calificacionesService.consultarCalificacionesTareasSprintEstudiantes(this.sprintSeleccionado).subscribe((response: any) => {
      this.datos = response.body || [];
      // Agregar la nueva columna "nombre_completo" concatenando nombre y apellido
      this.datos.forEach(item => {
        item.nombre_completo = `${item.primer_nombre} ${item.primer_apellido}`;
      });

      this.datosFiltrados = [...this.datos];
      // Filtrar solo las tareas ejecutadas (id_estado_tarea = 2)
      this.tareasEjecutadas = this.datosFiltrados.filter(tarea => tarea.id_estado_tarea === 2 && tarea.fecha_ejecucion);

      this.extraerGrupos();
      this.extraerFechasEjecucion();
      this.extraerEstudiantes();
      this.extraerActividadesAcademicas()
      this.extraerDocentes();
      this.generarTotalesPorDia();
      this.generarTotalesPorDiaYGrupo();
      this.generarTotalesPorDiaGrupoYArea();
      this.generarActividadesEjecutadas();
      this.generarCalificacionPorDocente();


    });
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

  extraerFechasEjecucion() {
    const fechasMap = new Map();

    this.datosFiltrados.forEach(item => {
      // Extraer solo "YYYY-MM-DD" de fecha_ejecucion
      const fecha = new Date(item.fecha_ejecucion).toISOString().split('T')[0];

      if (!fechasMap.has(fecha)) {
        fechasMap.set(fecha, { fecha_ejecucion: fecha });
      }
    });

    // Convertir a array y ordenar por fecha
    this.fechasEjecucion = Array.from(fechasMap.values())
      .sort((a, b) => new Date(a.fecha_ejecucion).getTime() - new Date(b.fecha_ejecucion).getTime());
  }
  extraerDocentes() {
    const docentesMap = new Map();

    this.datosFiltrados.forEach(item => {
      if (item.docente_nombre_completo && item.docente_nombre_completo.trim() !== "") { // Evita valores nulos o vacíos
        const docente = item.docente_nombre_completo.trim();
        if (!docentesMap.has(docente)) {
          docentesMap.set(docente, { docente_nombre_completo: docente });
        }
      }
    });

    // Convertir a array y ordenar alfabéticamente
    this.docentes = Array.from(docentesMap.values())
      .sort((a, b) => a.docente_nombre_completo.localeCompare(b.docente_nombre_completo));
  }




  extraerActividadesAcademicas() {
    const actividadesMap = new Map();

    this.datosFiltrados.forEach(item => {
      if (!actividadesMap.has(item.actividad_academica_titulo)) {
        actividadesMap.set(item.actividad_academica_titulo, {
          actividad_academica_titulo: item.actividad_academica_titulo
        });
      }
    });

    // Convertir a array y ordenar alfabéticamente
    this.actividadesAcademicas = Array.from(actividadesMap.values())
      .sort((a, b) => a.actividad_academica_titulo.localeCompare(b.actividad_academica_titulo));
  }

  filtrarDatos() {
    this.datosFiltrados = this.datos.filter(item => {
      // Extraer solo "YYYY-MM-DD" de fecha_ejecucion para comparación
      const fechaSoloDia = new Date(item.fecha_ejecucion).toISOString().split("T")[0];

      return (
        (this.grupoSeleccionado === "" || item.id_grupo === this.grupoSeleccionado) &&
        (this.estudianteSeleccionado === "" || item.id_estudiante === this.estudianteSeleccionado) &&
        (this.estadoTareaSeleccionado === "" || String(item.id_estado_tarea) === this.estadoTareaSeleccionado) &&
        (this.areaAcademicaSeleccionada === "" || item.area_academica === this.areaAcademicaSeleccionada) &&
        (this.esferaDesarrolloSeleccionada === "" || item.nombre_esfera_desarrollo === this.esferaDesarrolloSeleccionada) &&
        (this.parametroCalificacionSeleccionado === "" || item.parametro_calificacion === this.parametroCalificacionSeleccionado) &&
        (this.fechaSeleccionada === "" || fechaSoloDia === this.fechaSeleccionada) && // Filtrar por fecha
        (this.actividadSeleccionada === "" || item.actividad_academica_titulo === this.actividadSeleccionada) && // Filtrar por actividad académica
        (this.docenteSeleccionado === "" || item.docente_nombre_completo === this.docenteSeleccionado) // Filtrar por docente
      );
    });
  }



  filtrarDatosGrupos() {
    this.estudianteSeleccionado = "";
    this.filtrarDatos();
    this.extraerEstudiantes();
    this.extraerActividadesAcademicas();

  }

  resetearFiltros() {
    this.grupoSeleccionado = "";
    this.estudianteSeleccionado = "";
    this.estadoTareaSeleccionado = "";
    this.esferaDesarrolloSeleccionada = "";
    this.parametroCalificacionSeleccionado = "";
    this.areaAcademicaSeleccionada = "";
    this.fechaSeleccionada = "";
    this.actividadSeleccionada = "";
    this.docenteSeleccionado = ""; // Resetear el filtro de docente

    if (this.sprintSeleccionado != this.sprintActual) {
      this.sprintSeleccionado = this.sprintActual;
      this.consultarCalificacionesTareasSprintEstudiantes();
    }

    this.filtrarDatos();
  }


  crearTitulos() {

    this.titulos = [
      { "clave": "nombre_completo", "alias": "Estudiante", "alinear": "izquierda" },
      { "clave": "nombre_grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "area_academica", "alias": "Área Académica", "alinear": "izquierda" },
      { "clave": "docente_nombre_completo", "alias": "Docente", "alinear": "izquierda" },
      { "clave": "actividad_academica_titulo", "alias": "Actividad Académica", "alinear": "izquierda" },
      { "clave": "estado_tarea_nombre", "alias": "Estado de Tarea", "alinear": "izquierda" },
      { "clave": "fecha_ejecucion_inicia", "alias": "Fecha Inicio", "alinear": "izquierda" },
      { "clave": "fecha_ejecucion", "alias": "Fecha Fin", "alinear": "izquierda" },
      { "clave": "parametro_calificacion", "alias": "Parámetro Calificación", "alinear": "izquierda" },
      { "clave": "valor_cuantitativo", "alias": "Valor Cuantitativo", "alinear": "izquierda" },
      { "clave": "valor_cualitativo", "alias": "Valor Cualitativo", "alinear": "izquierda" },
      { "clave": "estado_tarea_estudiante", "alias": "Tarea aplicada", "alinear": "izquierda" }

    ];



  }
  generarTotalesPorDia(): void {
    // Crear un mapa para agrupar tareas por fecha con valores únicos
    const totalesPorDia = new Map<string, Set<number>>();


    this.tareasEjecutadas.forEach(tarea => {
      // Extraer solo la fecha en formato YYYY-MM-DD
      const fecha = tarea.fecha_ejecucion.split(' ')[0];
      const idTarea = tarea.id_tarea;

      // Si la fecha no existe en el mapa, la creamos con un Set vacío
      if (!totalesPorDia.has(fecha)) {
        totalesPorDia.set(fecha, new Set());
      }

      // Agregar id_tarea al Set (evita duplicados automáticamente)
      totalesPorDia.get(fecha)!.add(idTarea);
    });

    // Array de nombres de los días de la semana
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Convertir el mapa a un array de objetos [{ fecha, diaSemana, total }] y ordenar por fecha
    this.datosTotalesPorDia = Array.from(totalesPorDia, ([fecha, tareasSet]) => {
      // Descomponer la fecha manualmente
      const [year, month, day] = fecha.split('-').map(Number);

      // Crear la fecha en UTC asegurando que sea la correcta
      const fechaUTC = new Date(Date.UTC(year, month - 1, day));

      // Obtener el nombre del día de la semana
      const diaSemana = diasSemana[fechaUTC.getUTCDay()];

      return { fecha, diaSemana, total: tareasSet.size };
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());


    this.generarGraficoTareasPorDia();

  }
  generarGraficoTareasPorDia(): void {

    // Obtener fechas y totales desde los datos calculados
    const fechas = this.datosTotalesPorDia.map(d => `${d.diaSemana} ${d.fecha}`); // Muestra "Lunes 2025-03-03"
    const totales = this.datosTotalesPorDia.map(d => d.total);

    // Destruir el gráfico anterior si existe (para evitar superposiciones)
    const chartExistente = Chart.getChart("graficoTareas");
    if (chartExistente) {
      chartExistente.destroy();
    }

    // Crear el gráfico de barras
    new Chart("graficoTareas", {
      type: 'bar',
      data: {
        labels: fechas, // Fechas en el eje X
        datasets: [{
          label: 'Tareas Ejecutadas',
          data: totales,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(75, 192, 192, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          datalabels: {
            anchor: 'center', // Centra el número dentro de la barra
            align: 'center',  // Alinea el número en el centro de la barra
            formatter: (value) => value.toFixed(0), // Muestra valores enteros
            font: { weight: 'bold', size: 12 },
            color: 'black'
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Tareas' } },
          x: { title: { display: true, text: 'Día de la Semana' } }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  generarTotalesPorDiaYGrupo(): void {
    // Crear un mapa para agrupar tareas por fecha y grupo con valores únicos
    const totalesPorDiaGrupo = new Map<string, Map<string, Set<number>>>();


    this.tareasEjecutadas.forEach(tarea => {
      // Extraer solo la fecha en formato YYYY-MM-DD
      const fecha = tarea.fecha_ejecucion.split(' ')[0];
      const grupo = tarea.nombre_grupo; // Nombre del grupo
      const idTarea = tarea.id_tarea;

      // Si la fecha no existe en el mapa, la creamos con un nuevo mapa de grupos
      if (!totalesPorDiaGrupo.has(fecha)) {
        totalesPorDiaGrupo.set(fecha, new Map());
      }

      // Si el grupo no existe en la fecha, creamos un nuevo Set de tareas
      if (!totalesPorDiaGrupo.get(fecha)!.has(grupo)) {
        totalesPorDiaGrupo.get(fecha)!.set(grupo, new Set());
      }

      // Agregar id_tarea al Set correspondiente a la fecha y grupo (evita duplicados)
      totalesPorDiaGrupo.get(fecha)!.get(grupo)!.add(idTarea);
    });

    // Array de nombres de los días de la semana
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Convertir el mapa a un array [{ fecha, diaSemana, grupo, total }] y ordenar por fecha
    this.datosTotalesPorDiaYGrupo = [];

    totalesPorDiaGrupo.forEach((gruposMap, fecha) => {
      const [year, month, day] = fecha.split('-').map(Number);
      const fechaUTC = new Date(Date.UTC(year, month - 1, day));
      const diaSemana = diasSemana[fechaUTC.getUTCDay()];

      gruposMap.forEach((tareasSet, grupo) => {
        this.datosTotalesPorDiaYGrupo.push({ fecha, diaSemana, grupo, total: tareasSet.size });
      });
    });

    // Ordenar por fecha ascendente
    this.datosTotalesPorDiaYGrupo.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());


    this.generarGraficoTareasPorDiaYGrupo();
  }


  generarGraficoTareasPorDiaYGrupo(): void {
    // Obtener las fechas únicas
    const fechas = [...new Set(this.datosTotalesPorDiaYGrupo.map(d => `${d.diaSemana} ${d.fecha}`))];

    // Obtener los nombres de los grupos únicos
    const grupos = [...new Set(this.datosTotalesPorDiaYGrupo.map(d => d.grupo))];

    // Crear los datasets para cada grupo
    const datasets = grupos.map(grupo => ({
      label: grupo,
      data: fechas.map(fecha => {
        const entry = this.datosTotalesPorDiaYGrupo.find(d => `${d.diaSemana} ${d.fecha}` === fecha && d.grupo === grupo);
        return entry ? entry.total : 0; // Si no hay datos para ese grupo y fecha, poner 0
      }),
      backgroundColor: this.getColorForGroup(grupo),
      borderColor: this.getColorForGroup(grupo),
      borderWidth: 2,
      borderRadius: 8,
      hoverBackgroundColor: this.getColorForGroup(grupo, true)
    }));

    // Destruir gráfico anterior si existe
    const chartExistente = Chart.getChart("graficoTareasPorGrupo");
    if (chartExistente) {
      chartExistente.destroy();
    }

    // Crear el gráfico de barras
    new Chart("graficoTareasPorGrupo", {
      type: 'bar',
      data: { labels: fechas, datasets },
      options: {
        responsive: true,
        plugins: {
          datalabels: {
            anchor: 'center', // Centra el número dentro de la barra
            align: 'center',  // Alinea el número en el centro de la barra
            formatter: value => value.toFixed(0),
            font: { weight: 'bold', size: 12 },
            color: 'black'
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Tareas' } },
          x: { title: { display: true, text: 'Día de la Semana' } }
        }
      },
      plugins: [ChartDataLabels]
    });
  }

  // Método auxiliar para asignar colores a cada grupo
  getColorForGroup(grupo: string, hover = false): string {
    const colores: { [key: string]: string } = {
      "Genius": hover ? 'rgba(54, 162, 235, 1)' : 'rgba(54, 162, 235, 0.8)',
      "Talents": hover ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 99, 132, 0.8)',
      "Creators": hover ? 'rgba(255, 206, 86, 1)' : 'rgba(255, 206, 86, 0.8)',
      "OtroGrupo": hover ? 'rgba(75, 192, 192, 1)' : 'rgba(75, 192, 192, 0.8)'
    };

    return colores[grupo] || 'rgba(150, 150, 150, 0.8)'; // Color gris por defecto
  }
  generarTotalesPorDiaGrupoYArea(): void {
    // Crear un mapa para agrupar tareas por fecha, grupo y área académica con valores únicos
    const totalesPorDiaGrupoArea = new Map<string, Map<string, Map<string, Set<number>>>>();

    this.tareasEjecutadas.forEach(tarea => {
      // Extraer solo la fecha en formato YYYY-MM-DD
      const fecha = tarea.fecha_ejecucion.split(' ')[0];
      const grupo = tarea.nombre_grupo; // Nombre del grupo
      const areaAcademica = tarea.area_academica.trim(); // 👈 Aseguramos que no tenga espacios extra
      const idTarea = tarea.id_tarea;

      // Si la fecha no existe en el mapa, la creamos con un nuevo mapa de grupos
      if (!totalesPorDiaGrupoArea.has(fecha)) {
        totalesPorDiaGrupoArea.set(fecha, new Map());
      }

      // Si el grupo no existe en la fecha, creamos un nuevo mapa de áreas académicas
      if (!totalesPorDiaGrupoArea.get(fecha)!.has(grupo)) {
        totalesPorDiaGrupoArea.get(fecha)!.set(grupo, new Map());
      }

      // Si el área académica no existe en el grupo, creamos un nuevo Set de tareas
      if (!totalesPorDiaGrupoArea.get(fecha)!.get(grupo)!.has(areaAcademica)) {
        totalesPorDiaGrupoArea.get(fecha)!.get(grupo)!.set(areaAcademica, new Set());
      }

      // Agregar id_tarea al Set correspondiente a la fecha, grupo y área académica (evita duplicados)
      totalesPorDiaGrupoArea.get(fecha)!.get(grupo)!.get(areaAcademica)!.add(idTarea);
    });

    // Array de nombres de los días de la semana
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    // Convertir el mapa a un array [{ fecha, diaSemana, grupo, areaAcademica, total }] y ordenar por fecha
    this.datosTotales = [];

    totalesPorDiaGrupoArea.forEach((gruposMap, fecha) => {
      const [year, month, day] = fecha.split('-').map(Number);
      const fechaUTC = new Date(Date.UTC(year, month - 1, day));
      const diaSemana = diasSemana[fechaUTC.getUTCDay()];

      gruposMap.forEach((areasMap, grupo) => {
        areasMap.forEach((tareasSet, areaAcademica) => {
          this.datosTotales.push({ fecha, diaSemana, grupo, areaAcademica, total: tareasSet.size });
        });
      });
    });

    // Ordenar por fecha ascendente
    this.datosTotales.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());


    this.titulos_totales_por_dia = [
      { "clave": "fecha", "alias": "Fecha ejecución", "alinear": "izquierda" },
      { "clave": "diaSemana", "alias": "Día Semana", "alinear": "izquierda" },
      { "clave": "grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "areaAcademica", "alias": "Área Académica", "alinear": "izquierda" }
    ];



    this.generarComparacionProgramadasVsEjecutadas();
  }

  generarTareasProgramadas(): void {
    
    // Crear un mapa para agrupar por día de la semana, grupo y área académica
    const tareasProgramadas = new Map<string, number>();
    console.log("horarios", this.horarios)
    this.horarios.forEach(horario => {
      // Obtener nombres en vez de IDs
      const idDiaSemana = horario.id_dia_semana;
      const diaSemana = horario.dia_semana_nombre.trim();
      const grupo = horario.grupo_nombre.trim();
      const areaAcademica = horario.area_academica_nombre.trim();
      const docente = horario.docente_nombre_completo.trim();
      const clave = `${idDiaSemana}-${diaSemana}-${grupo}-${areaAcademica}-${docente}`;

      if (!tareasProgramadas.has(clave)) {
        tareasProgramadas.set(clave, 0);
      }

      // Sumar total_clases al mismo día, grupo y área
      tareasProgramadas.set(clave, tareasProgramadas.get(clave)! + horario.total_clases);
    });

    // Convertir el mapa en un array con estructura clara
    this.tareasProgramadasArray = Array.from(tareasProgramadas, ([clave, total]) => {
      const [idDiaSemana,diaSemana, grupo, areaAcademica, docente] = clave.split('-');
      return { idDiaSemana, diaSemana, grupo, areaAcademica, docente, total };
    });
    console.log("generarTareasProgramadas", this.horarios, this.tareasProgramadasArray)

  }


  generarComparacionProgramadasVsEjecutadas(): void {
    this.generarTareasProgramadas();

    // Obtener todas las fechas únicas de tareas ejecutadas
    const fechasEjecutadas = new Set<string>();
    this.datosTotales.forEach(tarea => fechasEjecutadas.add(tarea.fecha));

    // Obtener primer y último día de ejecución
    const fechasOrdenadas = Array.from(fechasEjecutadas).sort();
    const fechaInicio = new Date(fechasOrdenadas[0]);
    const fechaFin = new Date(fechasOrdenadas[fechasOrdenadas.length - 1]);

    // Map para almacenar tareas ejecutadas con clave única (fecha, día, grupo, área)
    const tareasEjecutadasMap = new Map<string, { fecha: string, total: number }>();

    this.datosTotales.forEach(tarea => {
      const clave = `${tarea.fecha}-${tarea.diaSemana.trim()}-${tarea.grupo.trim()}-${tarea.areaAcademica.trim()}`;
      if (!tareasEjecutadasMap.has(clave)) {
        tareasEjecutadasMap.set(clave, { fecha: tarea.fecha, total: 0 });
      }
      tareasEjecutadasMap.get(clave)!.total += tarea.total;
    });

    // Extender las tareas programadas para cubrir todo el rango de semanas
    const tareasProgramadasExtendidas: { fecha: string; diaSemana: string; grupo: string; areaAcademica: string; docente: string; total: number }[] = [];

    // Generar fechas según la cantidad de semanas en las ejecutadas
    let fechaIter = new Date(fechaInicio);
    while (fechaIter <= fechaFin) {
      let fechaExiste = this.calendarios.some(cal => cal.fecha === fechaIter.toISOString().split('T')[0]);
      
      if (!fechaExiste){
        let diaSemana = (fechaIter.getDay() || 7);
        let tareasDeDiaSemana = this.tareasProgramadasArray.filter(tarea => tarea.idDiaSemana === diaSemana.toString());
       
        tareasDeDiaSemana.forEach(prog => {
          // Generar una fecha de la semana de acuerdo al día programado
          const fechaProgramada = this.encontrarFechaCorrespondiente(prog.diaSemana, fechaIter);

          // Convertir fecha a string en formato YYYY-MM-DD
          const fechaStr = fechaProgramada.toISOString().split("T")[0];

          tareasProgramadasExtendidas.push({
            fecha: fechaStr,
            diaSemana: prog.diaSemana,
            grupo: prog.grupo,
            areaAcademica: prog.areaAcademica,
            docente: prog.docente,
            total: prog.total
          });
        });
      }
      // Pasar a la siguiente semana
      fechaIter.setDate(fechaIter.getDate() + 1);
    }
    console.log("tareasProgramadasExtendidas", tareasProgramadasExtendidas)

    // Generar comparación de programadas vs ejecutadas
    this.datosComparacion = tareasProgramadasExtendidas.map(prog => {
      const clave = `${prog.fecha}-${prog.diaSemana}-${prog.grupo}-${prog.areaAcademica}`;

      const ejecutadas = tareasEjecutadasMap.get(clave)?.total || 0;

      // Asignar color y valoracion en una sola instrucción
      const { color, valoracion } = ejecutadas < prog.total
        ? { color: "#FAD2E1", valoracion: "Negativa" }
        : ejecutadas === prog.total
          ? { color: "#A3E4A3", valoracion: "Positiva" }
          : { color: "#FFF9C4", valoracion: "Alerta" };


      return {
        fecha: prog.fecha,
        diaSemana: prog.diaSemana,
        grupo: prog.grupo,
        areaAcademica: prog.areaAcademica,
        docente: prog.docente,
        programadas: prog.total,
        ejecutadas,
        color,
        valoracion // Agregar el campo 'valoracion'
      };
    });

    // Filtrar los registros para que solo contengan fechas menores o iguales a la fecha actual
    const fechaActual = new Date(); // Fecha actual

    this.datosComparacion = this.datosComparacion.filter(d => new Date(d.fecha) <= fechaActual);

    this.titulos_totales_por_dia = [
      { "clave": "diaSemana", "alias": "Día Semana", "alinear": "izquierda" },
      { "clave": "fecha", "alias": "Fecha ejecución", "alinear": "izquierda" },
      { "clave": "grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "areaAcademica", "alias": "Área Académica", "alinear": "izquierda" },
      { "clave": "docente", "alias": "Docente Responsable", "alinear": "izquierda" },
      { "clave": "programadas", "alias": "Programadas", "alinear": "izquierda" },
      { "clave": "ejecutadas", "alias": "Ejecutadas", "alinear": "izquierda" }
    ];

    this.filtrarDatosComparacion();
    this.generarDatosCumplimientoParcial();

  }
  generarComparacionProgramadasVsEjecutadas_(): void {
    this.generarTareasProgramadas();

    // Obtener todas las fechas únicas de tareas ejecutadas
    const fechasEjecutadas = new Set<string>();
    this.datosTotales.forEach(tarea => fechasEjecutadas.add(tarea.fecha));

    // Obtener primer y último día de ejecución
    const fechasOrdenadas = Array.from(fechasEjecutadas).sort();
    const fechaInicio = new Date(fechasOrdenadas[0]);
    const fechaFin = new Date(fechasOrdenadas[fechasOrdenadas.length - 1]);

    // Map para almacenar tareas ejecutadas con clave única (fecha, día, grupo, área)
    const tareasEjecutadasMap = new Map<string, { fecha: string, total: number }>();

    this.datosTotales.forEach(tarea => {
      const clave = `${tarea.fecha}-${tarea.diaSemana.trim()}-${tarea.grupo.trim()}-${tarea.areaAcademica.trim()}`;
      if (!tareasEjecutadasMap.has(clave)) {
        tareasEjecutadasMap.set(clave, { fecha: tarea.fecha, total: 0 });
      }
      tareasEjecutadasMap.get(clave)!.total += tarea.total;
    });

    // Extender las tareas programadas para cubrir todo el rango de semanas
    const tareasProgramadasExtendidas: { fecha: string; diaSemana: string; grupo: string; areaAcademica: string; docente: string; total: number }[] = [];

    // Generar fechas según la cantidad de semanas en las ejecutadas
    let fechaIter = new Date(fechaInicio);
    while (fechaIter <= fechaFin) {
      this.tareasProgramadasArray.forEach(prog => {
        // Generar una fecha de la semana de acuerdo al día programado
        const fechaProgramada = this.encontrarFechaCorrespondiente(prog.diaSemana, fechaIter);

        // Convertir fecha a string en formato YYYY-MM-DD
        const fechaStr = fechaProgramada.toISOString().split("T")[0];

        tareasProgramadasExtendidas.push({
          fecha: fechaStr,
          diaSemana: prog.diaSemana,
          grupo: prog.grupo,
          areaAcademica: prog.areaAcademica,
          docente: prog.docente,
          total: prog.total
        });
      });

      // Pasar a la siguiente semana
      fechaIter.setDate(fechaIter.getDate() + 7);
    }
    console.log("tareasProgramadasExtendidas", tareasProgramadasExtendidas)


    // Generar comparación de programadas vs ejecutadas
    this.datosComparacion = tareasProgramadasExtendidas.map(prog => {
      const clave = `${prog.fecha}-${prog.diaSemana}-${prog.grupo}-${prog.areaAcademica}`;

      const ejecutadas = tareasEjecutadasMap.get(clave)?.total || 0;

      // Asignar color y valoracion en una sola instrucción
      const { color, valoracion } = ejecutadas < prog.total
        ? { color: "#FAD2E1", valoracion: "Negativa" }
        : ejecutadas === prog.total
          ? { color: "#A3E4A3", valoracion: "Positiva" }
          : { color: "#FFF9C4", valoracion: "Alerta" };


      return {
        fecha: prog.fecha,
        diaSemana: prog.diaSemana,
        grupo: prog.grupo,
        areaAcademica: prog.areaAcademica,
        docente: prog.docente,
        programadas: prog.total,
        ejecutadas,
        color,
        valoracion // Agregar el campo 'valoracion'
      };
    });

    // Filtrar los registros para que solo contengan fechas menores o iguales a la fecha actual
    const fechaActual = new Date(); // Fecha actual

    this.datosComparacion = this.datosComparacion.filter(d => new Date(d.fecha) <= fechaActual);

    this.titulos_totales_por_dia = [
      { "clave": "diaSemana", "alias": "Día Semana", "alinear": "izquierda" },
      { "clave": "fecha", "alias": "Fecha ejecución", "alinear": "izquierda" },
      { "clave": "grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "areaAcademica", "alias": "Área Académica", "alinear": "izquierda" },
      { "clave": "docente", "alias": "Docente Responsable", "alinear": "izquierda" },
      { "clave": "programadas", "alias": "Programadas", "alinear": "izquierda" },
      { "clave": "ejecutadas", "alias": "Ejecutadas", "alinear": "izquierda" }
    ];

    this.filtrarDatosComparacion();
    this.generarDatosCumplimientoParcial();

  }

  /**
   * Encuentra la fecha correspondiente de una semana para un día específico.
   * @param diaSemana Día de la semana en texto (Ej: "Lunes", "Martes").
   * @param referencia Fecha de referencia dentro de la semana.
   * @returns La fecha exacta del día de la semana solicitado.
   */
  encontrarFechaCorrespondiente(diaSemana: string, referencia: Date): Date {
    const indiceDia = this.obtenerIndiceDiaSemana(diaSemana);
    const fechaEncontrada = new Date(referencia);
    const diaActual = referencia.getDay();
    fechaEncontrada.setDate(fechaEncontrada.getDate() + (indiceDia - diaActual));
    return fechaEncontrada;
  }

  /**
   * Devuelve el índice del día de la semana (0=domingo, 1=lunes, ..., 6=sábado).
   */
  obtenerIndiceDiaSemana(dia: string): number {
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return dias.indexOf(dia);
  }



  generarDatosCumplimientoParcial(): void {
    console.log ("generarDatosCumplimientoParcial",this.datosComparacion )
    // Crear un mapa para agrupar los totales de programadas y ejecutadas por grupo
    const cumplimientoMap = new Map<string, { grupo: string, programadasHastaHoy: number, ejecutadasHastaHoy: number }>();
    const fechaActual = new Date(); // Fecha actual
    // Suponiendo que 'datosComparacion' es la lista con las tareas programadas y ejecutadas
    this.datosComparacion.forEach(d => {
      const clave = d.grupo; // Agrupamos por grupo
      

      // Asegurarnos de que se inicializa el grupo si no existe en el mapa
      if (!cumplimientoMap.has(clave)) {
        cumplimientoMap.set(clave, { grupo: d.grupo, programadasHastaHoy: 0, ejecutadasHastaHoy: 0 });
      }

      // Asumiendo que la fecha está en el campo 'fecha' y que 'programadas' y 'ejecutadas' son los campos correctos
      if (new Date(d.fecha) <= fechaActual) {

        // Si la fecha de la tarea es anterior o igual a la fecha actual, sumamos los valores
        cumplimientoMap.get(clave)!.programadasHastaHoy += d.programadas;
        cumplimientoMap.get(clave)!.ejecutadasHastaHoy += d.ejecutadas;
      }
    });
   
    // Convertir el mapa a un array para almacenar en los datos de cumplimiento
    this.datosCumplimientoParcial = Array.from(cumplimientoMap.values());
    console.log ("generarDatosCumplimientoParcial- datosCumplimientoParcial",this.datosCumplimientoParcial )
    // Llamamos al gráfico después de generar los datos
    this.generarGraficoCumplimientoParcial();
  }

  generarGraficoCumplimientoParcial(): void {
    // Obtener los nombres de los grupos
    const grupos = this.datosCumplimientoParcial.map(d => d.grupo);

    // Calcular % de cumplimiento por grupo
    const cumplimiento = this.datosCumplimientoParcial.map(d =>
      d.programadasHastaHoy > 0 ? ((d.ejecutadasHastaHoy / d.programadasHastaHoy) * 100 as number).toFixed(1) : 0
    );

    // Destruir gráfico anterior si existe
    const chartExistente = Chart.getChart("graficoCumplimientoParcial");
    if (chartExistente) {
      chartExistente.destroy();
    }

    // Crear el gráfico de barras de cumplimiento por grupo
    new Chart("graficoCumplimientoParcial", {
      type: 'bar',
      data: {
        labels: grupos,
        datasets: [{
          label: '% Cumplimiento hasta la Fecha',
          data: cumplimiento,
          backgroundColor: grupos.map(grupo => this.getColorForGroup(grupo)), // Usamos colores por grupo
          hoverBackgroundColor: grupos.map(grupo => this.getColorForGroup(grupo, true)), // Color al pasar el mouse
          borderWidth: 0, // Quitamos borde
          borderRadius: 8 // Redondeamos las barras
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${(context.raw as number).toFixed(1)}%`; // 🔥 Mostrar % con 1 decimal
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, max: 150, title: { display: true, text: '% Cumplimiento' } },
          x: { title: { display: true, text: 'Grupos' } }
        }
      }
    });
  }


  /*  generarActividadesEjecutadas() {
     const actividadesMap = new Map();

     this.tareasEjecutadas.forEach(tarea => {
       // Aplicar el filtro dentro del forEach sin modificar this.tareasEjecutadas
       if (tarea.estado_tarea_estudiante !== "Aplicada") return;
 
       const fechaCompleta = new Date(tarea.fecha_ejecucion);
       const fecha = fechaCompleta.toISOString().split('T')[0]; // Obtiene solo "YYYY-MM-DD"
       const grupo = tarea.nombre_grupo;
       const area = tarea.area_academica;
       const docente = tarea.docente_nombre_completo;
       const orden = tarea.orden;
       const actividad = tarea.actividad_academica_titulo;
       const estudiante = tarea.id_estudiante; // Identificar estudiantes únicos
       const fechaEjecucion = tarea.fecha_ejecucion; // Fecha completa con hora
       const fechaEjecucionInicia = tarea.fecha_ejecucion_inicia; // Fecha de inicio completa con hora
 
       // Validar fechas antes de calcular la diferencia
       const inicioValido = fechaEjecucionInicia ? new Date(fechaEjecucionInicia).getTime() : null;
       const finValido = fechaEjecucion ? new Date(fechaEjecucion).getTime() : null;
 
       let tiempoSegundos = null; // Valor predeterminado
       let tiempoMinutos = null; // Tiempo en minutos
 
       if (inicioValido && finValido && !isNaN(inicioValido) && !isNaN(finValido)) {
         tiempoSegundos = Math.floor((finValido - inicioValido) / 1000);
         tiempoMinutos = Math.round(tiempoSegundos / 60); // Convertir a minutos y redondear
       }
 
       // Clave única sin incluir el estudiante directamente
       const clave = `${fecha}-${grupo}-${area}-${docente}-${orden}-${actividad}`;
 
       // Si la clave no existe, inicializar el objeto y crear un Set para contar estudiantes únicos
       if (!actividadesMap.has(clave)) {
         actividadesMap.set(clave, {
           fecha,
           grupo,
           area,
           docente,
           orden,
           actividad,
           fecha_ejecucion: fechaEjecucion, // Guardar fecha ejecución completa
           fecha_ejecucion_inicia: fechaEjecucionInicia, // Guardar fecha inicio completa
           estudiantesUnicos: new Set(), // Usamos un Set para evitar duplicados
           total_tiempo_segundos: tiempoSegundos, // Guardar la diferencia de tiempo en segundos
           total_tiempo_minutos: tiempoMinutos // Guardar la diferencia de tiempo en minutos
         });
       }
 
       // Agregar estudiante al Set para asegurar unicidad
       actividadesMap.get(clave).estudiantesUnicos.add(estudiante);
     });
 
     // Convertir el mapa a un array y contar estudiantes únicos
     this.datosActividadesEjecutadas = Array.from(actividadesMap.values()).map(entry => ({
       ...entry,
       total_ninos: entry.estudiantesUnicos.size // Contar estudiantes únicos
     }));
 
 
     // Convertir el mapa a un array y contar estudiantes únicos
     this.datosActividadesEjecutadas = Array.from(this.datosActividadesEjecutadas.values()).map(entry => {
       // Asignar color dependiendo de los valores de total_tiempo_minutos y total_ninos
       let color = '';
       if (entry.total_ninos === 0) {
         color = "#FAD2E1"; // Rosa si total_ninos es 0
       } else if (entry.total_tiempo_minutos <= 10 || entry.total_tiempo_minutos > 60) {
         color = "#FAD2E1"; // Rosa si total_tiempo_minutos <= 10 o > 60
       } else if (entry.total_tiempo_minutos >= 11 && entry.total_tiempo_minutos <= 19) {
         color = "#FFF9C4"; // Amarillo pastel si entre 11 y 19
       }
 
       // Agregar el campo 'color' al objeto
       return { ...entry, color };
     });
 
     // Ordenar primero por fecha, luego por orden
     this.datosActividadesEjecutadas.sort((a, b) => {
       const fechaA = new Date(a.fecha).getTime();
       const fechaB = new Date(b.fecha).getTime();
       return fechaA - fechaB || a.orden - b.orden;
     });
 
     // Actualizar títulos dinámicamente
     this.titulos_actividades_ejecutadas = [
       { "clave": "fecha", "alias": "Fecha ejecución", "alinear": "izquierda" },
       { "clave": "grupo", "alias": "Grupo", "alinear": "izquierda" },
       { "clave": "area", "alias": "Área Académica", "alinear": "izquierda" },
       { "clave": "docente", "alias": "Docente", "alinear": "izquierda" },
       { "clave": "actividad", "alias": "Actividad Académica", "alinear": "izquierda" },
       { "clave": "total_tiempo_minutos", "alias": "Tiempo", "alinear": "derecha" },
       { "clave": "total_ninos", "alias": "Calificados", "alinear": "derecha" }
     ];
     this.filtrarDatosActividadesEjecutadas();
   } */

  generarActividadesEjecutadas() {
    const actividadesMap = new Map();


    this.tareasEjecutadas.forEach(tarea => {
      // Aplicar el filtro dentro del forEach sin modificar this.tareasEjecutadas
      if (tarea.estado_tarea_estudiante !== "Aplicada") return;

      const fechaCompleta = new Date(tarea.fecha_ejecucion);
      const fecha = fechaCompleta.toISOString().split('T')[0]; // Obtiene solo "YYYY-MM-DD"
      const grupo = tarea.nombre_grupo;
      const area = tarea.area_academica;
      const docente = tarea.docente_nombre_completo;
      const orden = tarea.orden;
      const actividad = tarea.actividad_academica_titulo;
      const estudiante = tarea.id_estudiante; // Identificar estudiantes únicos
      const fechaEjecucion = tarea.fecha_ejecucion; // Fecha completa con hora
      const fechaEjecucionInicia = tarea.fecha_ejecucion_inicia; // Fecha de inicio completa con hora

      // Validar fechas antes de calcular la diferencia
      const inicioValido = fechaEjecucionInicia ? new Date(fechaEjecucionInicia).getTime() : null;
      const finValido = fechaEjecucion ? new Date(fechaEjecucion).getTime() : null;

      let tiempoSegundos = null; // Valor predeterminado
      let tiempoMinutos = null; // Tiempo en minutos

      if (inicioValido && finValido && !isNaN(inicioValido) && !isNaN(finValido)) {
        tiempoSegundos = Math.floor((finValido - inicioValido) / 1000);
        tiempoMinutos = Math.round(tiempoSegundos / 60); // Convertir a minutos y redondear
      }

      // Clave única sin incluir el estudiante directamente
      const clave = `${fecha}-${grupo}-${area}-${docente}-${orden}-${actividad}`;

      // Si la clave no existe, inicializar el objeto y crear un Set para contar estudiantes únicos
      if (!actividadesMap.has(clave)) {
        actividadesMap.set(clave, {
          fecha,
          grupo,
          area,
          docente,
          orden,
          actividad,
          fecha_ejecucion: fechaEjecucion, // Guardar fecha ejecución completa
          fecha_ejecucion_inicia: fechaEjecucionInicia, // Guardar fecha inicio completa
          estudiantesUnicos: new Set(), // Usamos un Set para evitar duplicados
          total_tiempo_segundos: tiempoSegundos, // Guardar la diferencia de tiempo en segundos
          total_tiempo_minutos: tiempoMinutos, // Guardar la diferencia de tiempo en minutos
          minutos_duracion: tarea.minutos_duracion // Incluir minutos_duracion
        });
      }

      // Agregar estudiante al Set para asegurar unicidad
      actividadesMap.get(clave).estudiantesUnicos.add(estudiante);
    });
    // Convertir el mapa a un array y contar estudiantes únicos
    this.datosActividadesEjecutadas = Array.from(actividadesMap.values()).map(entry => ({
      ...entry,
      total_ninos: entry.estudiantesUnicos.size // Contar estudiantes únicos
    }));
    // Convertir el mapa a un array y contar estudiantes únicos
    this.datosActividadesEjecutadas = Array.from(actividadesMap.values()).map(entry => {
      let color = '';
      let valoracion = "Positiva";

      // Asignar color dependiendo de los valores de total_tiempo_minutos, minutos_duracion y total_ninos
      if (entry.estudiantesUnicos.size === 0) {
        color = "#FAD2E1";
        valoracion = "Negativa";
      } else if (entry.total_tiempo_minutos < entry.minutos_duracion - 10 || entry.total_tiempo_minutos > entry.minutos_duracion + 20) {
        color = "#FAD2E1"; // Rosa si total_tiempo_minutos < minutos_duracion - 10 o > minutos_duracion + 20
        valoracion = "Negativa";
      } else if (entry.total_tiempo_minutos < entry.minutos_duracion - 20 || entry.total_tiempo_minutos > entry.minutos_duracion + 10) {
        color = "#FFF9C4"; // Amarillo pastel si total_tiempo_minutos < minutos_duracion - 20 o > minutos_duracion + 10
        valoracion = "Alerta";
      } else {
        color = "#A3E4A3";
      }

      // Agregar el campo 'color' y 'valoracion' al objeto
      return {
        ...entry,
        total_ninos: entry.estudiantesUnicos.size, // Contar estudiantes únicos
        color,
        valoracion
      };
    });

    // Ordenar primero por fecha, luego por orden
    this.datosActividadesEjecutadas.sort((a, b) => {
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaA - fechaB || a.orden - b.orden;
    });

    // Actualizar títulos dinámicamente
    this.titulos_actividades_ejecutadas = [
      { "clave": "fecha", "alias": "Fecha ejecución", "alinear": "izquierda" },
      { "clave": "grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "area", "alias": "Área Académica", "alinear": "izquierda" },
      { "clave": "docente", "alias": "Docente", "alinear": "izquierda" },
      { "clave": "actividad", "alias": "Actividad Académica", "alinear": "izquierda" },
      { "clave": "total_tiempo_minutos", "alias": "Tiempo", "alinear": "derecha" },
      { "clave": "total_ninos", "alias": "Calificados", "alinear": "derecha" }
    ];

    this.filtrarDatosActividadesEjecutadas();
  }

  filtrarDatosComparacion() {
    console.log("filtrarDatosComparacion", this.datosComparacion)
    this.datosComparacionFiltrados = this.datosComparacion.filter(item => {
      return (
        (this.grupoSeleccionadoComparacion === "" || item.grupo === this.grupoSeleccionadoComparacion) &&
        (this.areaAcademicaSeleccionadaComparacion === "" || item.areaAcademica === this.areaAcademicaSeleccionadaComparacion) &&
        (this.fechaSeleccionadaComparacion === "" || item.fecha === this.fechaSeleccionadaComparacion) &&
        (this.valoracionActividadesComparacion === "" || item.valoracion === this.valoracionActividadesComparacion)
      );
    });
  }



  resetearFiltrosComparacion() {
    this.grupoSeleccionadoComparacion = "";
    this.areaAcademicaSeleccionadaComparacion = "";
    this.fechaSeleccionadaComparacion = "";
    this.valoracionActividadesComparacion = "";
    this.filtrarDatosComparacion();
  }

  filtrarDatosActividadesEjecutadas() {
    console.log("filtrarDatosActividadesEjecutadas", this.datosActividadesEjecutadas)

    this.datosActividadesEjecutadasFiltrados = this.datosActividadesEjecutadas.filter(item => {
      return (
        (this.grupoSeleccionadoActividadesEjecutadas === "" || item.grupo === this.grupoSeleccionadoActividadesEjecutadas) &&
        (this.areaAcademicaSeleccionadaActividadesEjecutadas === "" || item.area === this.areaAcademicaSeleccionadaActividadesEjecutadas) &&
        (this.actividadSeleccionadaActividadesEjecutadas === "" || item.actividad === this.actividadSeleccionadaActividadesEjecutadas) &&
        (this.docenteSeleccionadoActividadesEjecutadas === "" || item.docente === this.docenteSeleccionadoActividadesEjecutadas) &&
        (this.valoracionActividadesEjecutadasSeleccionada === "" || item.valoracion === this.valoracionActividadesEjecutadasSeleccionada) &&
        (this.fechaSeleccionadaActividadesEjecutadas === "" || item.fecha === this.fechaSeleccionadaActividadesEjecutadas)
      );
    });
  }



  resetearFiltrosActividadesEjecutadas() {
    this.grupoSeleccionadoActividadesEjecutadas = "";
    this.areaAcademicaSeleccionadaActividadesEjecutadas = "";
    this.fechaSeleccionadaActividadesEjecutadas = "";
    this.docenteSeleccionadoActividadesEjecutadas = "";
    this.actividadSeleccionadaActividadesEjecutadas = "";
    this.filtrarDatosActividadesEjecutadas();
  }

  generarCalificacionPorDocente(): void {
    // Agrupar por docente y sumar las tareas programadas y ejecutadas
    const calificacionesPorDocente = this.datosComparacion.reduce((acc, curr) => {
      const docente = curr.docente;

      // Si el docente no está en el acumulador, inicializamos
      if (!acc[docente]) {
        acc[docente] = { programadas: 0, ejecutadas: 0 };
      }

      // Sumar las tareas programadas y ejecutadas
      acc[docente].programadas += curr.programadas;
      acc[docente].ejecutadas += curr.ejecutadas;

      return acc;
    }, {});

    // Convertir el objeto acumulado en un array para manejarlo
    const calificaciones = Object.keys(calificacionesPorDocente).map(docente => {
      const { programadas, ejecutadas } = calificacionesPorDocente[docente];

      // Calcular el porcentaje de cumplimiento
      const porcentaje = programadas > 0 ? (ejecutadas / programadas) * 100 : 0;

      return {
        docente,
        programadas,
        ejecutadas,
        porcentaje: porcentaje.toFixed(2) // Redondear el porcentaje a 2 decimales
      };
    });

    // Actualizar la vista o donde quieras mostrar las calificaciones
    console.log("Calificaciones por Docente:", calificaciones);

    // Si necesitas usar los resultados de calificaciones por docente en tu aplicación:
    this.calificacionesPorDocente = calificaciones;
  }


}
