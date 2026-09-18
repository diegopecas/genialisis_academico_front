import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { InformesEstudiantesService } from '../../../../services/informes-estudiantes.service';
import { InformesConfiguracionService } from '../../../../services/informes-configuracion.service';
import { ValoresParametrosCalificacionesService } from '../../../../services/valores-parametros-calificaciones.service';
import { AuthService } from '../../../../services/auth.service';
import Swal from 'sweetalert2';

/**
 * Calificación del informe de un estudiante en un corte.
 *
 * Las secciones y sus filas vienen armadas del backend según la
 * configuración del jardín. Aquí solo se marca el valor de cada fila y se
 * escriben los textos.
 */
@Component({
  selector: 'app-informes-calificar',
  templateUrl: './informes-calificar.component.html',
  styleUrl: './informes-calificar.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InformesCalificarComponent implements OnInit {

  titulo = "Informe del Estudiante";
  regresar = '/academico/informes/generacion';

  idEstudiante: any = null;
  idCorte: any = null;
  idGrupo: any = null;

  informe: any = null;
  secciones: any[] = [];
  valores: any[] = [];

  cargando = true;

  constructor(
    private informesEstudiantesService: InformesEstudiantesService,
    private informesConfiguracionService: InformesConfiguracionService,
    private valoresService: ValoresParametrosCalificacionesService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // El grupo viene por query param solo para poder devolver la lista
    // con el mismo filtro con el que se abrio el informe.
    this.route.queryParams.subscribe(params => {
      this.idGrupo = params['grupo'] || null;
    });

    this.route.params.subscribe(params => {
      this.idEstudiante = params['idEstudiante'];
      this.idCorte = params['idCorte'];
      this.cargarEscala();
    });
  }

  /**
   * La escala del informe es la del parámetro marcado en la configuración
   * del jardín, no todos los parámetros.
   */
  cargarEscala() {
    this.informesConfiguracionService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        const idParametro = body.length > 0 ? body[0].id_parametro_evaluacion : null;

        if (!idParametro) {
          this.cargando = false;
          Swal.fire(
            'Falta configuración',
            'Este jardín no tiene definido el parámetro de evaluación del informe. Configúralo en Académico → Informes → Configuración del Informe.',
            'warning'
          );
          return;
        }

        this.valoresService.obtenerByParametro(idParametro).subscribe({
          next: (resp: any) => {
            const valores = (resp.body as any[]) || [];
            // El orden de presentación manda sobre el valor numérico
            this.valores = valores.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
            this.cargarInforme();
          },
          error: (error: any) => {
            console.error("Error al cargar los valores del parámetro", error);
            this.cargando = false;
          }
        });
      },
      error: (error: any) => {
        console.error("Error al cargar la configuración del informe", error);
        this.cargando = false;
      }
    });
  }

  cargarInforme() {
    this.informesEstudiantesService.obtenerPorEstudianteCorte(this.idEstudiante, this.idCorte).subscribe({
      next: (response: any) => {
        const body: any = response.body;
        console.log("consumo servicio informe estudiante", body);

        this.informe = body?.informe || null;
        this.secciones = body?.secciones || [];
        this.cargando = false;

        if (this.informe) {
          this.titulo = `Informe de ${this.informe.nombre_estudiante}`;
        }
      },
      error: (error: any) => {
        console.error("Error al cargar el informe", error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el informe', 'error');
      }
    });
  }

  get editable(): boolean {
    return this.informe && this.informe.estado === 'borrador';
  }

  /** Solo las secciones de primer nivel, para pintar la jerarquía */
  get seccionesRaiz(): any[] {
    return this.secciones.filter(s => !s.id_seccion_padre);
  }

  subsecciones(idPadre: any): any[] {
    return this.secciones.filter(s => s.id_seccion_padre === idPadre);
  }

  marcar(fila: any, idValor: any) {
    if (!this.editable) {
      return;
    }
    // Volver a tocar el mismo valor lo quita, por si se marcó por error
    fila.id_valor_parametro = fila.id_valor_parametro === idValor ? null : idValor;
    fila.origen = 'manual';
  }

  /**
   * Marca todas las filas de la sección y de sus subsecciones con el mismo
   * valor. Es lo que más tiempo ahorra: en un boletín de 44 filas la
   * docente suele poner el mismo valor en casi toda una dimensión y
   * corregir solo las excepciones.
   */
  marcarTodasSeccion(seccion: any, idValor: any) {
    if (!this.editable) {
      return;
    }

    const aplicar = (sec: any) => {
      if (!sec.se_califica) {
        return;
      }
      (sec.filas || []).forEach((f: any) => {
        f.id_valor_parametro = idValor;
        f.origen = 'manual';
      });
    };

    aplicar(seccion);
    this.subsecciones(seccion.id).forEach(aplicar);
  }

  /** Quita las marcas de la sección y sus subsecciones */
  limpiarSeccion(seccion: any) {
    if (!this.editable) {
      return;
    }

    const limpiar = (sec: any) => {
      (sec.filas || []).forEach((f: any) => {
        f.id_valor_parametro = null;
      });
    };

    limpiar(seccion);
    this.subsecciones(seccion.id).forEach(limpiar);
  }

  /** Cuántas filas de la sección y sus subsecciones ya tienen valor */
  avanceSeccion(seccion: any): { calificadas: number, total: number } {
    let total = 0;
    let calificadas = 0;

    const contar = (sec: any) => {
      (sec.filas || []).forEach((f: any) => {
        total++;
        if (f.id_valor_parametro) {
          calificadas++;
        }
      });
    };

    contar(seccion);
    this.subsecciones(seccion.id).forEach(contar);

    return { calificadas, total };
  }

  /**
   * Vuelve a sembrar las filas que falten. No pisa lo ya calificado: sirve
   * cuando cambia la configuración de secciones o la malla del corte.
   */
  async regenerar() {
    const result = await Swal.fire({
      title: '¿Regenerar el informe?',
      text: 'Se agregan las filas que falten según la configuración actual. Lo que ya está calificado no se pierde.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();
    this.cargando = true;

    this.informesEstudiantesService.generar({
      id_estudiante: this.idEstudiante,
      id_corte_academico: this.idCorte,
      id_usuario: usuario?.id || null
    }).subscribe({
      next: (respuesta: any) => {
        this.cargarInforme();
        const nuevas = respuesta?.filas_nuevas || 0;
        Swal.fire('Listo', nuevas > 0
          ? `Se agregaron ${nuevas} filas al informe.`
          : 'El informe ya estaba completo.', 'success');
      },
      error: (error: any) => {
        console.error("Error al regenerar el informe", error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo regenerar el informe', 'error');
      }
    });
  }

  get totalFilas(): number {
    return this.secciones.reduce((acc, s) => acc + (s.filas?.length || 0), 0);
  }

  get filasCalificadas(): number {
    return this.secciones.reduce(
      (acc, s) => acc + (s.filas?.filter((f: any) => f.id_valor_parametro).length || 0), 0);
  }

  /** Arma el cuerpo que espera el backend */
  private armarPayload(): any {
    const detalle: any[] = [];
    const textos: any[] = [];

    this.secciones.forEach(s => {
      (s.filas || []).forEach((f: any) => {
        detalle.push({
          id: f.id,
          id_valor_parametro: f.id_valor_parametro || null,
          origen: f.origen || 'manual'
        });
      });

      if (s.tipo_contenido === 'texto' || (s.texto !== null && s.texto !== undefined)) {
        textos.push({ id_seccion: s.id, texto: s.texto || '' });
      }
    });

    return {
      id_informe: this.informe.id,
      detalle: detalle,
      textos: textos,
      texto_cierre: this.informe.texto_cierre || null
    };
  }

  guardar() {
    if (!this.informe) {
      return;
    }

    this.informesEstudiantesService.guardar(this.armarPayload()).subscribe({
      next: () => {
        Swal.fire('Guardado', 'El informe se guardó correctamente', 'success');
      },
      error: (error: any) => {
        console.error("Error al guardar el informe", error);
        const mensaje = error?.error?.error || 'No se pudo guardar el informe';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  async confirmar() {
    const faltantes = this.totalFilas - this.filasCalificadas;

    if (faltantes > 0) {
      Swal.fire('Faltan calificaciones', `Quedan ${faltantes} filas sin calificar.`, 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Confirmar el informe?',
      text: 'Después de confirmarlo no se puede modificar sin reabrirlo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();

    // Se guarda antes de confirmar, para no perder lo que esté sin guardar
    this.informesEstudiantesService.guardar(this.armarPayload()).subscribe({
      next: () => {
        this.informesEstudiantesService.confirmar({
          id_informe: this.informe.id,
          id_usuario: usuario?.id || null
        }).subscribe({
          next: () => {
            Swal.fire('Confirmado', 'El informe quedó confirmado', 'success');
            this.cargarInforme();
          },
          error: (error: any) => {
            console.error("Error al confirmar el informe", error);
            const mensaje = error?.error?.error || 'No se pudo confirmar el informe';
            Swal.fire('Error', mensaje, 'error');
          }
        });
      },
      error: (error: any) => {
        console.error("Error al guardar antes de confirmar", error);
        Swal.fire('Error', 'No se pudo guardar el informe', 'error');
      }
    });
  }

  async reabrir() {
    const result = await Swal.fire({
      title: '¿Reabrir el informe?',
      text: 'Volverá a estado borrador para poder corregirlo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.informesEstudiantesService.reabrir({ id_informe: this.informe.id }).subscribe({
      next: () => this.cargarInforme(),
      error: (error: any) => {
        console.error("Error al reabrir el informe", error);
        Swal.fire('Error', 'No se pudo reabrir el informe', 'error');
      }
    });
  }

  volver() {
    // Se devuelve el filtro para que la lista no quede en blanco
    if (this.idGrupo && this.idCorte) {
      this.router.navigate([this.regresar], {
        queryParams: { grupo: this.idGrupo, corte: this.idCorte }
      });
      return;
    }
    this.router.navigate([this.regresar]);
  }
}