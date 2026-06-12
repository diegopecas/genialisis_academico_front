import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

import { AsistenciaEstudiantesService } from '../../../../services/asistencia-estudiantes.service';

// Interface para los datos de asistencia
interface AsistenciaData {
  id: number;
  id_estudiante: number;
  fecha_ingreso: string;
  fecha_salida: string | null;
  observacion_ingreso: string;
  observacion_salida: string | null;
}

// Interface para representar un día en el calendario
interface DiaAsistencia {
  fecha: Date;
  fechaFormato: string;
  diaSemana: string;
  asistio: boolean;
  entroTarde: boolean;
  salioTarde: boolean;
  horaIngreso: string | null;
  horaSalida: string | null;
  observacionIngreso: string | null;
  observacionSalida: string | null;
  esDiaLaborable: boolean;
  diaSemanaNumero: number;
}

// Interface para representar datos agrupados para gráficos
interface EstadisticasMensuales {
  diasAsistidos: number;
  diasAusentes: number;
  diasTarde: number;
  salidasTarde: number;
  porcentajeAsistencia: number;
}

@Component({
  selector: 'app-estudiante-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-asistencia.component.html',
  styleUrl: './estudiante-asistencia.component.scss'
})
export class EstudianteAsistenciaComponent implements OnInit, AfterViewInit {
  @Input() idEstudiante: string = "0";

  // Variables para la selección de meses y filtros
  public meses: { id: number, nombre: string }[] = [];
  public mesSeleccionado: number = new Date().getMonth() + 1;
  public anioSeleccionado: number = new Date().getFullYear();
  public incluirFinDeSemana: boolean = false;
  public filtroDiaSemana: number | null = null; // null = todos, 0-6 = domingo a sábado
  public nombresDias: string[] = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Variables para datos de asistencia
  public registrosAsistencia: AsistenciaData[] = [];
  public diasDelMes: DiaAsistencia[] = [];
  public estadisticasMes: EstadisticasMensuales = {
    diasAsistidos: 0,
    diasAusentes: 0,
    diasTarde: 0,
    salidasTarde: 0,
    porcentajeAsistencia: 0
  };

  // Para almacenar datos históricos de varios meses (para gráficos)
  public historicoAsistencia: Map<string, EstadisticasMensuales> = new Map();

  // Indicador de carga
  public cargando: boolean = false;

  // Variables para gráficos
  private chartAsistenciaDiaria: any = null;
  private chartAsistenciaMensual: any = null;

  constructor(
    private asistenciaEstudiantesService: AsistenciaEstudiantesService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.inicializarMeses();

    if (this.idEstudiante && this.idEstudiante !== "0") {
      this.cargarDatosAsistencia();
    }
  }

  ngAfterViewInit(): void {
    // Inicializamos los gráficos después de que el DOM esté listo
    setTimeout(() => {
      this.inicializarGraficos();
    }, 500);
  }

  // Inicializa el array de meses hasta el mes actual
  inicializarMeses(): void {
    const nombresMeses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth();
    const anioActual = fechaActual.getFullYear();

    this.anioSeleccionado = anioActual;
    this.mesSeleccionado = mesActual + 1;

    // Agregar todos los meses del año actual hasta el mes actual
    for (let i = 0; i <= mesActual; i++) {
      this.meses.push({ id: i + 1, nombre: nombresMeses[i] });
    }

    // Si estamos en los primeros meses del año, agregar también los últimos meses del año anterior
    if (mesActual < 6) {
      const mesesAnteriores = 12 - (6 - mesActual);
      for (let i = 11; i >= mesesAnteriores; i--) {
        this.meses.unshift({
          id: -(i + 1),  // Usamos números negativos para identificar meses del año anterior
          nombre: nombresMeses[i] + ' ' + (anioActual - 1)
        });
      }
    }

    // Ordenar los meses de forma cronológica
    this.meses.sort((a, b) => {
      const aAnio = a.id < 0 ? anioActual - 1 : anioActual;
      const bAnio = b.id < 0 ? anioActual - 1 : anioActual;
      const aMes = Math.abs(a.id);
      const bMes = Math.abs(b.id);

      return new Date(aAnio, aMes - 1, 1).getTime() - new Date(bAnio, bMes - 1, 1).getTime();
    });
  }

  // Método para cargar los datos de asistencia según el mes seleccionado
  cargarDatosAsistencia(): void {
    this.cargando = true;

    // Determinar el año según el ID del mes seleccionado
    const anio = this.mesSeleccionado < 0 ? this.anioSeleccionado - 1 : this.anioSeleccionado;
    const mes = Math.abs(this.mesSeleccionado);

    console.log('Cargando datos de asistencia:', {
      anio,
      mes,
      incluirFinDeSemana: this.incluirFinDeSemana,
      filtroDiaSemana: this.filtroDiaSemana,
      tipoDiaSemana: typeof this.filtroDiaSemana
    });

    // Crear objetos Date para el primer y último día del mes
    const primerDiaMes = new Date(anio, mes - 1, 1);
    const ultimoDiaMes = new Date(anio, mes, 0);

    // Generar array con todos los días del mes
    this.generarDiasMes(primerDiaMes, ultimoDiaMes);

    // Cargar registros de asistencia para cada día del mes seleccionado
    this.cargarRegistrosAsistenciaMes(anio, mes);
  }

  // Genera un array con todos los días del mes
  generarDiasMes(primerDia: Date, ultimoDia: Date): void {

    this.diasDelMes = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizar la hora actual para comparar solo fechas

    for (let dia = new Date(primerDia); dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
      // No incluir fechas futuras (posteriores a hoy)
      if (dia > hoy) {
        continue;
      }

      const diaSemanaNumero = dia.getDay(); // 0 = domingo, 6 = sábado
      const esDiaLaborable = diaSemanaNumero > 0 && diaSemanaNumero < 6; // Lunes a Viernes

      // Si no incluimos fin de semana y no es día laborable, saltamos este día
      if (!this.incluirFinDeSemana && !esDiaLaborable) {
        continue;
      }

      // Si hay un filtro de día de la semana y no coincide, saltamos este día
      // Solo aplicamos el filtro si no es null
      if (this.filtroDiaSemana !== null && diaSemanaNumero !== this.filtroDiaSemana) {
        continue;
      }

      const diaAsistencia: DiaAsistencia = {
        fecha: new Date(dia),
        fechaFormato: dia.toISOString().split('T')[0],
        diaSemana: this.nombresDias[diaSemanaNumero],
        asistio: false,
        entroTarde: false,
        salioTarde: false,
        horaIngreso: null,
        horaSalida: null,
        observacionIngreso: null,
        observacionSalida: null,
        esDiaLaborable: esDiaLaborable,
        diaSemanaNumero: diaSemanaNumero
      };

      this.diasDelMes.push(diaAsistencia);
    }

    console.log('Días del mes generados:', this.diasDelMes.length, 'días',
      'Filtro día semana:', this.filtroDiaSemana,
      'Incluir fin de semana:', this.incluirFinDeSemana);
  }



  // Carga los registros de asistencia del estudiante para el mes seleccionado
  cargarRegistrosAsistenciaMes(anio: number, mes: number): void {

    const consulta = {
      id_estudiante: this.idEstudiante,
      anio: anio,
      mes: mes
    };

    this.asistenciaEstudiantesService.obtenerAsistenciaMensual(consulta).subscribe({
      next: (response: any) => {
        // Comprobar si hay registros
        if (response && response.registros && response.registros.length > 0) {
          // Mapear los registros de asistencia a un objeto indexado por fecha para un acceso más rápido
          const registrosPorFecha: { [key: string]: any } = {};

          response.registros.forEach((registro: any) => {
            // Usar la fecha como clave para facilitar la búsqueda
            const fecha = registro.fecha_ingreso ? registro.fecha_ingreso.split(' ')[0] : null;
            if (fecha) {
              registrosPorFecha[fecha] = registro;
            }
          });

          // Ahora procesamos cada día del mes con los datos obtenidos
          this.diasDelMes.forEach(dia => {
            const registro = registrosPorFecha[dia.fechaFormato];

            if (registro) {
              // Extraer hora de ingreso y salida
              let horaIngreso = null;
              let horaSalida = null;

              if (registro.fecha_ingreso) {
                const fechaIngreso = new Date(registro.fecha_ingreso);
                horaIngreso = `${this.formatoHora(fechaIngreso.getHours())}:${this.formatoHora(fechaIngreso.getMinutes())}`;
              }

              if (registro.fecha_salida) {
                const fechaSalida = new Date(registro.fecha_salida);
                horaSalida = `${this.formatoHora(fechaSalida.getHours())}:${this.formatoHora(fechaSalida.getMinutes())}`;
              }

              // USAR HORARIOS DINÁMICOS DEL BACKEND
              // El backend ya calcula si entró/salió tarde basado en los horarios del día
              dia.entroTarde = registro.entrada_tarde === 'Sí';
              dia.salioTarde = registro.salida_tarde === 'Sí';

              // Actualizar el objeto día con la información de asistencia
              dia.asistio = true;
              dia.horaIngreso = horaIngreso;
              dia.horaSalida = horaSalida;
              dia.observacionIngreso = registro.observacion_ingreso;
              dia.observacionSalida = registro.observacion_salida;

              // Log para debug (opcional, se puede remover)
              console.log(`Día ${dia.fechaFormato}: entrada_tarde=${registro.entrada_tarde}, salida_tarde=${registro.salida_tarde}`);
            }
          });
        }

        // Con todos los datos procesados, calculamos estadísticas y actualizamos gráficos
        this.calcularEstadisticas();
        this.actualizarGraficos();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al obtener asistencia mensual:', error);
        this.cargando = false;
      }
    });
  }

  // Formato para añadir cero a las horas/minutos < 10
  formatoHora(valor: number): string {
    return valor < 10 ? `0${valor}` : `${valor}`;
  }

  // Calcular estadísticas del mes
  calcularEstadisticas(): void {
    const totalDiasLaborables = this.diasDelMes.filter(d => d.esDiaLaborable).length;
    const diasAsistidos = this.diasDelMes.filter(d => d.asistio).length;
    const diasTarde = this.diasDelMes.filter(d => d.entroTarde).length;
    const salidasTarde = this.diasDelMes.filter(d => d.salioTarde).length;

    this.estadisticasMes = {
      diasAsistidos: diasAsistidos,
      diasAusentes: totalDiasLaborables - diasAsistidos,
      diasTarde: diasTarde,
      salidasTarde: salidasTarde,
      porcentajeAsistencia: totalDiasLaborables > 0 ? (diasAsistidos / totalDiasLaborables) * 100 : 0
    };

    // Guardar estadísticas en el histórico para gráficos
    const mesKey = `${this.anioSeleccionado}-${Math.abs(this.mesSeleccionado)}`;
    this.historicoAsistencia.set(mesKey, { ...this.estadisticasMes });
  }

  // Métodos para cambio de filtros
  cambiarMes(): void {
    this.cargarDatosAsistencia();
  }

  cambiarFiltroFinDeSemana(): void {
    // Al cambiar el estado del checkbox, recargamos los datos con el nuevo filtro
    this.cargarDatosAsistencia();
  }

  cambiarFiltroDiaSemana(diaSemana: any): void {
    // Convertir el valor explícitamente
    this.filtroDiaSemana = diaSemana === "null" ? null :
      diaSemana === null ? null :
        Number(diaSemana);

    console.log('Cambiando filtro día semana a:', this.filtroDiaSemana,
      'tipo:', typeof this.filtroDiaSemana,
      'valor original:', diaSemana);

    this.cargarDatosAsistencia();
  }

  // Inicializar los gráficos
  inicializarGraficos(): void {
    // Comprobar si hay datos para inicializar los gráficos
    if (this.diasDelMes.length === 0) {
      console.log('No hay días para mostrar en los gráficos');
      return;
    }

    // Destruir gráficos anteriores si existen
    if (this.chartAsistenciaDiaria) {
      this.chartAsistenciaDiaria.destroy();
    }

    if (this.chartAsistenciaMensual) {
      this.chartAsistenciaMensual.destroy();
    }

    try {
      // Inicializar gráficos
      this.inicializarGraficoAsistenciaDiaria();
      this.inicializarGraficoAsistenciaMensual();
    } catch (error) {
      console.error('Error al inicializar gráficos:', error);
    }
  }

  // Actualizar los gráficos cuando cambian los datos
  actualizarGraficos(): void {
    setTimeout(() => {
      this.inicializarGraficos();
    }, 300);
  }

  // Inicializar el gráfico de asistencia diaria (línea)
  inicializarGraficoAsistenciaDiaria(): void {
    const canvas = document.getElementById('asistenciaDiariaChart') as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas para gráfico de asistencia diaria no encontrado');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('No se pudo obtener el contexto 2d del canvas para asistencia diaria');
      return;
    }

    // Guardar una referencia a this para usarla en las funciones de callback
    const self = this;

    // Preparar datos para el gráfico
    const labels = this.diasDelMes.map(d => `${d.fechaFormato} (${d.diaSemana.substring(0, 3)})`);

    // Convertimos las horas de ingreso y salida a valores numéricos (horas en formato decimal)
    const dataHorasIngreso = this.diasDelMes.map(d => {
      if (!d.horaIngreso) return null; // Sin datos para días sin asistencia
      const [horas, minutos] = d.horaIngreso.split(':').map(Number);
      return horas + (minutos / 60); // Convertir a formato decimal (ej: 8:30 -> 8.5)
    });

    const dataHorasSalida = this.diasDelMes.map(d => {
      if (!d.horaSalida) return null; // Sin datos para días sin registro de salida
      const [horas, minutos] = d.horaSalida.split(':').map(Number);
      return horas + (minutos / 60); // Convertir a formato decimal
    });

    // Determinar el rango del eje Y (horas)
    const horasValidas = [...dataHorasIngreso.filter(h => h !== null), ...dataHorasSalida.filter(h => h !== null)] as number[];

    if (horasValidas.length === 0) {
      console.log('No hay datos de horas para mostrar en el gráfico');
      return;
    }

    let minHora = Math.min(...horasValidas);
    let maxHora = Math.max(...horasValidas);

    // Ajustar el rango para que muestre horas completas
    minHora = Math.max(0, Math.floor(minHora) - 1); // Mínimo 0 (12 AM)
    maxHora = Math.min(24, Math.ceil(maxHora) + 1); // Máximo 24 (12 AM del día siguiente)

    // Líneas de referencia para entrada/salida estándar
    const horaEntradaEstandar = 8; // 8:00 AM
    const horaSalidaEstandarDiaLaboral = 18; // 6:00 PM

    // Crear el gráfico
    this.chartAsistenciaDiaria = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Hora de Entrada',
            data: dataHorasIngreso,
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: (context: any) => {
              // Colorear los puntos según si entró tarde
              const index = context.dataIndex;
              const dia = self.diasDelMes[index];
              return dia && dia.entroTarde ? 'rgba(255, 99, 132, 1)' : 'rgba(255, 206, 86, 1)';
            },
            tension: 0.1,
            spanGaps: false // No conectar puntos sin datos
          },
          {
            label: 'Hora de Salida',
            data: dataHorasSalida,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            pointRadius: 5,
            pointBackgroundColor: (context: any) => {
              // Colorear los puntos según si salió tarde
              const index = context.dataIndex;
              const dia = self.diasDelMes[index];
              return dia && dia.salioTarde ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
            },
            tension: 0.1,
            spanGaps: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const value = context.raw as number | null;
                if (value === null) return context.dataset.label + ': Sin datos';

                // Convertir valor decimal a formato hora:minutos
                const horas = Math.floor(value);
                const minutos = Math.round((value - horas) * 60);
                const horaFormateada = `${horas}:${minutos < 10 ? '0' + minutos : minutos}`;

                const index = context.dataIndex;
                const dia = self.diasDelMes[index];

                let estado = '';
                if (context.dataset.label === 'Hora de Entrada' && dia && dia.entroTarde) {
                  estado = ' (Tarde)';
                } else if (context.dataset.label === 'Hora de Salida' && dia && dia.salioTarde) {
                  estado = ' (Tarde)';
                }

                return `${context.dataset.label}: ${horaFormateada}${estado}`;
              }
            }
          }
        },
        scales: {
          y: {
            min: minHora,
            max: maxHora,
            title: {
              display: true,
              text: 'Hora del día'
            },
            ticks: {
              callback: (value: any) => {
                const hora = Math.floor(Number(value));
                // Mostrar horas en formato 12h (más intuitivo)
                return hora === 0 || hora === 24 ? '12 AM' :
                  hora === 12 ? '12 PM' :
                    hora < 12 ? `${hora} AM` :
                      `${hora - 12} PM`;
              }
            }
          },
          x: {
            ticks: {
              font: {
                size: 9
              },
              maxRotation: 90,
              minRotation: 45
            }
          }
        }
      }
    });

    // Agregar líneas de referencia manualmente al gráfico
    this.agregarLineasReferencia();
  }

  // Método para agregar líneas de referencia al gráfico
  agregarLineasReferencia(): void {
    // Este método se puede implementar en el futuro si decides añadir el plugin de anotaciones
    // Por ahora, es un placeholder para futuras mejoras
  }
  // Inicializar el gráfico de asistencia mensual (barras)
  inicializarGraficoAsistenciaMensual(): void {
    const canvas = document.getElementById('asistenciaMensualChart') as HTMLCanvasElement;
    if (!canvas) {
      console.log('Canvas para gráfico de asistencia mensual no encontrado');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('No se pudo obtener el contexto 2d del canvas para asistencia mensual');
      return;
    }

    // Si no hay histórico, usar solo datos del mes actual
    if (this.historicoAsistencia.size === 0) {
      const mesActual = `${this.anioSeleccionado}-${Math.abs(this.mesSeleccionado)}`;
      this.historicoAsistencia.set(mesActual, this.estadisticasMes);
    }

    // Preparar datos para el gráfico
    const meses = Array.from(this.historicoAsistencia.keys());
    const nombresMeses = meses.map(m => {
      const [anio, mesNum] = m.split('-');
      const nombreMes = new Date(parseInt(anio), parseInt(mesNum) - 1, 1)
        .toLocaleString('es', { month: 'short' });
      return `${nombreMes} ${anio}`;
    });

    const dataAsistencia = meses.map(m => this.historicoAsistencia.get(m)?.diasAsistidos || 0);
    const dataAusencias = meses.map(m => this.historicoAsistencia.get(m)?.diasAusentes || 0);
    const dataTarde = meses.map(m => this.historicoAsistencia.get(m)?.diasTarde || 0);
    const dataSalidaTarde = meses.map(m => this.historicoAsistencia.get(m)?.salidasTarde || 0);

    // Crear el gráfico
    this.chartAsistenciaMensual = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: nombresMeses,
        datasets: [
          {
            label: 'Días Asistidos',
            data: dataAsistencia,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Ausencias',
            data: dataAusencias,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          },
          {
            label: 'Entradas Tarde',
            data: dataTarde,
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
            borderColor: 'rgba(255, 206, 86, 1)',
            borderWidth: 1
          },
          {
            label: 'Salidas Tarde',
            data: dataSalidaTarde,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Número de días'
            }
          }
        }
      }
    });
  }

  // Método para obtener clase CSS según el tipo de día
  getClaseDia(dia: DiaAsistencia): string {
    if (!dia.esDiaLaborable) {
      return 'fin-de-semana';
    }
    if (dia.entroTarde) {
      return 'entrada-tarde';
    }
    if (dia.salioTarde) {
      return 'salida-tarde';
    }
    if (dia.asistio) {
      return 'asistio';
    }
    return 'no-asistio';
  }
  // Método para obtener clase CSS para las tarjetas (móvil)
  getClaseCard(dia: DiaAsistencia): string {
    if (!dia.esDiaLaborable) {
      return 'fin-semana-card';
    }
    if (!dia.asistio) {
      return 'no-asistio-card';
    }
    if (dia.salioTarde) {
      return 'salida-tarde-card';
    }
    if (dia.entroTarde) {
      return 'entrada-tarde-card';
    }
    return 'asistio-card';
  }
}