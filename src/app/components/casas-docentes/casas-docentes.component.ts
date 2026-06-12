import { Component, OnInit } from '@angular/core';
import { ConstantesService } from '../../common/constantes/constantes.service';
import { DocentesService } from '../../services/docentes.service';
import { CasasDocentesService } from '../../services/casas-docentes.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../common/header/header.component';
import { FormsModule } from '@angular/forms';
import { TablasComponent } from '../../common/tablas/tablas.component';
import { UtilService } from '../../common/constantes/util.service';

@Component({
  selector: 'app-casas-docentes',
  templateUrl: './casas-docentes.component.html',
  styleUrl: './casas-docentes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule, TablasComponent]
})
export class CasasDocentesComponent implements OnInit {
  public titulo = 'Módulo de casas docentes';

  public usuario = null as any;

  public titulos = [
    {
      clave: 'fecha',
      alias: 'id',
      alinear: 'centrado',
    },
    {
      clave: 'nombre_docente_entrega',
      alias: 'Docente entrega',
      alinear: 'izquierda',
    },
    {
      clave: 'nombre_docente_recibe',
      alias: 'Docente recibe',
      alinear: 'izquierda',
    },
    {
      clave: 'valor',
      alias: '# puntos',
      alinear: 'centrado',
    }
  ] as any[];

  public datos = [] as any[];

  public listas = {
    casasDocentes: [] as any[],
    tiposPuntos: [] as any[],
    docentesReciben: [] as any[],
    puntosCasa: [] as any[],
  };

  public model = {
    casaSeleccionada: {} as any,
    puntosNuevos: {
      numeroPuntos: 0,
      casa: {} as any,
      // tipo: {} as any,
      recibe: {} as any,
      observacion: '',
    } as any,
  };

  /**
   * 
   * @param constantesService servicio de listas de dominio, tipo singleton
   * @param docentesServices servicio crud de docentes
   * @param casasDocentesServices servicio crud de casas de docentes
   */
  constructor(
    private constantesService: ConstantesService,
    public docentesServices: DocentesService,
    private casasDocentesServices: CasasDocentesService,
    private utilService: UtilService,
  ) {}

  ngOnInit(): void {
    this.listas.casasDocentes = this.constantesService.listas.casasDocentes;
    this.listas.tiposPuntos = this.constantesService.listas.tiposPuntos;
    this.usuario  = this.utilService.obtenerUsuarioActual()
    this.docentesServices.obtenerTodos().subscribe((response:any) => {
      console.log('docentes', response);
      this.listas.docentesReciben = response.body as any[];
    });
  }

  seleccionarCasa(casa: any) {
    this.model.casaSeleccionada = casa;
    this.casasDocentesServices.obtenerPuntosByCasa(casa.id).subscribe((response:any)=>{
      this.datos = response.body as any[];
    })
  }

  guardarPuntosQuitar(casa: any) {
    if (this.model.puntosNuevos.numeroPuntos > casa.puntos_quitar) {
      Swal.fire({
        title: "Alerta!",
        text: "Ha excedido el máximo de puntos para quitar!",
        icon: "error"
      });
      return;
    }

    this.model.puntosNuevos.casa = casa;
    this.model.puntosNuevos.numeroPuntos = this.model.puntosNuevos.numeroPuntos * (-1);
    
    this.casasDocentesServices
    .registrarPuntos(this.model.puntosNuevos, this.usuario)
    .subscribe((response: any) => {
        this.model.puntosNuevos.numeroPuntos = this.model.puntosNuevos.numeroPuntos * (-1);
        this.casasDocentesServices.registrarPuntosMenos(this.model.puntosNuevos).subscribe(()=>{
          Swal.fire({
            title: "Confirmado!",
            text: "Se han quitado los puntos!",
            icon: "error"
          });
          this.recargarCasas();
          if(this.model.casaSeleccionada.id) {
            this.casasDocentesServices.obtenerPuntosByCasa(this.model.casaSeleccionada.id).subscribe((response:any)=>{
              this.datos = response.body as any[];
              
            })
          }
        });

        this.model.puntosNuevos = {
          numeroPuntos: 0,
          casa: {} as any,
          recibe: {} as any,
          observacion: '',
        } as any;
      });
  }

  guardarPuntosDar(casa: any) {
    if (this.model.puntosNuevos.numeroPuntos > casa.puntos_entregar) {
      Swal.fire({
        title: "Alerta!",
        text: "Ha excedido el máximo de puntos para entregar!",
        icon: "error"
      });
      return;
    }
    this.model.puntosNuevos.casa = casa;

    this.casasDocentesServices
      .registrarPuntos(this.model.puntosNuevos, this.usuario)
      .subscribe((response: any) => {
        this.casasDocentesServices.registrarPuntosMas(this.model.puntosNuevos).subscribe(()=>{
          Swal.fire({
            title: "Confirmado!",
            text: "Se entregaron los puntos!",
            icon: "success"
          });
          this.recargarCasas();
          if(this.model.casaSeleccionada.id) {
            this.casasDocentesServices.obtenerPuntosByCasa(this.model.casaSeleccionada.id).subscribe((response:any)=>{
              this.datos = response.body as any[];
              
            })
          }
        });
        this.model.puntosNuevos = {
          numeroPuntos: 0,
          casa: {} as any,
          recibe: {} as any,
          observacion: '',
        } as any;
      });
  }

  recargarCasas() {
    this.casasDocentesServices.obtenerTodos().subscribe((response:any)=>{
      this.listas.casasDocentes = response.body;
    });
  }
}
