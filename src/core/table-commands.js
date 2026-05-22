function createCell(tagName = 'td') {
  const cell = document.createElement(tagName);
  cell.innerHTML = '&nbsp;';
  return cell;
}

function getTableBody(table) {
  return table.querySelector('tbody') || table;
}

function getRows(table) {
  return Array.from(getTableBody(table).querySelectorAll('tr'));
}

function focusCell(cell, editable) {
  if (!cell) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  editable.focus();
}

export function insertRowAbove(cell, editor) {
  const row = cell.parentElement;
  const table = row?.closest('table');
  if (!table || !row) return null;

  const newRow = document.createElement('tr');
  const colCount = row.cells.length || 1;
  for (let i = 0; i < colCount; i++) {
    newRow.appendChild(createCell('td'));
  }
  row.parentNode.insertBefore(newRow, row);
  editor.emit('change', editor.getHTML());
  const target = newRow.cells[cell.cellIndex] || newRow.cells[0];
  focusCell(target, editor.editable);
  return target;
}

export function insertRowBelow(cell, editor) {
  const row = cell.parentElement;
  const table = row?.closest('table');
  if (!table || !row) return null;

  const newRow = document.createElement('tr');
  const colCount = row.cells.length || 1;
  for (let i = 0; i < colCount; i++) {
    newRow.appendChild(createCell('td'));
  }
  row.parentNode.insertBefore(newRow, row.nextSibling);
  editor.emit('change', editor.getHTML());
  const target = newRow.cells[cell.cellIndex] || newRow.cells[0];
  focusCell(target, editor.editable);
  return target;
}

export function insertColumnLeft(cell, editor) {
  const table = cell.closest('table');
  if (!table) return null;

  const index = cell.cellIndex;
  getRows(table).forEach((row) => {
    const ref = row.cells[index];
    const tag = ref?.tagName?.toLowerCase() === 'th' ? 'th' : 'td';
    const newCell = createCell(tag);
    if (ref) row.insertBefore(newCell, ref);
    else row.insertBefore(newCell, row.firstChild);
  });
  editor.emit('change', editor.getHTML());
  const row = cell.parentElement;
  const target = row?.cells[index];
  focusCell(target, editor.editable);
  return target;
}

export function insertColumnRight(cell, editor) {
  const table = cell.closest('table');
  if (!table) return null;

  const index = cell.cellIndex;
  getRows(table).forEach((row) => {
    const ref = row.cells[index];
    const tag = ref?.tagName?.toLowerCase() === 'th' ? 'th' : 'td';
    const next = ref?.nextSibling;
    if (next) row.insertBefore(createCell(tag), next);
    else row.appendChild(createCell(tag));
  });
  editor.emit('change', editor.getHTML());
  const row = cell.parentElement;
  const target = row?.cells[index + 1] || row?.cells[index];
  focusCell(target, editor.editable);
  return target;
}

export function deleteRow(cell, editor) {
  const row = cell.parentElement;
  const table = row?.closest('table');
  if (!table || !row) return null;

  const rows = getRows(table);
  if (rows.length <= 1) return null;

  const rowIndex = rows.indexOf(row);
  const focusRow = rows[rowIndex + 1] || rows[rowIndex - 1];
  const colIndex = cell.cellIndex;
  row.remove();
  editor.emit('change', editor.getHTML());
  const target = focusRow?.cells[colIndex] || focusRow?.cells[0];
  focusCell(target, editor.editable);
  return target;
}

export function deleteColumn(cell, editor) {
  const table = cell.closest('table');
  if (!table) return null;

  const rows = getRows(table);
  const colCount = rows[0]?.cells.length || 0;
  if (colCount <= 1) return null;

  const index = cell.cellIndex;
  let focusCellEl = null;
  rows.forEach((row) => {
    if (row.cells[index]) row.cells[index].remove();
    if (!focusCellEl) {
      focusCellEl = row.cells[index] || row.cells[index - 1] || row.cells[0];
    }
  });
  editor.emit('change', editor.getHTML());
  focusCell(focusCellEl, editor.editable);
  return focusCellEl;
}

export function deleteTable(cell, editor) {
  const table = cell.closest('table');
  if (!table) return;

  const next = table.nextElementSibling;
  const prev = table.previousElementSibling;
  table.remove();
  editor.emit('change', editor.getHTML());

  const editable = editor.editable;
  if (next) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    editable.insertBefore(p, next);
    focusCell(p, editable);
    return;
  }
  if (prev) {
    editable.focus();
    return;
  }
  const p = document.createElement('p');
  p.innerHTML = '<br>';
  editable.appendChild(p);
  focusCell(p, editable);
}
