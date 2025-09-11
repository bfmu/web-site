import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  createAngularTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState
} from '@tanstack/angular-table';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <!-- Mobile View (cards) -->
      <div class="block md:hidden space-y-4">
        @for (row of table().getRowModel().rows; track row.id) {
          <div class="card p-4">
            @for (cell of row.getVisibleCells(); track cell.id) {
              <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span class="font-medium text-gray-900">
                  {{ cell.column.columnDef.header }}
                </span>
                <span class="text-gray-700">
                  {{ cell.getValue() }}
                </span>
              </div>
            }
            @if (showActions()) {
              <div class="flex justify-end space-x-2 pt-3 mt-3 border-t border-gray-200">
                <button 
                  class="btn-outline"
                  (click)="onEdit.emit(row.original)">
                  Editar
                </button>
                <button 
                  class="btn text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                  (click)="onDelete.emit(row.original)">
                  Eliminar
                </button>
              </div>
            }
          </div>
        }
      </div>

      <!-- Desktop/Tablet View (table) -->
      <div class="hidden md:block">
        <div class="card overflow-hidden">
          <!-- Filtros y búsqueda -->
          <div class="p-4 border-b border-gray-200">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div class="flex-1 max-w-md">
                <input
                  type="text"
                  class="input"
                  placeholder="Buscar..."
                  [value]="globalFilter()"
                  (input)="setGlobalFilter($event)"
                />
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-700">
                  {{ table().getFilteredRowModel().rows.length }} resultados
                </span>
              </div>
            </div>
          </div>

          <!-- Tabla -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
                    @for (header of headerGroup.headers; track header.id) {
                      <th 
                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        [class.bg-gray-200]="header.column.getIsSorted()"
                        (click)="header.column.getToggleSortingHandler()?.($event)">
                        <div class="flex items-center space-x-1">
                          <span>{{ header.column.columnDef.header }}</span>
                          @if (header.column.getIsSorted() === 'asc') {
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                            </svg>
                          } @else if (header.column.getIsSorted() === 'desc') {
                            <svg class="w-4 h-4 transform rotate-180" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                            </svg>
                          }
                        </div>
                      </th>
                    }
                  }
                  @if (showActions()) {
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                @for (row of table().getRowModel().rows; track row.id) {
                  <tr class="hover:bg-gray-50">
                    @for (cell of row.getVisibleCells(); track cell.id) {
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {{ cell.getValue() }}
                      </td>
                    }
                    @if (showActions()) {
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex justify-end space-x-2">
                          <button 
                            class="text-blue-600 hover:text-blue-700"
                            (click)="onEdit.emit(row.original)">
                            Editar
                          </button>
                          <button 
                            class="text-red-600 hover:text-red-700"
                            (click)="onDelete.emit(row.original)">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          @if (showPagination()) {
            <div class="px-6 py-3 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-700">
                    Página {{ table().getState().pagination.pageIndex + 1 }} de {{ table().getPageCount() }}
                  </span>
                </div>
                <div class="flex items-center space-x-2">
                  <button
                    class="btn-outline"
                    [disabled]="!table().getCanPreviousPage()"
                    (click)="table().previousPage()">
                    Anterior
                  </button>
                  <button
                    class="btn-outline"
                    [disabled]="!table().getCanNextPage()"
                    (click)="table().nextPage()">
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class DataTableComponent<T> {
  // Inputs
  data = input.required<T[]>();
  columns = input.required<ColumnDef<T>[]>();
  showActions = input(true);
  showPagination = input(true);
  
  // Outputs
  onEdit = output<T>();
  onDelete = output<T>();
  
  // State
  private sorting = signal<SortingState>([]);
  private columnFilters = signal<ColumnFiltersState>([]);
  protected globalFilter = signal('');
  
  // Table instance
  table = computed(() => {
    return createAngularTable(() => ({
      data: this.data(),
      columns: this.columns(),
      state: {
        sorting: this.sorting(),
        columnFilters: this.columnFilters(),
        globalFilter: this.globalFilter(),
      },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      onSortingChange: (updater) => {
        const newSorting = typeof updater === 'function' 
          ? updater(this.sorting()) 
          : updater;
        this.sorting.set(newSorting);
      },
      onColumnFiltersChange: (updater) => {
        const newFilters = typeof updater === 'function'
          ? updater(this.columnFilters())
          : updater;
        this.columnFilters.set(newFilters);
      },
      onGlobalFilterChange: (value) => {
        this.globalFilter.set(value);
      },
    }));
  });
  
  setGlobalFilter(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.globalFilter.set(target.value);
  }
}
