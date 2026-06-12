import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatosMedicosService } from '../../../../services/datos-medicos.service';
import { DatosMedicosXEstudianteService } from '../../../../services/datos-medicos-x-estudiante.service';

interface DatoMedicoVista {
  nombre: string;
  valor: string;
  observacion: string;
}

interface GrupoMedicoVista {
  nombre_tipo: string;
  icono: string;
  datos: DatoMedicoVista[];
}

@Component({
  selector: 'app-estudiante-datos-medicos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estudiante-datos-medicos.component.html',
  styleUrl: './estudiante-datos-medicos.component.scss'
})
export class EstudianteDatosMedicosComponent implements OnInit {

  @Input() idEstudiante: any;

  public grupos: GrupoMedicoVista[] = [];
  public cargando = true;
  public sinDatos = false;

  constructor(
    private datosMedicosService: DatosMedicosService,
    private datosMedicosXEstudianteService: DatosMedicosXEstudianteService
  ) {}

  ngOnInit(): void {
    if (this.idEstudiante) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    this.cargando = true;

    this.datosMedicosService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosMedicosXEstudianteService.obtenerPorEstudiante(this.idEstudiante).subscribe({
          next: (responseValores: any) => {
            const valores = responseValores.body || responseValores;
            this.construirGrupos(catalogo, valores);
            this.cargando = false;
          },
          error: () => {
            this.construirGrupos(catalogo, []);
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.cargando = false;
        this.sinDatos = true;
      }
    });
  }

  construirGrupos(catalogo: any[], valores: any[]) {
    const valoresMap = new Map<number, any>();
    valores.forEach((v: any) => {
      valoresMap.set(Number(v.id_dato_medico), v);
    });

    const gruposMap = new Map<number, GrupoMedicoVista>();

    catalogo.forEach((item: any) => {
      const idTipo = Number(item.id_tipo_dato_medico);
      const valor = valoresMap.get(Number(item.id));

      if (!valor) return;

      let valorTexto = '';
      if (Number(item.es_numero) === 1 && valor.valor_numero !== null) {
        valorTexto = String(valor.valor_numero);
      } else if (Number(item.es_texto) === 1 && valor.valor_texto) {
        valorTexto = valor.valor_texto;
      } else if (Number(item.es_parrafo) === 1 && valor.valor_parrafo) {
        valorTexto = valor.valor_parrafo;
      } else if (Number(item.es_fecha) === 1 && valor.valor_fecha) {
        valorTexto = this.formatearFecha(valor.valor_fecha);
      }

      if (!valorTexto && !valor.observacion) return;

      if (!gruposMap.has(idTipo)) {
        gruposMap.set(idTipo, {
          nombre_tipo: item.nombre_tipo,
          icono: item.icono_tipo || '',
          datos: []
        });
      }

      gruposMap.get(idTipo)!.datos.push({
        nombre: item.nombre,
        valor: valorTexto,
        observacion: valor.observacion || ''
      });
    });

    this.grupos = Array.from(gruposMap.values());
    this.sinDatos = this.grupos.length === 0;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fecha;
  }
}