import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { MedidasXEstudianteService } from '../../../../services/medidas-x-estudiante.service';
import { CategoriasMedidasService } from '../../../../services/categorias-medidas.service';

interface MedidaModel {
  id: string;
  id_medida: string;
  id_estudiante: string;
  fecha: string;
  valor: number;
  id_usuario: string | null;
}

interface ValorAnterior {
  valor: number | null;
  fecha: string | null;
  existe: boolean;
}

interface MedidaCatalogo {
  id: string;
  nombre: string;
  unidad_abreviatura: string;
  tipo_valor: string;
  opciones?: { id: string; valor_numerico: number; etiqueta: string }[];
}

interface CategoriaMedidas {
  id: string;
  nombre: string;
  icono: string;
  medidas: MedidaCatalogo[];
}

@Component({
  selector: 'app-crear-medidas',
  templateUrl: './crear-medidas.component.html',
  styleUrl: './crear-medidas.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearMedidasComponent implements OnInit {

  public id = "0";
  public idEstudiante = "0";
  public accion = "";
  public editable = false;
  public submitted = false;
  public estudiante: any;
  public nombre_estudiante = "";
  public titulo = "Registro de medidas ";
  public regresar = '/estudiantes-medidas/';

  public categorias: CategoriaMedidas[] = [];
  public listas = {
    medidas: [] as MedidaCatalogo[]
  };

  public valorAnterior: ValorAnterior = {
    valor: null,
    fecha: null,
    existe: false
  };

  public cargandoValorAnterior = false;

  public model: MedidaModel = {
    id: '',
    id_medida: "",
    id_estudiante: "",
    fecha: "",
    valor: 0,
    id_usuario: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private medidasXEstudianteService: MedidasXEstudianteService,
    private categoriasMedidasService: CategoriasMedidasService,
    private estudiantesService: EstudiantesService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idEstudiante = params['idEstudiante'];
      this.regresar = this.regresar + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.consultarListas();
          const hoy = new Date();
          this.model.fecha = hoy.toISOString().split('T')[0];
          this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
          break;
        case 'editar':
          this.editable = true;
          this.consultarListas();
          this.obtenerMedida(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.consultarListas();
          this.obtenerMedida(this.id);
          break;
      }
    });
  }

  consultarListas() {
    this.categoriasMedidasService.obtenerConMedidas().subscribe({
      next: (data: any[]) => {
        this.categorias = data.map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          icono: cat.icono || 'fas fa-ruler',
          medidas: (cat.medidas || []).map((m: any) => ({
            id: m.id,
            nombre: m.nombre,
            unidad_abreviatura: m.unidad_abreviatura || '',
            tipo_valor: m.tipo_valor || 'numerico',
            opciones: m.opciones || []
          }))
        }));
        this.listas.medidas = this.categorias.flatMap(c => c.medidas);
      },
      error: (error) => {
        console.error('Error al cargar medidas:', error);
      }
    });
  }

  obtenerMedida(id: any) {
    this.medidasXEstudianteService.obtenerById(id).subscribe((response: any) => {
      const body = response.body;
      this.model = body[0];
      this.obtenerValorAnterior();
    });
  }

  obtenerValorAnterior() {
    if (!this.model.id_medida || !this.model.id_estudiante || !this.model.fecha) {
      this.valorAnterior = { valor: null, fecha: null, existe: false };
      return;
    }

    this.cargandoValorAnterior = true;
    const idMedida = this.model.id_medida;

    this.medidasXEstudianteService.obtenerMedidasMultiplesEstudiantes(
      [this.model.id_estudiante],
      this.model.fecha,
      [idMedida]
    ).subscribe({
      next: (response: any) => {
        this.cargandoValorAnterior = false;
        const estudiantes = response.estudiantes || [];

        if (estudiantes.length > 0) {
          const estData = estudiantes[0];
          const medidas = estData.medidas || [];
          const medidaData = medidas.find((m: any) => m.id_medida === idMedida);

          if (medidaData && medidaData.valor_anterior !== null) {
            this.valorAnterior = {
              valor: medidaData.valor_anterior,
              fecha: medidaData.fecha_anterior,
              existe: true
            };
          } else {
            this.valorAnterior = { valor: null, fecha: null, existe: false };
          }
        } else {
          this.valorAnterior = { valor: null, fecha: null, existe: false };
        }
      },
      error: (error) => {
        console.error('Error al obtener valor anterior:', error);
        this.cargandoValorAnterior = false;
        this.valorAnterior = { valor: null, fecha: null, existe: false };
      }
    });
  }

  onTipoMedidaCambiado() {
    if (this.model.id_medida && this.model.id_estudiante && this.model.fecha) {
      this.model.valor = 0;
      this.obtenerValorAnterior();
    }
  }

  onFechaCambiada() {
    if (this.model.id_medida && this.model.id_estudiante && this.model.fecha) {
      this.obtenerValorAnterior();
    }
  }

  grabar() {
    this.submitted = true;
    if (!this.formularioValido()) return;

    if (this.accion === 'crear') {
      this.medidasXEstudianteService.verificarDuplicados(this.model).subscribe({
        next: (respuesta: any) => {
          if (respuesta.cantidad > 0) {
            let tablaHTML = '<table class="table table-sm"><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody>';
            respuesta.duplicados.forEach((dup: any) => {
              tablaHTML += `<tr><td>${dup.fecha}</td><td>${dup.valor}</td></tr>`;
            });
            tablaHTML += '</tbody></table>';

            Swal.fire({
              title: '¡Atención!',
              html: `Se encontraron ${respuesta.cantidad} registros similares:<br>${tablaHTML}<br>¿Desea continuar con la creación?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, continuar',
              cancelButtonText: 'No, cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                this.procesarCreacionActualizacion();
              }
            });
          } else {
            this.procesarCreacionActualizacion();
          }
        },
        error: (error) => {
          console.error('Error al verificar duplicados:', error);
          Swal.fire('Error', 'Hubo un problema al verificar duplicados', 'error');
        }
      });
    } else {
      this.procesarCreacionActualizacion();
    }
  }

  private procesarCreacionActualizacion() {
    const servicio = this.accion === 'crear'
      ? this.medidasXEstudianteService.crear(this.model)
      : this.medidasXEstudianteService.actualizar(this.model);

    servicio.subscribe({
      next: (response: any) => {
        if (response) {
          Swal.fire({
            title: this.accion === 'crear' ? 'Medida registrada con éxito' : 'Medida actualizada',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.accion === 'crear') {
              this.limpiarFormulario();
            } else {
              this.volver();
            }
          });
        } else {
          Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
        }
      },
      error: (error) => {
        console.error('Error al procesar la operación:', error);
        Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
      }
    });
  }

  formularioValido() {
    return this.model.id_medida && this.model.id_estudiante && this.model.fecha && this.model.valor > 0;
  }

  limpiarFormulario() {
    this.model = {
      id: '',
      id_medida: "",
      id_estudiante: this.idEstudiante,
      fecha: "",
      valor: 0,
      id_usuario: null
    };
    const hoy = new Date();
    this.model.fecha = hoy.toISOString().split('T')[0];
    this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
    this.submitted = false;
    this.valorAnterior = { valor: null, fecha: null, existe: false };
  }

  volver() {
    this.router.navigate(['/estudiantes-medidas/' + this.idEstudiante]);
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.model.id_estudiante = this.idEstudiante;
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      this.titulo = this.titulo + " para " + this.nombre_estudiante;
    });
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin registro';
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  obtenerUnidadMedida(): string {
    if (!this.model.id_medida) return '';
    const medida = this.listas.medidas.find(m => m.id == this.model.id_medida);
    return medida ? medida.unidad_abreviatura : '';
  }

  obtenerMedidaSeleccionada(): MedidaCatalogo | null {
    if (!this.model.id_medida) return null;
    return this.listas.medidas.find(m => m.id == this.model.id_medida) || null;
  }

  obtenerEtiquetaValor(valor: number): string {
    const medida = this.obtenerMedidaSeleccionada();
    if (!medida || !medida.opciones) return '';
    const opcion = medida.opciones.find(o => o.valor_numerico == valor);
    return opcion ? opcion.etiqueta : '';
  }
}