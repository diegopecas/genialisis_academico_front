import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { EnlacesAutoregistroAcudientesService } from '../../../../services/enlaces-autoregistro-acudientes.service';
import { EnlacesAutoregistroIntentosService } from '../../../../services/enlaces-autoregistro-intentos.service';
import { EnlacesAutoregistroVinculosService } from '../../../../services/enlaces-autoregistro-vinculos.service';

interface ResumenPaso {
  paso: number;
  nombre: string;
  total: number;
}

/**
 * Seguimiento de un enlace de autoregistro: hasta qué paso llegó cada
 * persona que lo abrió y con qué resultado terminó.
 */
@Component({
  selector: 'app-seguimiento-enlace-autoregistro',
  templateUrl: './seguimiento-enlace-autoregistro.component.html',
  styleUrl: './seguimiento-enlace-autoregistro.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class SeguimientoEnlaceAutoregistroComponent implements OnInit {

  titulo = 'Seguimiento del Enlace';
  regresar = '/estudiantes/enlaces-autoregistro';
  idEnlace: string = '';
  enlace: any = null;
  venceTexto = '';

  public columnasFiltro = ['Paso', 'Modo', 'Lectura', 'Persona', 'Usuario'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public resumen: ResumenPaso[] = [];
  public acciones = [
    { id: 'estudiantes', label: 'Ver estudiantes vinculados', icono: '/assets/images/familia.png' }
  ];

  // Textos del resultado de cada estudiante al terminar el registro
  private readonly TEXTO_RESULTADO: { [clave: string]: string } = {
    creado: 'Quedó vinculado',
    ya_existia: 'Ya era acudiente',
    omitido: 'No se vinculó',
    parentesco_ocupado: 'Parentesco ya registrado'
  };

  constructor(
    private enlacesService: EnlacesAutoregistroAcudientesService,
    private intentosService: EnlacesAutoregistroIntentosService,
    private vinculosService: EnlacesAutoregistroVinculosService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.route.params.subscribe(params => {
      this.idEnlace = params['id'];
      this.cargarEnlace();
      this.obtenerDatos();
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'fecha_inicio', alias: 'Inicio', alinear: 'centrado', tipo: 'datetime' },
      { clave: 'paso_nombre', alias: 'Paso', alinear: 'centrado', tipo: 'badge', claseCSS: 'clase_paso' },
      { clave: 'modo_texto', alias: 'Modo', alinear: 'centrado' },
      { clave: 'resultado_ia_texto', alias: 'Lectura', alinear: 'centrado' },
      { clave: 'numero_identificacion', alias: 'Documento', alinear: 'izquierda' },
      { clave: 'nombre_completo', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'estudiantes', alias: 'Estudiantes', alinear: 'izquierda' },
      { clave: 'persona_texto', alias: 'Persona', alinear: 'centrado' },
      { clave: 'usuario_texto', alias: 'Usuario', alinear: 'centrado' },
      { clave: 'fecha_completado', alias: 'Completado', alinear: 'centrado', tipo: 'datetime' },
      { clave: 'observaciones_texto', alias: 'Observaciones', alinear: 'izquierda' },
    ];
  }

  cargarEnlace() {
    this.enlacesService.obtenerById(this.idEnlace).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.enlace = body[0];
          this.titulo = 'Seguimiento: ' + this.enlace.nombre;
          this.venceTexto = this.formatearFechaHora(this.enlace.fecha_vencimiento);
        }
      }
    });
  }

  obtenerDatos() {
    this.intentosService.obtenerPorEnlace(this.idEnlace).subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.datos = body.map((d: any) => ({
          ...d,
          clase_paso: this.clasePaso(Number(d.paso)),
          modo_texto: d.modo === 'automatico' ? 'Foto' : (d.modo === 'manual' ? 'A mano' : ''),
          resultado_ia_texto: this.textoLectura(d.resultado_ia),
          estudiantes: d.estudiantes || '',
          persona_texto: this.textoNuevo(d.persona_nueva, 'Nueva', 'Ya existía'),
          usuario_texto: this.textoNuevo(d.usuario_nuevo, 'Nuevo', 'Ya existía'),
          observaciones_texto: [d.observaciones, d.error_ia ? 'IA: ' + d.error_ia : null].filter(Boolean).join(' | ')
        }));
        this.armarResumen();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo consultar el seguimiento', 'error');
      }
    });
  }

  private formatearFechaHora(valor: string): string {
    if (!valor) return '';
    const fecha = new Date(String(valor).replace(' ', 'T'));
    if (isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /** Cómo se leyó el documento: código de barras en el celular o IA. */
  private textoLectura(resultado: string): string {
    switch (resultado) {
      case 'codigo_barras': return 'Código de barras';
      case 'exitoso': return 'IA: leída';
      case 'fallido': return 'IA: fallida';
      default: return '';
    }
  }

  private textoNuevo(valor: any, siNuevo: string, siExistia: string): string {
    if (valor === null || valor === undefined || valor === '') return '';
    return Number(valor) === 1 ? siNuevo : siExistia;
  }

  private clasePaso(paso: number): string {
    if (paso >= 6) return 'badge-success';
    if (paso >= 4) return 'badge-info';
    if (paso >= 2) return 'badge-warning';
    return 'badge-secondary';
  }

  /** Cuántas personas quedaron en cada paso, en el orden del asistente. */
  private armarResumen() {
    const mapa = new Map<number, ResumenPaso>();
    for (const d of this.datos) {
      const paso = Number(d.paso);
      const actual = mapa.get(paso) || { paso, nombre: d.paso_nombre, total: 0 };
      actual.total++;
      mapa.set(paso, actual);
    }
    this.resumen = Array.from(mapa.values()).sort((a, b) => a.paso - b.paso);
  }

  clicAccion($event: any) {
    if ($event.accion === 'estudiantes') {
      this.verEstudiantes($event.registro);
    }
  }

  verEstudiantes(registro: any) {
    this.vinculosService.obtenerPorIntento(registro.id).subscribe({
      next: (response: any) => {
        const vinculos = (response.body as any[]) || [];
        if (vinculos.length === 0) {
          Swal.fire('Sin estudiantes', 'Esta persona no alcanzó a escoger estudiantes.', 'info');
          return;
        }

        const filas = vinculos.map((v: any) => {
          const resultado = v.resultado ? (this.TEXTO_RESULTADO[v.resultado] || v.resultado) : 'Sin terminar';
          return `<tr><td>${this.escapar(v.nombre_estudiante)}</td><td>${this.escapar(v.tipo_acudiente || '')}</td><td>${this.escapar(resultado)}</td></tr>`;
        }).join('');

        Swal.fire({
          title: registro.nombre_completo || registro.numero_identificacion || 'Estudiantes escogidos',
          html: `<div class="table-responsive"><table class="table table-sm text-start">
                   <thead><tr><th>Estudiante</th><th>Parentesco</th><th>Resultado</th></tr></thead>
                   <tbody>${filas}</tbody></table></div>`,
          width: 650,
          confirmButtonText: 'Cerrar'
        });
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudieron consultar los estudiantes', 'error');
      }
    });
  }

  private escapar(texto: string): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}
