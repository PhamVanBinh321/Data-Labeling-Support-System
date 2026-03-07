import React from 'react';
import './DataTable.css';

interface Column<T> {
  key: string;
  title: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
}

function DataTable<T>({ data, columns, keyExtractor, onRowClick }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="datatable-empty">
        <p>Không có dữ liệu hiển thị.</p>
      </div>
    );
  }

  return (
    <div className="datatable-container">
      <table className="datatable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)} 
              onClick={() => onRowClick && onRowClick(item)}
              className={onRowClick ? 'clickable-row' : ''}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
