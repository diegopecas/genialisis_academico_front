import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { ContactosPortalService } from '../../../../services/portal/contactos-portal.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contactos-portal',
  templateUrl: './contactos-portal.component.html',
  styleUrl: './contactos-portal.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ContactosPortalComponent implements OnInit {

  titulo = "Contactos del Portal Web";
  public columnasFiltro = ['Nombre', 'Email', 'Teléfono', 'Estado', 'Programa Interés', 'Fecha Registro'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [
    { id: 'ver-detalle', label: 'Ver Detalle', icono: '/assets/images/detalle.png' },
  ] as any[];

  constructor(
    private contactosPortalService: ContactosPortalService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerContactos();
  }

  obtenerContactos() {
    this.contactosPortalService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Contactos del portal obtenidos", body);
        
        if (body && Array.isArray(body)) {
          this.datos = body.map((contacto: any) => {
            // Determinar color: si no hay color del estado, usar blanco
            const colorFila = contacto.estado_color && contacto.estado_color !== '' 
              ? contacto.estado_color 
              : '#ffffff';
            
            console.log(`Contacto ${contacto.id}: estado="${contacto.estado}", color="${colorFila}"`);
            
            return {
              ...contacto,
              color: colorFila,
              // Formatear fecha para mostrar de forma más amigable
              fecha_registro_mostrar: this.formatearFecha(contacto.created_at),
            };
          });
        } else {
          this.datos = [];
          Swal.fire({
            title: 'Sin contactos',
            text: 'No se encontraron contactos del portal',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error: any) => {
        console.error("Error al obtener contactos", error);
        
        if (error.status === 404) {
          Swal.fire({
            title: 'Portal no disponible',
            text: 'Este jardín no tiene portal web configurado',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los contactos del portal',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
        
        this.datos = [];
      }
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
        clave: 'nombre_padre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'email',
        alias: 'Email',
        alinear: 'izquierda',
      },
      {
        clave: 'telefono',
        alias: 'Teléfono',
        alinear: 'izquierda',
      },
      {
        clave: 'edad_nino',
        alias: 'Edad Niño',
        alinear: 'centrado',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'programa_interes',
        alias: 'Programa Interés',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_consulta',
        alias: 'Tipo Consulta',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_registro_mostrar',
        alias: 'Fecha Registro',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    console.log("Acción RECIBIDA en clicAccion:", $event);
    switch ($event.accion) {
      case 'ver-detalle':
        this.verDetalle($event.registro.id);
        break;
      case 'editar':
        console.log("Intentando navegar a editar, ID:", $event.registro.id);
        this.router.navigate(['administracion/crm/contactos-portal/editar', $event.registro.id]);
        break;
    }
  }

  verDetalle(id: number) {
    console.log("Navegando a consultar, ID:", id);
    this.router.navigate(['administracion/crm/contactos-portal/consultar', id]);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return fechaObj.toLocaleDateString('es-CO', opciones);
  }
}