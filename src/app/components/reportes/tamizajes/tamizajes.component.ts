import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';

import { FormsModule } from '@angular/forms';
import { TamizajePsicologiaComponent } from './tamizaje-psicologia/tamizaje-psicologia.component';
import { TamizajeFonoaudiologiaComponent } from './tamizaje-fonoaudiologia/tamizaje-fonoaudiologia.component';
import { TamizajeConsolidadoComponent } from './tamizaje-consolidado/tamizaje-consolidado.component';

@Component({
  selector: 'app-tamizajes',
  templateUrl: './tamizajes.component.html',
  styleUrls: ['./tamizajes.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FormsModule,
    TamizajePsicologiaComponent,
    TamizajeFonoaudiologiaComponent,
    TamizajeConsolidadoComponent
  ]
})
export class TamizajesComponent {
  titulo = 'Tamizajes de Desarrollo Infantil';
  tipoSeleccionado: 'psicologia' | 'fonoaudiologia' | 'consolidado' | null = null;

  seleccionarTipo(tipo: 'psicologia' | 'fonoaudiologia' | 'consolidado') {
    this.tipoSeleccionado = tipo;
  }
}