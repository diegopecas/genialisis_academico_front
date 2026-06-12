import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { DatosMedicosService } from '../../../../../services/datos-medicos.service';
import { TiposDatosMedicosService } from '../../../../../services/tipos-datos-medicos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-dato-medico',
  templateUrl: './crear-dato-medico.component.html',
  styleUrl: './crear-dato-medico.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearDatoMedicoComponent implements OnInit {

  titulo = "Crear Dato Médico";
  accion: string = "";
  regresar = '/administracion/datos-estudiantes/datos-medicos';
  editable: boolean = true;
  submitted: boolean = false;

  tipos: any[] = [];

  model = {
    id: null,
    id_tipo_dato_medico: '',
    nombre: '',
    tipoDato: 'texto',
    opciones: '',
    orden: 0,
    activo: 1
  } as any;

  constructor(
    private datosMedicosService: DatosMedicosService,
    private tiposDatosMedicosService: TiposDatosMedicosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTipos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Dato Médico";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Dato Médico";
        this.editable = true;
        this.cargarRegistro(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Dato Médico";
        this.editable = false;
        this.cargarRegistro(id);
      }
    });
  }

  cargarTipos() {
    this.tiposDatosMedicosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tipos = response.body || response;
      }
    });
  }

  cargarRegistro(id: any) {
    this.datosMedicosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const reg = body[0];
          this.model.id = reg.id;
          this.model.id_tipo_dato_medico = reg.id_tipo_dato_medico;
          this.model.nombre = reg.nombre;
          this.model.opciones = reg.opciones || '';
          this.model.orden = reg.orden;
          this.model.activo = reg.activo;

          if (reg.es_numero == 1) this.model.tipoDato = 'numero';
          else if (reg.es_texto == 1) this.model.tipoDato = 'texto';
          else if (reg.es_parrafo == 1) this.model.tipoDato = 'parrafo';
          else if (reg.es_fecha == 1) this.model.tipoDato = 'fecha';

          if (this.accion === 'editar') {
            this.titulo = "Editar Dato Médico: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Dato Médico: " + this.model.nombre;
          }
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el registro', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }
    if (!this.model.id_tipo_dato_medico) {
      Swal.fire('Advertencia', 'Seleccione una categoría', 'warning');
      return;
    }

    const data = {
      id_tipo_dato_medico: this.model.id_tipo_dato_medico,
      nombre: this.model.nombre.trim(),
      es_numero: this.model.tipoDato === 'numero' ? 1 : 0,
      es_texto: this.model.tipoDato === 'texto' ? 1 : 0,
      es_parrafo: this.model.tipoDato === 'parrafo' ? 1 : 0,
      es_fecha: this.model.tipoDato === 'fecha' ? 1 : 0,
      opciones: this.model.opciones ? this.model.opciones.trim() : null,
      orden: this.model.orden || 0,
      activo: this.model.activo ?? 1
    } as any;

    if (this.accion === 'crear') {
      this.datosMedicosService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Dato médico creado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: () => {
          Swal.fire('Error', 'No se pudo crear el dato médico', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.datosMedicosService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Dato médico actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: () => {
          Swal.fire('Error', 'No se pudo actualizar el dato médico', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}