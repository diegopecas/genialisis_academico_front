import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../common/header/header.component';


@Component({
  selector: 'app-clases-ia',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './clases-ia.component.html',
  styleUrl: './clases-ia.component.scss'
})
export class ClasesIaComponent {
  titulo = 'Clases con IA';

  constructor(private router: Router) {}

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }
}