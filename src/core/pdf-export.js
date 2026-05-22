/**
 * Abre el diálogo de impresión del navegador (Guardar como PDF).
 */
export function printEditorAsPdf(html, title = 'Documento') {
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
 * Descarga un archivo PDF (requiere html2pdf.js instalado en el proyecto).
 */
async function resolveHtml2pdf() {
  try {
    return (await import('html2pdf.js')).default;
  } catch {
    if (typeof window !== 'undefined' && typeof window.html2pdf === 'function') {
      return window.html2pdf;
    }
    throw new Error('html2pdf.js no está disponible');
  }
}

export async function downloadEditorAsPdf(html, filename = 'documento-aracode.pdf') {
  const html2pdf = await resolveHtml2pdf();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;background:#fff;';
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector('.aracode-export') || wrapper;

  try {
    await html2pdf()
      .set({
        margin: [12, 12, 12, 12],
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
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
