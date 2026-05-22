const FORMAT_BLOCKS = ['BLOCKQUOTE', 'PRE'];

function normalizeText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').trim();
}

export function findFormatBlock(node, editable) {
  let el = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el && el !== editable) {
    if (FORMAT_BLOCKS.includes(el.tagName)) return el;
    el = el.parentElement;
  }
  return null;
}

export function isBlockEmpty(block) {
  return normalizeText(block.textContent) === '';
}

function getRangeTextAfterCaret(block, range) {
  const after = document.createRange();
  after.setStart(range.startContainer, range.startOffset);
  after.setEnd(block, block.childNodes.length);
  return after.toString();
}

function getLineTextBeforeCaret(block, range) {
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const textBefore = container.textContent.slice(0, offset);
    const lineBreak = textBefore.lastIndexOf('\n');
    if (lineBreak !== -1) return textBefore.slice(lineBreak + 1);
  }

  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let lineText = '';
  let foundCaret = false;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === container && node.nodeType === Node.TEXT_NODE) {
      lineText += node.textContent.slice(0, offset);
      foundCaret = true;
      break;
    }
    if (node.nodeName === 'BR') {
      lineText = '';
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      if (node === container) {
        lineText += node.textContent.slice(0, offset);
        foundCaret = true;
        break;
      }
      lineText += node.textContent;
    }
  }

  if (!foundCaret) return before.toString();
  return lineText;
}

export function isCaretOnEmptyLine(block, selection) {
  if (!selection.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;

  const after = normalizeText(getRangeTextAfterCaret(block, range));
  if (after !== '') return false;

  const lineBefore = normalizeText(getLineTextBeforeCaret(block, range));
  return lineBefore === '';
}

function trimTrailingEmptyNodes(block) {
  while (block.lastChild) {
    const last = block.lastChild;
    if (last.nodeName === 'BR') {
      block.removeChild(last);
      continue;
    }
    if (last.nodeType === Node.TEXT_NODE && !normalizeText(last.textContent)) {
      block.removeChild(last);
      continue;
    }
    if (last.nodeType === Node.ELEMENT_NODE && last.nodeName !== 'BR' && isBlockEmpty(last)) {
      block.removeChild(last);
      continue;
    }
    break;
  }
}

function focusParagraph(paragraph, selection, editable) {
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  editable.focus();
}

function removeTrailingEmptyBlockquotes(fromBlock, editable) {
  let next = fromBlock.nextElementSibling;
  while (next && next.tagName === 'BLOCKQUOTE' && isBlockEmpty(next)) {
    const toRemove = next;
    next = next.nextElementSibling;
    toRemove.remove();
  }
}

export function exitBlockToParagraph(block, editable, selection) {
  const paragraph = document.createElement('p');
  paragraph.innerHTML = '<br>';

  if (isBlockEmpty(block)) {
    block.parentNode.insertBefore(paragraph, block);
    block.remove();
    removeTrailingEmptyBlockquotes(paragraph, editable);
  } else {
    trimTrailingEmptyNodes(block);
    block.parentNode.insertBefore(paragraph, block.nextSibling);
    removeTrailingEmptyBlockquotes(block, editable);
  }

  focusParagraph(paragraph, selection, editable);
}

/**
 * Sale del blockquote con Enter (cita vacía, línea vacía o al final de la cita).
 * Shift+Enter inserta un salto de línea dentro de la cita.
 */
export function handleBlockExitKeydown(editor, event) {
  if (event.key !== 'Enter' || event.shiftKey) return false;

  const editable = editor.editable;
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;

  const block = findFormatBlock(selection.anchorNode, editable);
  if (!block || block.tagName !== 'BLOCKQUOTE') return false;

  const atEnd = normalizeText(getRangeTextAfterCaret(block, selection.getRangeAt(0))) === '';
  const shouldExit =
    isBlockEmpty(block) ||
    isCaretOnEmptyLine(block, selection) ||
    (atEnd && !isBlockEmpty(block));

  if (!shouldExit) return false;

  event.preventDefault();
  exitBlockToParagraph(block, editable, selection);
  editor.emit('change', editor.getHTML());
  return true;
}
