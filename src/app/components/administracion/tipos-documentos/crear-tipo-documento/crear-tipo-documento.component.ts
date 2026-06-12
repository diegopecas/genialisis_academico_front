import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import {
  TiposDocumentosService,
  TipoDocumentoCrud,
} from '../../../../services/tipos-documentos.service';
import { TiposPersonasService } from '../../../../services/tipos-personas.service';
import { TiposPersonasDocumentosService } from '../../../../services/tipos-personas-documentos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-documento',
  templateUrl: './crear-tipo-documento.component.html',
  styleUrl: './crear-tipo-documento.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class CrearTipoDocumentoComponent implements OnInit {
  titulo = 'Crear Tipo de Documento';
  accion: string = '';
  regresar = '/administracion/tipos-documentos';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    codigo: '',
    nombre: '',
    descripcion: '',
    requiere_vencimiento: false,
    dias_alerta_vencimiento: null,
    permite_multiples: true,
    requiere_firma: false,
    modificable_acudientes: true,
    activo: true,
  } as any;

  tiposPersona: any[] = [];

  constructor(
    private tiposDocumentosService: TiposDocumentosService,
    private tiposPersonasService: TiposPersonasService,
    private tiposPersonasDocumentosService: TiposPersonasDocumentosService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Tipo de Documento';
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Tipo de Documento';
        this.editable = true;
        this.cargarTipoDocumento(id);
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Tipo de Documento';
        this.editable = false;
        this.cargarTipoDocumento(id);
      }
    });
  }

  cargarTipoDocumento(id: any) {
    this.tiposDocumentosService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log('Tipo documento cargado', body);
        if (body && body.length > 0) {
          const registro = body[0];
          this.model = {
            ...registro,
            requiere_vencimiento: !!registro.requiere_vencimiento,
            permite_multiples: !!registro.permite_multiples,
            requiere_firma: !!registro.requiere_firma,
            modificable_acudientes: !!registro.modificable_acudientes,
            activo: !!registro.activo,
          };

          if (this.accion === 'editar') {
            this.titulo = 'Editar Tipo de Documento: ' + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = 'Consultar Tipo de Documento: ' + this.model.nombre;
          }

          this.cargarTiposPersona(id);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar tipo de documento', error);
        Swal.fire('Error', 'No se pudo cargar el tipo de documento', 'error');
      },
    });
  }

  cargarTiposPersona(idTipoDocumento: any) {
    this.tiposPersonasService.obtenerTodos().subscribe({
      next: (responseTp: any) => {
        const todosLostipos = responseTp.body as any[];

        this.tiposPersonasDocumentosService
          .obtenerPorTipoDocumento(idTipoDocumento)
          .subscribe({
            next: (responseAsoc: any) => {
              const asociaciones = responseAsoc.body as any[];
              console.log('Asociaciones cargadas', asociaciones);

              this.tiposPersona = todosLostipos.map((tp: any) => {
                const asoc = asociaciones.find(
                  (a: any) => a.id_tipo_persona == tp.id,
                );
                return {
                  id: tp.id,
                  nombre: tp.nombre,
                  codigo: tp.codigo,
                  asociado: !!asoc,
                  obligatorio: asoc ? !!asoc.obligatorio : false,
                  orden: asoc ? asoc.orden : null,
                };
              });
            },
            error: (error: any) => {
              console.error('Error al cargar asociaciones', error);
            },
          });
      },
      error: (error: any) => {
        console.error('Error al cargar tipos de persona', error);
      },
    });
  }

  onVencimientoChange() {
    if (!this.model.requiere_vencimiento) {
      this.model.dias_alerta_vencimiento = null;
    }
  }

  onAsociacionChange(tp: any) {
    if (!tp.asociado) {
      tp.obligatorio = false;
      tp.orden = null;
    } else {
      const maxOrden = this.tiposPersona
        .filter((t: any) => t.asociado && t.orden)
        .reduce((max: number, t: any) => Math.max(max, t.orden), 0);
      tp.orden = maxOrden + 1;
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.codigo || this.model.codigo.trim() === '') {
      Swal.fire('Advertencia', 'El código es obligatorio', 'warning');
      return;
    }

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data: TipoDocumentoCrud = {
      codigo: this.model.codigo.trim(),
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion
        ? this.model.descripcion.trim()
        : undefined,
      requiere_vencimiento: this.model.requiere_vencimiento ? 1 : 0,
      dias_alerta_vencimiento: this.model.requiere_vencimiento
        ? this.model.dias_alerta_vencimiento
        : undefined,
      permite_multiples: this.model.permite_multiples ? 1 : 0,
      requiere_firma: this.model.requiere_firma ? 1 : 0,
      modificable_acudientes: this.model.modificable_acudientes ? 1 : 0,
      activo: this.model.activo ? 1 : 0,
    };

    if (this.accion === 'crear') {
      this.tiposDocumentosService.crear(data).subscribe({
        next: (response: any) => {
          console.log('Tipo documento creado', response);
          Swal.fire(
            'Éxito',
            'Tipo de documento creado correctamente',
            'success',
          );
          this.router.navigate(['/administracion/tipos-documentos']);
        },
        error: (error: any) => {
          console.error('Error al crear tipo de documento', error);
          Swal.fire(
            'Error',
            'No se pudo crear el tipo de documento. Verifique que el código no esté duplicado.',
            'error',
          );
        },
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.tiposDocumentosService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log('Tipo documento actualizado', response);
          // Guardar asociaciones después de guardar el tipo de documento
          this.guardarAsociaciones();
        },
        error: (error: any) => {
          console.error('Error al actualizar tipo de documento', error);
          Swal.fire(
            'Error',
            'No se pudo actualizar el tipo de documento. Verifique que el código no esté duplicado.',
            'error',
          );
        },
      });
    }
  }

  private guardarAsociaciones() {
    const asociaciones = this.tiposPersona
      .filter((tp: any) => tp.asociado)
      .map((tp: any) => ({
        id_tipo_persona: tp.id,
        obligatorio: tp.obligatorio ? 1 : 0,
        orden: tp.orden || 0,
      }));

    this.tiposPersonasDocumentosService
      .guardar(this.model.id, asociaciones)
      .subscribe({
        next: (response: any) => {
          console.log('Asociaciones guardadas', response);
          Swal.fire(
            'Éxito',
            'Tipo de documento y asociaciones actualizados correctamente',
            'success',
          );
          this.router.navigate(['/administracion/tipos-documentos']);
        },
        error: (error: any) => {
          console.error('Error al guardar asociaciones', error);
          Swal.fire(
            'Advertencia',
            'El tipo de documento se actualizó pero hubo un error al guardar las asociaciones',
            'warning',
          );
        },
      });
  }

  volver() {
    this.router.navigate(['/administracion/tipos-documentos']);
  }
}
