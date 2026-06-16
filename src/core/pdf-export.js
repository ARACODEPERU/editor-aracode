import html2pdf from 'html2pdf.js';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function inlineImagesForExport(root) {
  const imgs = root.querySelectorAll('img[src]');
  await Promise.all(Array.from(imgs).map(async (img) => {
    const src = img.getAttribute('src')?.trim();
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

    try {
      const absolute = new URL(src, window.location.href).href;
      const response = await fetch(absolute, { credentials: 'same-origin' });
      if (!response.ok) return;
      const blob = await response.blob();
      const dataUrl = await blobToDataUrl(blob);
      img.setAttribute('src', dataUrl);
    } catch {
      // html2canvas may still render same-origin images with useCORS
    }
  }));
}

async function prepareExportHtml(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  await inlineImagesForExport(wrapper);
  return wrapper.innerHTML;
}

/**
 * Abre el diálogo de impresión del navegador (Guardar como PDF).
 */
export function printEditorAsPdf(html, title = 'Documento') {
  const baseHref = `${window.location.origin}/`;
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <base href="${escapeHtml(baseHref)}" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>${html}</body>
</html>`);
  doc.close();

  const win = iframe.contentWindow;
  const cleanup = () => {
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  win.onafterprint = cleanup;
  win.focus();
  win.print();
  setTimeout(cleanup, 3000);
}

/**
 * Descarga un archivo PDF (html2pdf.js incluido en el bundle del editor).
 */
export async function downloadEditorAsPdf(html, filename = 'documento-aracode.pdf') {
  const preparedHtml = await prepareExportHtml(html);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = preparedHtml;
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#fff;';
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector('.aracode-export') || wrapper;

  try {
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(target)
      .save();
  } finally {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
