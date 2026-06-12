import { Component } from '@angular/core';
import { PersonasService } from '../../services/personas.service';
import { GenerosService } from '../../services/generos.service';
import { TiposIdentificacionService } from '../../services/tipos-identificacion.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-personas',
  templateUrl: './personas.component.html',
  styleUrls: ['./personas.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PersonasComponent {

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
  }

  public model = {
    idPersona: 0 as any,
    tipoIdentificacion: 0 as any,
    numeroIdentificacion: 0 as any,
    primerNombre: "" as any,
    segundoNombre: "" as any,
    primerApellido: "" as any,
    segundoApellido: "" as any,
    fechaNacimiento: "" as any,
    genero: 0 as any,
    direccion: "" as any,
    correoElectronico: "" as any
  }

  constructor(
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private personasService: PersonasService
  ) {
    this.consultarListas();
  }

  consultarListas() {
    this.tiposIdentificacionService.obtenerTodos().subscribe((response:any)=>{
      console.log(response);
      this.listas.tiposIdentificacion = response.body;
    });
    this.generosService.obtenerTodos().subscribe((response:any)=>{
      console.log(response);
      this.listas.generos = response.body;
    });
  }

  consultaPersona() {
    this.personasService.obtenerByIdentificacion(this.model.tipoIdentificacion, this.model.numeroIdentificacion).subscribe((response:any)=>{
        console.log(response);
        const datos = response.body;
        if(datos.length > 0) {
          this.model.idPersona = datos[0].id;
          this.model.primerNombre = datos[0].primer_nombre;
          this.model.segundoNombre = datos[0].segundo_nombre;
          this.model.primerApellido = datos[0].primer_apellido;
          this.model.segundoApellido = datos[0].segundo_apellido;
          this.model.fechaNacimiento = datos[0].fecha_nacimiento;
          this.model.genero = datos[0].id_genero;
          this.model.direccion = datos[0].direccion;
          this.model.correoElectronico = datos[0].correo_electronico;
        }
      });
    }
}
