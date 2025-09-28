import { Component, Input, Output, EventEmitter, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, startWith, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tags-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-3">
      <!-- Selected Tags Display -->
      @if (selectedTags().length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (tag of selectedTags(); track tag) {
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              {{ tag }}
              <button
                type="button"
                (click)="removeTag(tag)"
                class="ml-2 hover:text-blue-900 focus:outline-none"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </span>
          }
        </div>
      }
      
      <!-- Input Field with Autocomplete -->
      <div class="relative">
        <input
          [formControl]="inputControl"
          [placeholder]="placeholder"
          class="input"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeydown($event)"
        />
        
        <!-- Dropdown -->
        @if (showDropdown() && (filteredOptions().length > 0 || showCreateOption())) {
          <div class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <!-- Existing Options -->
            @for (option of filteredOptions(); track option; let i = $index) {
              <button
                type="button"
                class="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none first:rounded-t-lg"
                [class.bg-blue-100]="selectedIndex() === i"
                [class.opacity-50]="isTagSelected(option)"
                [disabled]="isTagSelected(option)"
                (click)="selectOption(option)"
              >
                <div class="flex items-center justify-between">
                  <span>{{ option }}</span>
                  @if (isTagSelected(option)) {
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  } @else {
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  }
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
      
      <p class="text-xs text-gray-500">
        Escribe y presiona Enter para agregar etiquetas, o selecciona de las existentes
      </p>
    </div>
  `
})
export class TagsInputComponent implements OnInit, OnDestroy {
  @Input() options: string[] = [];
  @Input() placeholder = 'Agregar etiquetas...';
  @Input() value: string[] = [];
  
  @Output() valueChange = new EventEmitter<string[]>();
  @Output() tagAdded = new EventEmitter<{ tag: string; isNew: boolean }>();
  
  protected readonly inputControl = new FormControl('');
  protected readonly showDropdown = signal(false);
  protected readonly selectedIndex = signal(-1);
  protected readonly selectedTags = signal<string[]>([]);
  
  private readonly destroy$ = new Subject<void>();
  
  protected readonly filteredOptions = computed(() => {
    const query = this.inputControl.value?.toLowerCase() || '';
    const availableOptions = this.options.filter(option => !this.isTagSelected(option));
    
    if (!query) return availableOptions.slice(0, 8); // Mostrar máximo 8 opciones iniciales
    
    return availableOptions.filter(option => 
      option.toLowerCase().includes(query)
    ).slice(0, 8); // Limitar resultados para mejor rendimiento
  });
  
  protected readonly showCreateOption = computed(() => {
    const value = this.inputControl.value || '';
    if (!value.trim()) return false;
    
    return !this.options.some(option => 
      option.toLowerCase() === value.toLowerCase()
    ) && !this.isTagSelected(value);
  });

  ngOnInit() {
    // Set initial tags
    this.selectedTags.set([...this.value]);
    
    // Listen to input changes
    this.inputControl.valueChanges
      .pipe(
        debounceTime(150),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.selectedIndex.set(-1);
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  protected isTagSelected(tag: string): boolean {
    return this.selectedTags().some(selected => 
      selected.toLowerCase() === tag.toLowerCase()
    );
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
    const totalOptions = this.filteredOptions().length + (this.showCreateOption() ? 1 : 0);
    
    switch (event.key) {
      case 'ArrowDown':
        if (this.showDropdown()) {
          event.preventDefault();
          this.selectedIndex.update(index => 
            index < totalOptions - 1 ? index + 1 : 0
          );
        }
        break;
        
      case 'ArrowUp':
        if (this.showDropdown()) {
          event.preventDefault();
          this.selectedIndex.update(index => 
            index > 0 ? index - 1 : totalOptions - 1
          );
        }
        break;
        
      case 'Enter':
      case ',':
        event.preventDefault();
        if (this.showDropdown() && this.selectedIndex() >= 0) {
          const index = this.selectedIndex();
          if (index < this.filteredOptions().length) {
            this.selectOption(this.filteredOptions()[index]);
          } else {
            this.selectCreateOption();
          }
        } else {
          // Add current input as new tag
          const value = this.inputControl.value?.trim();
          if (value && !this.isTagSelected(value)) {
            this.addTag(value, true);
          }
        }
        break;
        
      case 'Backspace':
        if (!this.inputControl.value && this.selectedTags().length > 0) {
          // Remove last tag if input is empty
          const tags = this.selectedTags();
          this.removeTag(tags[tags.length - 1]);
        }
        break;
        
      case 'Escape':
        this.showDropdown.set(false);
        this.selectedIndex.set(-1);
        break;
    }
  }
  
  protected selectOption(option: string) {
    this.addTag(option, false);
  }
  
  protected selectCreateOption() {
    const value = this.inputControl.value?.trim();
    if (value) {
      this.addTag(value, true);
    }
  }
  
  private addTag(tag: string, isNew: boolean) {
    if (!this.isTagSelected(tag)) {
      const newTags = [...this.selectedTags(), tag];
      this.selectedTags.set(newTags);
      this.valueChange.emit(newTags);
      this.tagAdded.emit({ tag, isNew });
      
      // Clear input and close dropdown
      this.inputControl.setValue('');
      this.showDropdown.set(false);
      this.selectedIndex.set(-1);
    }
  }
  
  protected removeTag(tag: string) {
    const newTags = this.selectedTags().filter(t => t !== tag);
    this.selectedTags.set(newTags);
    this.valueChange.emit(newTags);
  }
}
