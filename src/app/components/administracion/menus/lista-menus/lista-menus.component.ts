import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { MenusService } from '../../../../services/menus.service';

@Component({
  selector: 'app-lista-menus',
  templateUrl: './lista-menus.component.html',
  styleUrls: ['./lista-menus.component.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ListaMenusComponent implements OnInit {
  
  titulo = "Menús Completos";
  public titulos = [] as any[];
  public datos = [] as any[];
  
  public acciones = [
    { id: 'duplicar', label: 'Duplicar', icono: '/assets/images/duplicar.png' }
  ] as any[];

  private semanaHoy: number = 0;
  private diaHoy: number = 0;

  private diasNombres: { [key: number]: string } = {
    1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
  };

  private diasCortos: { [key: number]: string } = {
    1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb'
  };

  constructor(
    private menusService: MenusService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.calcularHoy();
    this.crearTitulos();
    this.obtenerMenus();
  }

  private calcularHoy(): void {
    const hoy = new Date();
    const diaDelMes = hoy.getDate();

    const jsDay = hoy.getDay();
    this.diaHoy = jsDay === 0 ? 0 : jsDay;

    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const jsDayPrimero = primerDiaMes.getDay();
    const diaSemPrimero = jsDayPrimero === 0 ? 7 : jsDayPrimero;

    const offset = diaSemPrimero - 1;
    const semanaCalculada = Math.ceil((diaDelMes + offset) / 7);
    this.semanaHoy = semanaCalculada > 5 ? 5 : semanaCalculada;
  }

  private esMenuDeHoy(minutasAsignadas: string): boolean {
    if (!minutasAsignadas || this.diaHoy === 0) return false;
    const claveBuscada = `S${this.semanaHoy}-D${this.diaHoy}`;
    return minutasAsignadas.includes(claveBuscada);
  }

  private formatearMinuta(minutasAsignadas: string): string {
    if (!minutasAsignadas) return '';

    const entries = minutasAsignadas.split(', ');
    return entries.map(entry => {
      const match = entry.match(/S(\d+)-D(\d+)/);
      if (match) {
        return `Semana ${match[1]} - ${this.diasNombres[parseInt(match[2])] || `D${match[2]}`}`;
      }
      return entry;
    }).join(', ');
  }

  obtenerMenus() {
    this.menusService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      
      this.datos = body.map((menu: any) => {
        // Color según estado
        menu.color = menu.activo ? "#d4edda" : "#f8d7da";
        
        // Badge para estado
        menu.estado_badge = menu.activo ? 
          '<span class="badge bg-success">Activo</span>' : 
          '<span class="badge bg-secondary">Inactivo</span>';

        // Clasificación del menú (texto plano para filtro)
        menu.clasificacion = menu.nombre_clasificacion_menu || 'Sin clasificación';
        
        // Hoy (texto plano para filtro)
        menu.hoy = this.esMenuDeHoy(menu.minutas_asignadas) ? 'Sí' : 'No';

        // Minuta (texto plano para filtro)
        if (menu.minutas_asignadas) {
          menu.minuta = this.formatearMinuta(menu.minutas_asignadas);
        } else {
          menu.minuta = 'Sin minuta';
        }

        // Mostrar nombres de items
        if (menu.items_nombres) {
          let items = menu.items_nombres;
          if (items.length > 60) {
            items = items.substring(0, 60) + '...';
          }
          menu.items_display = `<small class="text-muted">${items}</small>`;
        } else {
          menu.items_display = '<small class="text-muted">Sin ítems</small>';
        }

        // Productos (texto plano para filtro)
        menu.productos = menu.productos_nombres || 'Sin productos';

        // Productos display para la tabla
        if (menu.productos_nombres) {
          let productos = menu.productos_nombres;
          if (productos.length > 60) {
            productos = productos.substring(0, 60) + '...';
          }
          menu.productos_display = `<small class="text-muted">${productos}</small>`;
        } else {
          menu.productos_display = '<small class="text-muted">Sin productos</small>';
        }
        
        // Descripción truncada
        menu.descripcion_corta = menu.descripcion ? 
          (menu.descripcion.length > 50 ? 
            menu.descripcion.substring(0, 50) + '...' : 
            menu.descripcion) : 
          'Sin descripción';
        
        return menu;
      });

      console.log("Menús:", this.datos);
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
        clave: 'nombre',
        alias: 'Nombre del Menú',
        alinear: 'izquierda',
      },
      {
        clave: 'clasificacion',
        alias: 'Clasificación',
        alinear: 'centrado',
      },
      {
        clave: 'hoy',
        alias: 'Hoy',
        alinear: 'centrado',
      },
      {
        clave: 'minuta',
        alias: 'Minuta',
        alinear: 'izquierda',
      },
      {
        clave: 'productos_display',
        alias: 'Productos',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'items_display',
        alias: 'Ítems del Menú',
        alinear: 'izquierda',
        tipo: 'html'
      },
      {
        clave: 'estado_badge',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'html'
      }
    ];
  }

  clicAccion($event: any) {
    console.log("Acción", $event);
    const menu = $event.registro;
    
    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['administracion/lista-menus/consultar/' + menu.id]);
        break;
      case 'editar':
        this.router.navigate(['administracion/lista-menus/editar/' + menu.id]);
        break;
      case 'eliminar':
        this.eliminarMenu(menu);
        break;
      case 'duplicar':
        this.duplicarMenu(menu);
        break;
    }
  }

  async eliminarMenu(menu: any) {
    const result = await Swal.fire({
      title: '¿Eliminar menú?',
      html: `
        <p>¿Está seguro de eliminar el menú <strong>${menu.nombre}</strong>?</p>
        ${menu.total_items > 0 ? 
          `<p class="text-warning">Este menú tiene ${menu.total_items} ítem(s) asociado(s)</p>` : ''}
        ${menu.total_productos > 0 ? 
          `<p class="text-warning">Este menú tiene ${menu.total_productos} producto(s) asociado(s)</p>` : ''}
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.menusService.eliminar(menu.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El menú ha sido eliminado', 'success');
          this.obtenerMenus();
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          Swal.fire('Error', 'No se pudo eliminar el menú', 'error');
        }
      });
    }
  }

  async duplicarMenu(menu: any) {
    const result = await Swal.fire({
      title: 'Duplicar menú',
      html: `
        <p>¿Desea crear una copia del menú <strong>${menu.nombre}</strong>?</p>
        <input id="nombreCopia" class="swal2-input" placeholder="Nombre del nuevo menú" value="${menu.nombre} (Copia)">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Duplicar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nombreCopia = (document.getElementById('nombreCopia') as HTMLInputElement).value;
        if (!nombreCopia) {
          Swal.showValidationMessage('Debe ingresar un nombre para el nuevo menú');
        }
        return nombreCopia;
      }
    });

    if (result.isConfirmed) {
      const nuevoMenu = {
        nombre: result.value,
        descripcion: menu.descripcion ? menu.descripcion + ' (Copia)' : '',
        activo: 1,
        id_clasificacion_menu: menu.id_clasificacion_menu
      };

      this.menusService.crear(nuevoMenu).subscribe({
        next: (response) => {
          if (menu.total_items > 0) {
            this.menusService.obtenerItemsPorMenu(menu.id).subscribe({
              next: (itemsResponse: any) => {
                const items = itemsResponse.body || [];
                if (items.length > 0) {
                  this.menusService.asignarItems(response.id, items).subscribe({
                    next: () => {
                      this.duplicarProductos(menu, response.id);
                    },
                    error: () => {
                      Swal.fire('Advertencia', 'Menú duplicado pero no se pudieron copiar los items', 'warning');
                      this.obtenerMenus();
                    }
                  });
                } else {
                  this.duplicarProductos(menu, response.id);
                }
              }
            });
          } else {
            this.duplicarProductos(menu, response.id);
          }
        },
        error: (error) => {
          console.error('Error al duplicar:', error);
          Swal.fire('Error', 'No se pudo duplicar el menú', 'error');
        }
      });
    }
  }

  private duplicarProductos(menuOriginal: any, nuevoMenuId: number) {
    if (menuOriginal.total_productos > 0) {
      this.menusService.obtenerProductosServiciosPorMenu(menuOriginal.id).subscribe({
        next: (prodResponse: any) => {
          const productos = (prodResponse.body || []).map((p: any) => ({
            id_producto_servicio: p.id_producto_servicio
          }));
          if (productos.length > 0) {
            this.menusService.asignarProductosServicios(nuevoMenuId, productos).subscribe({
              next: () => {
                Swal.fire('Éxito', 'Menú duplicado correctamente con items y productos', 'success');
                this.obtenerMenus();
              },
              error: () => {
                Swal.fire('Advertencia', 'Menú duplicado pero no se pudieron copiar los productos', 'warning');
                this.obtenerMenus();
              }
            });
          } else {
            Swal.fire('Éxito', 'Menú duplicado correctamente', 'success');
            this.obtenerMenus();
          }
        }
      });
    } else {
      Swal.fire('Éxito', 'Menú duplicado correctamente', 'success');
      this.obtenerMenus();
    }
  }
}