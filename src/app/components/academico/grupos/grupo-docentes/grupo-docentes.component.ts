import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-grupo-docentes',
  templateUrl: './grupo-docentes.component.html',
  styleUrl: './grupo-docentes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GrupoDocentesComponent implements OnChanges {

  @Input() idGrupo: any;
  @Input() editable: boolean = true;

  // Los datos los carga el padre una sola vez, igual que con las areas.
  // Este componente no consulta el back.
  @Input() docentes: any[] = [];
  @Input() asignadosOriginales: any[] = [];

  // La lista viaja al padre en cada cambio: el guardado lo hace el boton
  // Grabar general del grupo, no un boton propio de este tab.
  @Output() listaCambiada = new EventEmitter<any[]>();

  public asignados = [] as any[];
  public seleccionados: { [key: string]: boolean } = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['asignadosOriginales']) {
      this.reiniciar();
    }
  }

  /**
   * Copia la lista que llego del padre. Se clona para no tocar lo que el
   * padre tiene cargado hasta que se grabe.
   */
  reiniciar() {
    this.asignados = (this.asignadosOriginales || []).map(a => ({
      id_docente: a.id_docente,
      nombre_docente: a.nombre_docente,
      cargo: a.cargo,
      nivel_escolaridad: a.nivel_escolaridad,
      es_titular: Number(a.es_titular) === 1 ? 1 : 0
    }));

    this.seleccionados = {};
  }

  get titular(): any {
    return this.asignados.find(a => Number(a.es_titular) === 1) || null;
  }

  /**
   * Docentes que todavia no estan en el grupo.
   */
  get disponibles(): any[] {
    const yaEstan = this.asignados.map(a => a.id_docente);
    return (this.docentes || []).filter(d => Number(d.activo) === 1 && !yaEstan.includes(d.id));
  }

  asociarSeleccionados() {
    const ids = Object.keys(this.seleccionados).filter(k => this.seleccionados[k]);

    if (ids.length === 0) {
      Swal.fire('Advertencia', 'Seleccione al menos un docente', 'warning');
      return;
    }

    ids.forEach(id => {
      const docente = (this.docentes || []).find(d => d.id === id);

      if (!docente) return;

      this.asignados.push({
        id_docente: docente.id,
        nombre_docente: docente.nombre_completo,
        cargo: docente.cargo,
        nivel_escolaridad: docente.nivel_escolaridad,
        // El primero que entra queda de titular: evita que el grupo se
        // quede sin titular por olvido.
        es_titular: this.asignados.length === 0 ? 1 : 0
      });
    });

    this.seleccionados = {};
    this.avisar();
  }

  quitar(asignado: any) {
    this.asignados = this.asignados.filter(a => a.id_docente !== asignado.id_docente);

    // Si se quito el titular, el primero que quede toma el relevo.
    if (Number(asignado.es_titular) === 1 && this.asignados.length > 0) {
      this.asignados[0].es_titular = 1;
    }

    this.avisar();
  }

  marcarTitular(asignado: any) {
    this.asignados.forEach(a => a.es_titular = 0);
    asignado.es_titular = 1;
    this.avisar();
  }


  private avisar() {
    this.listaCambiada.emit(this.asignados.map(a => ({
      id_docente: a.id_docente,
      es_titular: a.es_titular
    })));
  }
}
