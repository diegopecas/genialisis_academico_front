import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { Router } from '@angular/router';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { GruposService } from '../../../services/grupos.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-actualizacion-datos-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './actualizacion-datos-estudiantes.component.html',
  styleUrl: './actualizacion-datos-estudiantes.component.scss'
})
export class ActualizacionDatosEstudiantesComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = 'Actualización Masiva de Datos';
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Nombre completo', 'Grupo', 'Estado', 'Año', 'Alimentación'];

  public cantidadSeleccionada = 0;
  public listas = {
    annos: [] as any[],
    grupos: [] as any[]
  };

  constructor(
    private router: Router,
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit() {
    this.crearTitulos();
    this.obtenerEstudiantes();
    this.consultarAnnos();
    this.consultarGrupos();
  }

  consultarAnnos() {
    this.listas.annos = this.institucionConfigService.getAnnosEscolares();
  }

  consultarGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.listas.grupos = response.body as any[];
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id_estudiante', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'nombre_completo', alias: 'Nombre completo', alinear: 'izquierda' },
      { clave: 'anno', alias: 'Año', alinear: 'centrado' },
      { clave: 'alimentacion_texto', alias: 'Alimentación', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' }
    ];
  }

  obtenerEstudiantes() {
    this.estudiantesService.obtenerTodosXGrupo(0).subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body.map((e: any) => ({
        ...e,
        nombre_completo: `${e.primer_nombre} ${e.segundo_nombre || ''} ${e.primer_apellido} ${e.segundo_apellido || ''}`.replace(/\s+/g, ' ').trim(),
        estado: e.activo === 0 ? 'Inactivo' : 'Activo',
        alimentacion_texto: e.alimentacion === 0 ? 'No' : 'Sí',
        color: e.activo === 0 ? '#e2e9f3' : ''
      }));
    });
  }

  onSeleccionCambiada(seleccionados: any[]) {
    this.cantidadSeleccionada = seleccionados.length;
  }

  async actualizarSeleccionados() {
    if (!this.tablasComponent) return;

    const seleccionados = this.tablasComponent.obtenerSeleccionados();

    if (seleccionados.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos un estudiante',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const opcionesAnnos = this.listas.annos.reduce((acc: any, a: any) => {
      acc[a.id] = a.nombre;
      return acc;
    }, {});

    const opcionesGrupos = this.listas.grupos.reduce((acc: any, g: any) => {
      acc[g.id] = g.nombre;
      return acc;
    }, {});

    const { value: formValues } = await Swal.fire({
      title: 'Actualización Masiva',
      html: `
        <div class="text-start">
          <p class="mb-3">Seleccionados: <strong>${seleccionados.length}</strong> estudiantes</p>
          
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="chkActivo">
              <label class="form-check-label" for="chkActivo">Cambiar Estado</label>
            </div>
            <select class="form-select form-select-sm mt-1" id="selActivo" disabled>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="chkAnno">
              <label class="form-check-label" for="chkAnno">Cambiar Año</label>
            </div>
            <select class="form-select form-select-sm mt-1" id="selAnno" disabled>
              ${Object.entries(opcionesAnnos).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          
          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="chkAlimentacion">
              <label class="form-check-label" for="chkAlimentacion">Cambiar Alimentación</label>
            </div>
            <select class="form-select form-select-sm mt-1" id="selAlimentacion" disabled>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </div>

          <div class="mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="chkGrupo">
              <label class="form-check-label" for="chkGrupo">Cambiar Grupo</label>
            </div>
            <select class="form-select form-select-sm mt-1" id="selGrupo" disabled>
              ${Object.entries(opcionesGrupos).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aplicar Cambios',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const chkActivo = document.getElementById('chkActivo') as HTMLInputElement;
        const chkAnno = document.getElementById('chkAnno') as HTMLInputElement;
        const chkAlimentacion = document.getElementById('chkAlimentacion') as HTMLInputElement;
        const chkGrupo = document.getElementById('chkGrupo') as HTMLInputElement;
        const selActivo = document.getElementById('selActivo') as HTMLSelectElement;
        const selAnno = document.getElementById('selAnno') as HTMLSelectElement;
        const selAlimentacion = document.getElementById('selAlimentacion') as HTMLSelectElement;
        const selGrupo = document.getElementById('selGrupo') as HTMLSelectElement;

        chkActivo.addEventListener('change', () => selActivo.disabled = !chkActivo.checked);
        chkAnno.addEventListener('change', () => selAnno.disabled = !chkAnno.checked);
        chkAlimentacion.addEventListener('change', () => selAlimentacion.disabled = !chkAlimentacion.checked);
        chkGrupo.addEventListener('change', () => selGrupo.disabled = !chkGrupo.checked);
      },
      preConfirm: () => {
        const chkActivo = document.getElementById('chkActivo') as HTMLInputElement;
        const chkAnno = document.getElementById('chkAnno') as HTMLInputElement;
        const chkAlimentacion = document.getElementById('chkAlimentacion') as HTMLInputElement;
        const chkGrupo = document.getElementById('chkGrupo') as HTMLInputElement;
        const selActivo = document.getElementById('selActivo') as HTMLSelectElement;
        const selAnno = document.getElementById('selAnno') as HTMLSelectElement;
        const selAlimentacion = document.getElementById('selAlimentacion') as HTMLSelectElement;
        const selGrupo = document.getElementById('selGrupo') as HTMLSelectElement;

        if (!chkActivo.checked && !chkAnno.checked && !chkAlimentacion.checked && !chkGrupo.checked) {
          Swal.showValidationMessage('Debe seleccionar al menos un campo a modificar');
          return false;
        }

        return {
          cambiarActivo: chkActivo.checked,
          activo: parseInt(selActivo.value),
          cambiarAnno: chkAnno.checked,
          anno: parseInt(selAnno.value),
          cambiarAlimentacion: chkAlimentacion.checked,
          alimentacion: parseInt(selAlimentacion.value),
          cambiarGrupo: chkGrupo.checked,
          grupo: parseInt(selGrupo.value)
        };
      }
    });

    if (formValues) {
      this.procesarActualizacion(seleccionados, formValues);
    }
  }

  procesarActualizacion(seleccionados: any[], formValues: any) {
    Swal.fire({
      title: 'Actualizando datos',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const promesas: Promise<any>[] = [];

    // Actualización de campos en tabla estudiantes
    if (formValues.cambiarActivo || formValues.cambiarAnno || formValues.cambiarAlimentacion) {
      const campos: any = {};
      if (formValues.cambiarActivo) campos.activo = formValues.activo;
      if (formValues.cambiarAnno) campos.anno = formValues.anno;
      if (formValues.cambiarAlimentacion) campos.alimentacion = formValues.alimentacion;

      const bodyEstudiantes = {
        ids: seleccionados.map(item => item.id_estudiante),
        campos: campos
      };

      promesas.push(this.estudiantesService.actualizacionMasiva(bodyEstudiantes).toPromise());
    }

    // Cambio de grupo
    if (formValues.cambiarGrupo) {
      const estudiantes = seleccionados.map(item => ({
        id_estudiante_grupo: item.id,
        id_estudiante: item.id_estudiante,
        anno: item.anno
      }));

      const bodyGrupo = {
        estudiantes: estudiantes,
        id_grupo: formValues.grupo
      };

      promesas.push(this.estudiantesService.cambioGrupoMasivo(bodyGrupo).toPromise());
    }

    Promise.all(promesas)
      .then((resultados) => {
        const todosExitosos = resultados.every((r: any) => r && r.success);
        
        if (todosExitosos) {
          Swal.fire({
            title: 'Actualización exitosa',
            html: `<p>Estudiantes actualizados correctamente</p>`,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.tablasComponent.limpiarSeleccion();
            this.obtenerEstudiantes();
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'Ocurrió un error en algunas actualizaciones',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      })
      .catch((error) => {
        console.error('Error al actualizar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al procesar la actualización',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      });
  }
}