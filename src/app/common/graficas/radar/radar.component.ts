import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';

@Component({
  selector: 'app-radar',
  templateUrl: './radar.component.html',
  styleUrl: './radar.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class RadarComponent {

  // Radar
  public radarChartOptions: ChartConfiguration['options'] = {};
  public radarChartLabels: string[] = [
    "Desarrollo Neurofisiológico",
    "Desarrollo Cognitivo, Inteligencia y Creatividad",
    "Desarrollo Psicológico, Afectivo y Social",
    "Desarrollo Moral, Ético y de Valores",
    "Desarrollo Vocacional y Profesional"
  ];

  public radarChartData: ChartData<'radar'> = {
    labels: this.radarChartLabels,
    datasets: [
      { data: [65, 59, 90, 81, 56], label: 'General' },
      { data: [28, 48, 40, 19, 96], label: 'Corte 1' },
      { data: [40, 19, 96, 27, 100], label: 'Corte 2' },
      { data: [28, 48, 96, 27, 100], label: 'Corte 3' },
    ],
  };
  
  public radarChartType: ChartType = 'radar';

  // events
  public chartClicked({
    event,
    active,
  }: {
    event: ChartEvent;
    active: object[];
  }): void {
    console.log(event, active);
  }

  public chartHovered({
    event,
    active,
  }: {
    event: ChartEvent;
    active: object[];
  }): void {
    console.log(event, active);
  }
}