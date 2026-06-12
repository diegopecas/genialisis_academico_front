import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatosAdicionalesService } from '../../../../services/datos-adicionales.service';
import { DatosAdicionalesXEstudianteService } from '../../../../services/datos-adicionales-x-estudiante.service';

interface DatoAdicionalVista {
  nombre: string;
  valor: string;
  observacion: string;
}

interface GrupoAdicionalVista {
  nombre_tipo: string;
  icono: string;
  datos: DatoAdicionalVista[];
}

@Component({
  selector: 'app-estudiante-datos-adicionales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estudiante-datos-adicionales.component.html',
  styleUrl: './estudiante-datos-adicionales.component.scss'
})
export class EstudianteDatosAdicionalesComponent implements OnInit {

  @Input() idEstudiante: any;

  public grupos: GrupoAdicionalVista[] = [];
  public cargando = true;
  public sinDatos = false;

  constructor(
    private datosAdicionalesService: DatosAdicionalesService,
    private datosAdicionalesXEstudianteService: DatosAdicionalesXEstudianteService
  ) {}

  ngOnInit(): void {
    if (this.idEstudiante) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    this.cargando = true;

    this.datosAdicionalesService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosAdicionalesXEstudianteService.obtenerPorEstudiante(this.idEstudiante).subscribe({
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
      valoresMap.set(Number(v.id_dato_adicional), v);
    });

    const gruposMap = new Map<number, GrupoAdicionalVista>();

    catalogo.forEach((item: any) => {
      const idTipo = Number(item.id_tipo_dato_adicional);
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