import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { Chart } from 'chart.js/auto';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { ActivatedRoute, Router } from '@angular/router';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { EstudiantesService } from '../../../services/estudiantes.service';

@Component({
  selector: 'app-reporte-calificacion-pdm-estudiante',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './consultar-calificaciones-pdm-x-estudiante.component.html',
  styleUrl: './consultar-calificaciones-pdm-x-estudiante.component.scss'
})
export class ConsultarCalificacionesPdmXEstudianteComponent {

  titulo = "Calificaciones PDM";

  public titulos = [] as any[];
  public titulosLogrosAgrupados = [] as any[];

  public estudiante:any ;
  public datos = [] as any[];
  public logrosAgrupados = [] as any[];
  public logrosAgrupadosNivel = [] as any[];
  public logrosAgrupadosArea = [] as any[];
  public porcentajeAlcanzadoNivelMasAlto:any;
  constructor(
    private route: ActivatedRoute,
    private calificacionesService: CalificacionesService,
    private estudiantesService: EstudiantesService
  ) { }


  ngOnInit() {
    this.crearTitulos();
    this.route.params
      .subscribe(params => {
        const id = params['id'];
        this.obtenerEstudiante(id);

      }
      );
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response:any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerEstudiante", body);
      this.estudiante = body[0];
      this.consultarCalificacionesPDMXEstudiante(id_estudiante);
    })
  }

  consultarCalificacionesPDMXEstudiante(id_estudiante: any) {
    console.log("consultarCalificacionesTareasSprint", id_estudiante)
    this.calificacionesService.consultarCalificacionesPDMXEstudiante(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio consultarCalificacionesPDMXEstudiante", body);
      this.datos = body;
      this.logrosAgrupados = this.agruparLogros()
      this.logrosAgrupadosNivel = this.agruparLogrosPorNivel()
      this.logrosAgrupadosArea = this.agruparLogrosPorArea()
      console.log(this.logrosAgrupados);
      console.log(this.logrosAgrupadosNivel);
      console.log(this.logrosAgrupadosArea);
      this.generarGraficoPorNivel();
      this.generarGraficoPorArea();

    })
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_logro', alias: 'Nombre del Logro', alinear: 'izquierda' },
      { clave: 'nombre_nivel', alias: 'Nivel', alinear: 'centrado' },
      { clave: 'area', alias: 'Área', alinear: 'izquierda' },
      { clave: 'estado_tarea', alias: 'Estado de la Tarea', alinear: 'izquierda' },
      { clave: 'valor_cualitativo', alias: 'Valor Cualitativo', alinear: 'izquierda' },
      { clave: 'fecha_ejecucion', alias: 'Fecha de Ejecución', alinear: 'centrado' },
      { clave: 'docente_nombre_completo', alias: 'Nombre del Docente', alinear: 'izquierda' }
    ];

    this.titulosLogrosAgrupados = [
      { clave: 'nombre_nivel', alias: 'Nivel', alinear: 'izquierda' },
      { clave: 'area', alias: 'Área', alinear: 'izquierda' },
      { clave: 'valor_esperado', alias: 'Esperado', alinear: 'izquierda' },
      { clave: 'valor_alcanzado', alias: 'Alcanzado', alinear: 'izquierda' },
      { clave: 'porcentaje_alcanzado', alias: '% Alcanzado', alinear: 'izquierda' }
    ];

  }

  

  agruparLogros_(): any[] {
    const agrupados: { [key: string]: any } = {};

    this.datos.forEach((logro) => {
      const key = `${logro.nivel}-${logro.area}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          nombre_nivel: logro.nombre_nivel,
          area: logro.area,
          valor_alcanzado: 0,
          valor_esperado: 0,
          porcentaje_alcanzado: 0,
          color: ''
        };
      }

      agrupados[key].valor_alcanzado += parseFloat(logro.valor_cuantitativo) || 0;
      agrupados[key].valor_esperado += 2;
    });

    Object.values(agrupados).forEach((grupo) => {
      grupo.porcentaje_alcanzado = grupo.valor_esperado > 0
        ? Math.round((grupo.valor_alcanzado / grupo.valor_esperado) * 100)
        : 0;

      grupo.color = this.obtenerColor(grupo.porcentaje_alcanzado);
    });

    return Object.values(agrupados);
  }

  agruparLogros(): any[] {
    const agrupados: { [key: string]: any } = {};
    this.datos.forEach((logro) => {
      const key = `${logro.nivel}-${logro.area}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          nombre_nivel: logro.nombre_nivel,
          area: logro.area,
          valor_alcanzado: 0,
          valor_esperado: 0,
          porcentaje_alcanzado: 0,
          color: ''
        };
      }

      agrupados[key].valor_alcanzado += parseFloat(logro.valor_cuantitativo) || 0;
      agrupados[key].valor_esperado += 2;
    });
    Object.values(agrupados).forEach((grupo) => {
      grupo.porcentaje_alcanzado = grupo.valor_esperado > 0
        ? Math.round((grupo.valor_alcanzado / grupo.valor_esperado) * 100)
        : 0;

      grupo.color = this.obtenerColor(grupo.porcentaje_alcanzado);
    });
    return Object.values(agrupados);
  }

  agruparLogrosPorNivel(): any[] {
    const agrupados: { [key: string]: any } = {};
    this.datos.forEach((logro) => {
      const key = `${logro.nivel}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          nivel: logro.nivel,
          valor_alcanzado: 0,
          valor_esperado: 0,
          porcentaje_alcanzado: 0,
          color: ''
        };
      }

      agrupados[key].valor_alcanzado += parseFloat(logro.valor_cuantitativo) || 0;
      agrupados[key].valor_esperado += 2;
    });
    
    Object.values(agrupados).forEach((grupo) => {
      grupo.porcentaje_alcanzado = grupo.valor_esperado > 0
        ? Math.round((grupo.valor_alcanzado / grupo.valor_esperado) * 100)
        : 0;
        
      if (this.estudiante && this.estudiante.edad == grupo.nivel ){
        this.porcentajeAlcanzadoNivelMasAlto  =  grupo.porcentaje_alcanzado 
      }
      grupo.color = this.obtenerColor(grupo.porcentaje_alcanzado);
    });


    return Object.values(agrupados);
  }

  agruparLogrosPorArea(): any[] {

    const agrupados: { [key: string]: any } = {};

    this.datos.forEach((logro) => {
      const key = `${logro.area}`;
      if (!agrupados[key]) {
        agrupados[key] = {
          area: logro.area,
          valor_alcanzado: 0,
          valor_esperado: 0,
          porcentaje_alcanzado: 0,
          color: ''
        };
      }

      agrupados[key].valor_alcanzado += parseFloat(logro.valor_cuantitativo) || 0;
      agrupados[key].valor_esperado += 2;
    });

    Object.values(agrupados).forEach((grupo) => {
      grupo.porcentaje_alcanzado = grupo.valor_esperado > 0
        ? Math.round((grupo.valor_alcanzado / grupo.valor_esperado) * 100)
        : 0;

      grupo.color = this.obtenerColor(grupo.porcentaje_alcanzado);
    });

    return Object.values(agrupados);
  }

  // Método auxiliar para asignar color según el porcentaje
  obtenerColor(porcentaje: number): string {
    if (porcentaje < 60) return '#f7d8f6';
    if (porcentaje >= 60 && porcentaje < 80) return '#f7f7c5';
    return '#94c6f7';
  }



  generarGraficoPorNivel(): void {
    const niveles = this.logrosAgrupadosNivel.map(d => d.nivel);
    const porcentajeNivel = this.logrosAgrupadosNivel.map(d => d.porcentaje_alcanzado);

    new Chart("graficoNivel", {
      type: 'bar',
      data: {
        labels: niveles,
        datasets: [{
          label: '% Desarrollo por Nivel',
          data: porcentajeNivel,
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(54, 162, 235, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value.toFixed(0), // Redondea los valores
            font: { weight: 'bold', size: 12 },
            color: 'black'
          }
        },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      },
      plugins: [ChartDataLabels] // Agregar el plugin aquí
    });
  }

  generarGraficoPorArea(): void {
    const areas = this.logrosAgrupadosArea.map(d => d.area);
    const porcentajeArea = this.logrosAgrupadosArea.map(d => d.porcentaje_alcanzado);

    new Chart("graficoArea", {
      type: 'bar',
      data: {
        labels: areas,
        datasets: [{
          label: '% Desarrollo por Área',
          data: porcentajeArea,
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(255, 159, 64, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => value.toFixed(0), // Redondea los valores
            font: { weight: 'bold', size: 12 },
            color: 'black'
          }
        },
        scales: {
          y: { beginAtZero: true, max: 100 }
        }
      },
      plugins: [ChartDataLabels] // Agregar el plugin aquí
    });
  }

}
