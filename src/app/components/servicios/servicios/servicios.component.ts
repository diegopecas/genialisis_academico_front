import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.scss'
})
export class ServiciosComponent {

  titulo = "Gestión de servicios";

  public titulos = [] as any[];

  public datos = [] as any[];
  public grupos = [] as any[];

  public acciones = [
    { id: 'academico', label: 'Académico', icono: '/assets/images/servicios/servicios-academico.png' },
    { id: 'extraacademico', label: 'Extra académico', icono: '/assets/images/servicios/servicios-extra-academico.png' },
    { id: 'alimentacion', label: 'Alimentación', icono: '/assets/images/servicios/servicios-alimentacion.png' },
    { id: 'vestuario', label: 'Vestuario', icono: '/assets/images/servicios/servicios-vestuario.png' },
    { id: 'insumos', label: 'Insumos', icono: '/assets/images/servicios/servicios-insumos.png' }
  ] as any[];

  constructor(
    private estudiantesService: EstudiantesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerEstudiantesXGrupo();
  }

  obtenerEstudiantesXGrupo() {
    this.estudiantesService.obtenerTodosXGrupo(0).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerEstudiantesXGrupo", body);

      this.datos = body;

      this.datos.forEach((e: any) => {
        e.nombre_completo = `${e.primer_nombre} ${e.segundo_nombre} ${e.primer_apellido} ${e.segundo_apellido}`;
        e.color = e.activo === 0 ? "#e2e9f3" : "";
        e.estado = e.activo === 0 ? "Inactivo" : "Activo";
        e.alimentacion = e.alimentacion === 0 ? "No" : "Sí";
      });
    });
  }



  eliminar(valor: any) {
    console.log("SE VA A ELMINAR EL REGISTRO " + valor);
  }

  crearTitulos() {
    this.titulos = [

      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo',
        alias: 'Nombre completo',
        alinear: 'izquierda',
      },
      {
        clave: 'alimentacion',
        alias: 'Alimentación',
        alinear: 'centrado',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      }

    ];
  }

  buscar(event: any) {
    console.log("buscar", event);
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    switch ($event.accion) {
      case 'academico':
        this.router.navigate(['/servicios/administrar-servicios-estudiante/1/'+$event.registro.id_estudiante]);
        break;
      case 'extraacademico':
        this.router.navigate(['/servicios/administrar-servicios-estudiante/2/'+$event.registro.id_estudiante]);
        break;
      case 'alimentacion':
        this.router.navigate(['/servicios/administrar-servicios-estudiante/3/'+$event.registro.id_estudiante]);
        break;
      case 'vestuario':
        this.router.navigate(['/servicios/administrar-servicios-estudiante/4/'+$event.registro.id_estudiante]);
        break;
      case 'insumos':
        this.router.navigate(['/servicios/administrar-servicios-estudiante/5/'+$event.registro.id_estudiante]);
        break;
    }
  }

 
}
