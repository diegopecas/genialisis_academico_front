import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './custom-dropdown.component.html',
  styleUrl: './custom-dropdown.component.scss'
})
export class CustomDropdownComponent implements OnChanges, OnInit, OnDestroy {
  @Input() options: any[] = []; // Array de opciones
  @Input() displayKey: string = 'nombre'; // Propiedad a mostrar como texto principal
  @Input() valueKey: string = 'id'; // Propiedad a usar como valor
  @Input() detailKey: string = 'detalles'; // Propiedad a mostrar como detalle (opcional)
  @Input() placeholder: string = 'Seleccionar'; // Texto a mostrar cuando no hay selección
  @Input() allOptionText: string = 'Todos'; // Texto para la opción "Todos"
  @Input() searchPlaceholder: string = 'Buscar...'; // Placeholder para el campo de búsqueda
  @Input() disabled: boolean = false; // Si el dropdown está deshabilitado
  @Input() selectedValue: any = ''; // Valor seleccionado
  @Input() showAllOption: boolean = true; // Si mostrar la opción "Todos"
  @Input() isInvalid: boolean = false; // Para mostrar el estado inválido

  @Output() valueChange = new EventEmitter<any>(); // Emite cuando cambia la selección
  @Output() selectedValueChange = new EventEmitter<any>(); // Para two-way binding

  public dropdownOpen: boolean = false;
  public searchTerm: string = '';
  public filteredOptions: any[] = [];
  
  // Inicializar la propiedad para evitar el error TS2564
  private documentClickListener: (() => void) | undefined;

  constructor(private renderer: Renderer2, private el: ElementRef) {}

  ngOnInit(): void {
    // Configurar el listener para cerrar el dropdown cuando se hace clic fuera de él
    this.documentClickListener = this.renderer.listen('document', 'click', (event) => {
      if (!this.el.nativeElement.contains(event.target)) {
        // El clic ocurrió fuera del componente
        this.dropdownOpen = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambian las opciones, actualizar las opciones filtradas
    if (changes['options'] && this.options) {
      this.filteredOptions = [...this.options];
    }
  }

  ngOnDestroy(): void {
    // Limpiar el listener al destruir el componente
    if (this.documentClickListener) {
      this.documentClickListener();
    }
  }

  // Alterna la apertura/cierre del dropdown
  toggleDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevenir que el clic se propague
    }
    
    if (this.disabled) return;
    
    this.dropdownOpen = !this.dropdownOpen;
    
    // Si se abre el dropdown, resetear la búsqueda
    if (this.dropdownOpen) {
      this.searchTerm = '';
      this.filteredOptions = [...this.options];
    }
  }

  // Selecciona una opción
  selectOption(value: any, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevenir que el clic se propague
    }
    
    if (this.disabled) return;
    
    this.selectedValue = value;
    this.valueChange.emit(value);
    this.selectedValueChange.emit(value); // Para two-way binding con [(selectedValue)]
    this.dropdownOpen = false;
  }

  // Obtiene el texto a mostrar para la opción seleccionada
  getSelectedText(): string {
    if (!this.selectedValue && this.selectedValue !== 0) {
      return this.placeholder;
    }

    // Si el valor seleccionado es vacío y hay opción "Todos", mostrar ese texto
    if (this.selectedValue === '' && this.showAllOption) {
      return this.allOptionText;
    }

    // Buscar la opción que corresponde al valor seleccionado
    const selected = this.options.find(option => 
      String(option[this.valueKey]) === String(this.selectedValue)
    );
    
    return selected ? selected[this.displayKey] : this.placeholder;
  }

  // Maneja el clic en el campo de búsqueda para evitar que cierre el dropdown
  onSearchClick(event: Event): void {
    event.stopPropagation();
  }

  // Filtra las opciones según el término de búsqueda
  searchOptions(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredOptions = [...this.options];
      return;
    }

    // Normalizar el término de búsqueda
    const searchTermNormalized = this.normalizarTexto(this.searchTerm);

    // Filtrar opciones
    this.filteredOptions = this.options.filter(option => {
      const displayText = this.normalizarTexto(option[this.displayKey] || '');
      const detailText = this.normalizarTexto(option[this.detailKey] || '');

      return (
        displayText.includes(searchTermNormalized) ||
        detailText.includes(searchTermNormalized)
      );
    });
  }

  // Normaliza el texto para búsqueda insensible a acentos
  private normalizarTexto(texto: string): string {
    if (!texto) return '';

    return texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos
      .toLowerCase()
      .trim();
  }
}