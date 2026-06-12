// searchable-dropdown.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownItem {
  id: any;
  nombre: string;
  descripcion?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-searchable-dropdown',
  templateUrl: './searchable-dropdown.component.html',
  styleUrls: ['./searchable-dropdown.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true
    }
  ]
})
export class SearchableDropdownComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() items: DropdownItem[] = [];
  @Input() placeholder: string = 'Seleccionar';
  @Input() searchPlaceholder: string = 'Buscar...';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() maxHeight: string = '300px';
  @Input() emptyMessage: string = 'No se encontraron elementos';
  @Input() showSearch: boolean = true;
  @Input() clearable: boolean = true;

  @Output() selectionChange = new EventEmitter<DropdownItem | null>();

  public dropdownOpen: boolean = false;
  public searchTerm: string = '';
  public filteredItems: DropdownItem[] = [];
  public selectedValue: any = null;
  
  private clickListener?: (event: Event) => void;

  // ControlValueAccessor implementation
  private onChange = (value: any) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    console.log('SearchableDropdownComponent initialized with items:', this.items);
    this.filteredItems = [...this.items];
    this.setupDocumentClickListener();
  }

  ngOnDestroy(): void {
    this.removeDocumentClickListener();
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.selectedValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    
    this.dropdownOpen = !this.dropdownOpen;
    
    if (this.dropdownOpen) {
      this.initializeSearch();
    }
    
    this.onTouched();
  }

  selectItem(item: DropdownItem | null): void {
    if (this.disabled) return;
    
    if (item && item.disabled) return;
    
    this.selectedValue = item ? item.id : null;
    this.dropdownOpen = false;
    
    // Emit events
    this.onChange(this.selectedValue);
    this.selectionChange.emit(item);
    
    this.onTouched();
  }

  clearSelection(): void {
    if (this.disabled) return;
    
    this.selectItem(null);
  }

  getSelectedItem(): DropdownItem | null {
    if (!this.selectedValue) return null;
    return this.items.find(item => item.id === this.selectedValue) || null;
  }

  getDisplayText(): string {
    const selectedItem = this.getSelectedItem();
    return selectedItem ? selectedItem.nombre : this.placeholder;
  }

  initializeSearch(): void {
    this.searchTerm = '';
    this.filterItems();
  }

  filterItems(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredItems = [...this.items];
      return;
    }

    const searchTermNormalized = this.normalizeText(this.searchTerm);
    
    this.filteredItems = this.items.filter(item => {
      const nombreNormalizado = this.normalizeText(item.nombre);
      const descripcionNormalizada = this.normalizeText(item.descripcion || '');
      
      return nombreNormalizado.includes(searchTermNormalized) || 
             descripcionNormalizada.includes(searchTermNormalized);
    });
  }

  private normalizeText(text: string): string {
    if (!text) return '';
    
    return text.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private setupDocumentClickListener(): void {
    this.clickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.searchable-dropdown') && this.dropdownOpen) {
        this.dropdownOpen = false;
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  private removeDocumentClickListener(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  onSearchInputClick(event: Event): void {
    event.stopPropagation();
  }
}