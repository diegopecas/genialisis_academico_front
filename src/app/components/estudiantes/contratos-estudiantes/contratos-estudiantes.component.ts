import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ContratosMatriculaService } from '../../../services/contratos-matricula.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { ExportarPdfContratoService } from '../../../services/exportar-pdf-contrato.service';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';
import { TiposDocumentosService } from '../../../services/tipos-documentos.service';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-contratos-estudiantes',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './contratos-estudiantes.component.html',
  styleUrl: './contratos-estudiantes.component.scss'
})
export class ContratosEstudiantesComponent {
  public titulo = "Contratos de matrícula";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-contratos/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Año', 'Grupo', 'Estado'];

  public acciones = [
    { id: 'descargar_pdf', label: 'Descargar PDF', icono: '/assets/images/pdf.png', condicion: 'mostrar_descargar', valor: true },
    { id: 'desmarcar_firmado', label: 'Desmarcar Firmado', icono: '/assets/images/quitar_firma.png', condicion: 'mostrar_desmarcar_firmado', valor: true },
  ] as any[];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private contratosMatriculaService: ContratosMatriculaService,
    private exportarPdfContratoService: ExportarPdfContratoService,
    private documentosPersonasService: DocumentosPersonasService,
    private tiposDocumentosService: TiposDocumentosService,
    private permisosService: PermisosService
  ) { }

  ngOnInit() {
    this.configurarPermisos();
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['id'];
      this.path = this.path + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);
    });

    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.contratos.administrar');
  }

  obtenerTodos(id_estudiante: any): void {
    this.contratosMatriculaService.obtenerByEstudiante(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      
      this.datos = body.map((c: any) => ({
        ...c,
        estado: c.activo === 1 ? 'Activo' : 'Anulado',
        estado_firma: c.firmado === 1 ? 'Firmado' : 'Sin firmar',
        puede_editar: c.firmado === 0,
        mostrar_desmarcar_firmado: c.firmado === 1,
        mostrar_descargar: c.firmado === 1,
        color: c.activo === 0 ? '#f8d7da' : '',
        valor_total_formato: this.formatearMoneda(c.valor_total),
        fecha_firma_formato: this.formatearFecha(c.fecha_firma)
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'anio',
        alias: 'Año',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'valor_total_formato',
        alias: 'Valor Total',
        alinear: 'derecha',
      },
      {
        clave: 'fecha_firma_formato',
        alias: 'Fecha Firma',
        alinear: 'centrado',
      },
      {
        clave: 'estado',
        alias: 'Estado',
      },
      {
        clave: 'estado_firma',
        alias: 'Firma',
        alinear: 'centrado',
      },
    ];
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      this.obtenerTodos(this.idEstudiante);
      this.titulo = this.titulo + " de " + this.nombre_estudiante;
    });
  }

  seleccionar(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.router.navigate(['estudiantes-contratos/consultar/' + event.id + '/' + this.idEstudiante]);
        break;
      case 'editar':
        this.router.navigate(['estudiantes-contratos/editar/' + event.id + '/' + this.idEstudiante]);
        break;
      case 'eliminar':
        this.anularContrato(event.id, event.registro);
        break;
      case 'descargar_pdf':
        this.descargarPDF(event.id);
        break;
      case 'desmarcar_firmado':
        if (event.registro.firmado === 1) {
          this.desmarcarFirmado(event.id, event.registro);
        }
        break;
    }
  }

  anularContrato(id: any, registro: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se anulará el contrato del año ${registro.anio}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.contratosMatriculaService.anular(id).subscribe({
          next: (response: any) => {
            Swal.fire({
              title: 'Contrato anulado',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.obtenerTodos(this.idEstudiante);
          },
          error: (error) => {
            console.error('Error al anular contrato:', error);
            Swal.fire('Error', 'No se pudo anular el contrato', 'error');
          }
        });
      }
    });
  }

  async descargarPDF(idContrato: number) {
    // Obtener el contrato para acceder al id_persona
    this.contratosMatriculaService.obtenerById(idContrato).subscribe({
      next: (contratoResponse: any) => {
        const contrato = contratoResponse.body?.[0];
        
        if (!contrato) {
          Swal.fire('Error', 'No se encontró el contrato', 'error');
          return;
        }

        // Obtener el estudiante para tener id_persona
        this.estudiantesService.obtenerById(contrato.id_estudiante).subscribe({
          next: (estudianteResponse: any) => {
            const estudiante = estudianteResponse.body?.[0];
            
            if (!estudiante?.id_persona) {
              Swal.fire('Error', 'No se encontró información del estudiante', 'error');
              return;
            }

            // Primero buscar el ID del tipo de documento 'contrato_matricula_firmado'
            this.tiposDocumentosService.obtenerPorTipoPersona('estudiante').subscribe({
              next: (tiposResponse: any) => {
                const tipos = tiposResponse.body || [];
                const tipoContratoFirmado = tipos.find((t: any) => t.codigo === 'contrato_matricula_firmado');

                if (!tipoContratoFirmado) {
                  Swal.fire('Error', 'No se encontró el tipo de documento', 'error');
                  return;
                }

                // Ahora buscar el documento con ese tipo
                this.documentosPersonasService.obtenerPorPersona(estudiante.id_persona, idContrato, tipoContratoFirmado.id).subscribe({
                  next: (docResponse: any) => {
                    const documentos = docResponse.body || [];
                    
                    if (documentos.length > 0 && documentos[0].id) {
                      // Usar el servicio para obtener la URL correcta
                      const url = this.documentosPersonasService.obtenerUrlDescarga(documentos[0].id);
                      window.open(url, '_blank');
                    } else {
                      Swal.fire('Error', 'No se encontró el documento firmado', 'error');
                    }
                  },
                  error: (error) => {
                    console.error('Error al buscar documentos:', error);
                    Swal.fire('Error', 'No se pudo obtener el documento', 'error');
                  }
                });
              },
              error: (error) => {
                console.error('Error al obtener tipos de documento:', error);
                Swal.fire('Error', 'No se pudo obtener tipos de documento', 'error');
              }
            });
          },
          error: (error) => {
            console.error('Error al obtener estudiante:', error);
            Swal.fire('Error', 'No se pudo obtener información del estudiante', 'error');
          }
        });
      },
      error: (error) => {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo obtener el contrato', 'error');
      }
    });
  }

  desmarcarFirmado(id: any, registro: any) {
    Swal.fire({
      title: '¿Desmarcar como firmado?',
      text: `Se quitará la marca de firmado del contrato del año ${registro.anio}. El contrato podrá volver a ser editado.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desmarcar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.contratosMatriculaService.desmarcarFirmado(id).subscribe({
          next: () => {
            Swal.fire({
              title: 'Contrato desmarcado',
              text: 'El contrato ya no está marcado como firmado',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
            this.obtenerTodos(this.idEstudiante);
          },
          error: (error) => {
            console.error('Error al desmarcar:', error);
            Swal.fire('Error', 'No se pudo desmarcar el contrato', 'error');
          }
        });
      }
    });
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }) || '$0';
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    const [fecha] = fechaStr.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}