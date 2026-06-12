import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { TablasComponent } from '../../../common/tablas/tablas.component';

@Component({
  selector: 'app-reporte-calificaciones-pdm',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './consultar-calificaciones-pdm-x-estudiantes.component.html',
  styleUrl: './consultar-calificaciones-pdm-x-estudiantes.component.scss'
})
export class ConsultarCalificacionesPdmXEstudiantesComponent {
  titulo = "Reporte de Calificaciones PDM";

  public titulos: any[] = [];
  public titulos_resumen: any[] = [];
  public datos: any[] = [];
  public datosFiltrados: any[] = [];
  public grupos: any[] = [];
  public estudiantes: any[] = [];
  public logros: any[] = [];
  public datosResumen: any[] = [];
  public datosTotales: any[] = [];

  paneles = {
    panel1: true,
    panel2: false,
    panel3: false
  }

  public grupoSeleccionado: string = "";
  public estudianteSeleccionado: string = "";
  public logroSeleccionado: string = "";
  public filtrarPendientes: boolean = false;

  constructor(private calificacionesService: CalificacionesService) { }

  ngOnInit() {
    this.crearTitulos();
    this.consultarCalificacionesPDMXEstudiantes();
  }

  cambiar(panel:any) {
    switch (panel) {
      case "panel1": this.paneles.panel1 = !this.paneles.panel1; break;
      case "panel2": this.paneles.panel2 = !this.paneles.panel2; break;
      case "panel3": this.paneles.panel3 = !this.paneles.panel3; break;
    }
  }

  consultarCalificacionesPDMXEstudiantes() {
    this.calificacionesService.consultarCalificacionesPDMXEstudiantes().subscribe((response: any) => {
      this.datos = response.body || [];

      // Agregar la nueva columna "nombre_completo" concatenando nombre y apellido
      this.datos.forEach(item => {
        item.nombre_completo = `${item.primer_nombre} ${item.primer_apellido}`;
      });

      this.datosFiltrados = [...this.datos];
      this.extraerGrupos();
      this.extraerEstudiantes();
      this.extraerLogros();
      this.generarTablaResumen();
      this.generarTablaTotales();
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

  extraerLogros() {
    const logrosMap = new Map();
    this.datosFiltrados.forEach(item => {
      if (!logrosMap.has(item.id_logro)) {
        logrosMap.set(item.id_logro, { id_logro: item.id_logro, nombre_logro: item.nombre_logro });
      }
    });
    this.logros = Array.from(logrosMap.values());
  }

  filtrarDatos() {
    this.datosFiltrados = this.datos.filter(item =>
      (this.grupoSeleccionado === "" || Number(item.id_grupo) === Number(this.grupoSeleccionado)) &&
      (this.estudianteSeleccionado === "" || Number(item.id_estudiante) === Number(this.estudianteSeleccionado)) &&
      (this.logroSeleccionado === "" || Number(item.id_logro) === Number(this.logroSeleccionado)) &&
      (!this.filtrarPendientes || item.estado_tarea === "Pendiente")
    );
    this.generarTablaResumen();
  }
  filtrarDatosGrupos() {
    this.estudianteSeleccionado = "";
    this.logroSeleccionado = "";
    this.filtrarDatos();
    this.extraerEstudiantes();
    this.extraerLogros();
  }
  filtrarDatosLogros() {
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
    this.logroSeleccionado = "";
    this.filtrarPendientes = false;
    this.filtrarDatos();
  }

  crearTitulos() {
    this.titulos = [
      { "clave": "numero_identificacion", "alias": "Identificación", "alinear": "izquierda" },
      { "clave": "nombre_completo", "alias": "Nombre Completo", "alinear": "izquierda" }, // Nueva columna
      { "clave": "nombre_grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "nivel", "alias": "Nivel", "alinear": "centrado" },
      { "clave": "area", "alias": "Área", "alinear": "izquierda" },
      { "clave": "nombre_logro", "alias": "Logro", "alinear": "izquierda" },
      { "clave": "estado_tarea", "alias": "Estado", "alinear": "izquierda" },
      { "clave": "parametro_calificacion", "alias": "Parámetro", "alinear": "izquierda" },
      { "clave": "valor_cuantitativo", "alias": "Valor Cuantitativo", "alinear": "izquierda" },
      { "clave": "valor_cualitativo", "alias": "Valor Cualitativo", "alinear": "izquierda" },
      { "clave": "fecha_ejecucion", "alias": "Fecha Ejecución", "alinear": "izquierda" },
      { "clave": "docente_nombre_completo", "alias": "Docente", "alinear": "izquierda" }
    ];

    this.titulos_resumen = [
      { "clave": "nombre_grupo", "alias": "Grupo", "alinear": "izquierda" },
      { "clave": "area", "alias": "Área", "alinear": "izquierda" },
      { "clave": "totalEjecutados", "alias": "Ejecutados", "alinear": "centrado" },
      { "clave": "totalPendientes", "alias": "Pendientes", "alinear": "centrado" },
      { "clave": "total", "alias": "Total", "alinear": "centrado" }
    ];

  }


  generarTablaResumen() {
    const agrupadosMap = new Map();

    this.datosFiltrados.forEach(item => {
      const key = `${item.nombre_grupo}-${item.area}`;
      if (!agrupadosMap.has(key)) {
        agrupadosMap.set(key, {
          nombre_grupo: item.nombre_grupo,
          area: item.area,
          totalEjecutados: 0,
          totalPendientes: 0,
          total: 0,
          color: '' // Se asignará después
        });
      }

      const data = agrupadosMap.get(key);
      if (item.estado_tarea === "Ejecutada") {
        data.totalEjecutados += 1;
      } else if (item.estado_tarea === "Pendiente") {
        data.totalPendientes += 1;
      }
      data.total += 1;
    });

    // Asignar color después de calcular los totales
    this.datosResumen = Array.from(agrupadosMap.values()).map(item => ({
      ...item,
      color: item.totalPendientes > 0 ? '#f7d8f6' : '#94c6f7'
    }));
  }
  generarTablaTotales() {
    const agrupadosMap = new Map();
    const totalesGrupo = new Map();
    let totalGeneral = 0;

    this.datos.forEach(item => {
      const key = `${item.nombre_grupo}-${item.area}`;
      if (!agrupadosMap.has(key)) {
        agrupadosMap.set(key, {
          nombre_grupo: item.nombre_grupo,
          area: item.area,
          pendientes: 0
        });
      }

      const data = agrupadosMap.get(key);
      if (item.estado_tarea === "Pendiente") {
        data.pendientes += 1;

        // Sumar al total del grupo SOLO pendientes
        if (!totalesGrupo.has(item.nombre_grupo)) {
          totalesGrupo.set(item.nombre_grupo, 0);
        }
        totalesGrupo.set(item.nombre_grupo, totalesGrupo.get(item.nombre_grupo) + 1);

        totalGeneral += 1; // Sumar solo los pendientes al total general
      }
    });

    // Convertir los datos en una estructura de tabla
    this.datosTotales = Array.from(agrupadosMap.values());

    // Agregar las filas de totales por grupo
    totalesGrupo.forEach((total, grupo) => {
      this.datosTotales.push({
        nombre_grupo: `Total ${grupo}`,
        area: '',
        pendientes: total
      });
    });

    // Agregar el total general
    this.datosTotales.push({
      nombre_grupo: 'Total General',
      area: '',
      pendientes: totalGeneral
    });

    console.log("Tabla de Totales: ", this.datosTotales);
  }

}
