import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="relative">
      <!-- Input Field -->
      <input
        [formControl]="inputControl"
        [placeholder]="placeholder"
        class="input"
        [class.border-red-300]="showError"
        [class.border-yellow-300]="showWarning"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown)="onKeydown($event)"
      />
      
      <!-- Error/Warning Messages -->
      @if (showError && errorMessage()) {
        <p class="mt-1 text-sm text-red-600 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          {{ errorMessage() }}
        </p>
      }
      
      @if (showWarning && warningMessage()) {
        <p class="mt-1 text-sm text-yellow-600 flex items-center">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
          {{ warningMessage() }}
        </p>
      }
      
      <!-- Dropdown -->
      @if (showDropdown() && (filteredOptions().length > 0 || showCreateOption())) {
        <div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <!-- Existing Options -->
          @for (option of filteredOptions(); track option) {
            <button
              type="button"
              class="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none first:rounded-t-lg last:rounded-b-lg"
              [class.bg-blue-100]="selectedIndex() === $index"
              (click)="selectOption(option)"
            >
              <div class="flex items-center justify-between">
                <span>{{ option }}</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </button>
          }
          
          <!-- Create New Option -->
          @if (showCreateOption()) {
            @if (filteredOptions().length > 0) {
              <div class="border-t border-gray-100"></div>
            }
            <button
              type="button"
              class="w-full px-4 py-2 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none rounded-b-lg"
              [class.bg-green-100]="selectedIndex() === filteredOptions().length"
              (click)="selectCreateOption()"
            >
              <div class="flex items-center text-green-700">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                <span>Crear "{{ inputControl.value }}"</span>
              </div>
            </button>
          }
        </div>
      }
    </div>
  `
})
export class AutocompleteComponent implements OnInit, OnDestroy {
  @Input() options: string[] = [];
  @Input() placeholder = '';
  @Input() allowCreate = true;
  @Input() value = '';
  @Input() showError = false;
  @Input() showWarning = false;
  @Input() errorMessage = signal<string>('');
  @Input() warningMessage = signal<string>('');
  
  @Output() valueChange = new EventEmitter<string>();
  @Output() optionSelected = new EventEmitter<{ value: string; isNew: boolean }>();
  
  protected readonly inputControl = new FormControl('');
  protected readonly showDropdown = signal(false);
  protected readonly selectedIndex = signal(-1);
  
  private readonly destroy$ = new Subject<void>();
  
  protected readonly filteredOptions = computed(() => {
    const query = this.inputControl.value?.toLowerCase() || '';
    if (!query) return this.options.slice(0, 10); // Mostrar máximo 10 opciones iniciales
    
    return this.options.filter(option => 
      option.toLowerCase().includes(query)
    ).slice(0, 10); // Limitar resultados para mejor rendimiento
  });
  
  protected readonly showCreateOption = computed(() => {
    if (!this.allowCreate) return false;
    
    const value = this.inputControl.value || '';
    if (!value.trim()) return false;
    
    return !this.options.some(option => 
      option.toLowerCase() === value.toLowerCase()
    );
  });

  ngOnInit() {
    // Set initial value
    this.inputControl.setValue(this.value);
    
    // Listen to value changes
    this.inputControl.valueChanges
      .pipe(
        startWith(this.value),
        debounceTime(150),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.valueChange.emit(value || '');
        this.selectedIndex.set(-1);
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  protected onFocus() {
    this.showDropdown.set(true);
  }
  
  protected onBlur() {
    // Delay to allow click on options
    setTimeout(() => {
      this.showDropdown.set(false);
      this.selectedIndex.set(-1);
    }, 150);
  }
  
  protected onKeydown(event: KeyboardEvent) {
    if (!this.showDropdown()) return;
    
    const totalOptions = this.filteredOptions().length + (this.showCreateOption() ? 1 : 0);
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(index => 
          index < totalOptions - 1 ? index + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(index => 
          index > 0 ? index - 1 : totalOptions - 1
        );
        break;
        
      case 'Enter':
        event.preventDefault();
        const index = this.selectedIndex();
        if (index >= 0) {
          if (index < this.filteredOptions().length) {
            this.selectOption(this.filteredOptions()[index]);
          } else {
            this.selectCreateOption();
          }
        }
        break;
        
      case 'Escape':
        this.showDropdown.set(false);
        this.selectedIndex.set(-1);
        break;
    }
  }
  
  protected selectOption(option: string) {
    this.inputControl.setValue(option);
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
    this.optionSelected.emit({ value: option, isNew: false });
  }
  
  protected selectCreateOption() {
    const value = this.inputControl.value || '';
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
    this.optionSelected.emit({ value, isNew: true });
  }
}
