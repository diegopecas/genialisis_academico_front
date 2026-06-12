import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tablas_',
  templateUrl: './tablas_.component.html',
  styleUrl: './tablas_.component.scss',
})
export class TablasComponent_ implements OnChanges {
  @Input() titulos:any[] = [];
  @Input() datos:any[] = [];
  @Input() raiz:any = "";
  @Output() eliminar = new EventEmitter<any>();

  public path = ""
  public buscarTexto = "";

  public tabla:any = {
    titulos: [],
    datos: []
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["raiz"]) {
      this.path = changes["raiz"]["currentValue"];
    }
    if (changes["titulos"]) {
      this.tabla.titulos = changes["titulos"]["currentValue"];
    }
    if (changes["datos"]) {
      this.tabla.datos = changes["datos"]["currentValue"];
    }
    console.log("DATOS", this.tabla);
  }

  eliminarRegistro(valor:any) {
    Swal.fire({
      title: "¿Está seguro de borrar el registro " + valor + "?",
      text: "Esta acción no se puede revertir!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, borrarlo!"
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminar.emit(valor);
      }
    });
  }

  buscar(event:any) {
    this.buscarTexto = event;
  }
  /*ejemplo_tabla: any = {
    titulos: [
      {
        clave: 'id',
        alinear: 'centrado'
      },
      {
        clave: 'columna 1',
        alinear: 'izquierda'
      },
      {
        clave: 'columna 2',
        alinear: 'derecha'
      },
    ],
    datos: [
      {
        id: 1,
        'columna 1': 'a',
        'columna 2': 1
      },
      {
        id: 2,
        'columna 1': 'z',
        'columna 2': 3
      },
    ],
  };*/

}
