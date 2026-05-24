import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getAllSpecRows, getCategoryLabel } from './componentSpecs.js';
import { calculatePowerFromConfiguration } from './buildPower.js';

const PDF_WIDTH_PX = 794;
const MARGIN_MM = 14;
const CONTENT_PADDING_PX = 40;

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getCaseRecommendations(buildConfig) {
  const mb = buildConfig.motherboard;
  const gpu = buildConfig.gpu;
  const cooler = buildConfig.cooling;
  const tips = [];

  if (mb?.form_factor) {
    tips.push(
      `<li><strong>Форм-фактор корпуса:</strong> под материнскую плату <strong>${escapeHtml(mb.form_factor)}</strong> ` +
      `(допустимы корпуса: ${escapeHtml(getCompatibleCaseFormats(mb.form_factor))}).</li>`
    );
  } else {
    tips.push('<li><strong>Форм-фактор корпуса:</strong> выберите материнскую плату для определения размера корпуса.</li>');
  }

  if (gpu?.length) {
    const clearance = Number(gpu.length) + 20;
    tips.push(
      `<li><strong>Длина видеокарты:</strong> ${gpu.length} мм — корпус с поддержкой GPU от <strong>${clearance} мм</strong>.</li>`
    );
  } else {
    tips.push('<li><strong>Длина видеокарты:</strong> укажите длину выбранной видеокарты в спецификации корпуса.</li>');
  }

  if (cooler?.height) {
    tips.push(
      `<li><strong>Высота кулера CPU:</strong> ${cooler.height} мм — зазор корпуса не менее <strong>${Number(cooler.height) + 5} мм</strong>.</li>`
    );
  } else {
    tips.push('<li><strong>Высота кулера:</strong> при башенном кулере сверьте высоту с лимитом корпуса.</li>');
  }

  tips.push('<li>Учтите формат БП (ATX), количество накопителей и схему обдува.</li>');
  return tips.join('');
}

function getCompatibleCaseFormats(mbForm) {
  const f = String(mbForm || '').toUpperCase();
  if (f.includes('E-ATX') || f.includes('EATX')) return 'E-ATX, Full Tower';
  if (f.includes('ATX') && !f.includes('MICRO') && !f.includes('MINI')) return 'ATX, Mid / Full Tower';
  if (f.includes('MICRO') || f.includes('MATX') || f.includes('M-ATX')) return 'Micro-ATX и крупнее';
  if (f.includes('MINI') || f.includes('ITX')) return 'Mini-ITX, Compact';
  return 'совместимый с платой';
}

function buildHeaderHtml(buildConfig) {
  const calculatedPower =
    buildConfig.total_power || calculatePowerFromConfiguration(buildConfig);

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#111;">
      <h1 style="margin:0 0 8px;font-size:22px;">${escapeHtml(buildConfig.name || 'Конфигурация ПК')}</h1>
      <p style="margin:0 0 20px;color:#555;font-size:13px;">
        Дата: ${escapeHtml(new Date().toLocaleString('ru-RU'))}<br/>
        Рекомендуемый БП (+25% запас): <strong>${calculatedPower} Вт</strong>
        ${buildConfig.has_rgb ? '<br/>RGB подсветка: да' : ''}
        ${buildConfig.cooler_count ? `<br/>Корпусные вентиляторы: ${buildConfig.cooler_count}` : ''}
      </p>
      <h2 style="font-size:17px;border-bottom:2px solid #0071e3;padding-bottom:6px;margin:0 0 12px;">Комплектующие</h2>
    </div>
  `;
}

function buildComponentSectionHtml(item, index) {
  const comp = item.component_details || item;
  const name = comp.name || item.component_name || 'Без названия';
  const catLabel = getCategoryLabel(comp.category);
  const rows = getAllSpecRows(comp);

  return `
    <section style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#111;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e5e5;">
      <h3 style="margin:0 0 4px;font-size:15px;color:#0071e3;">${index + 1}. ${escapeHtml(catLabel)}</h3>
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#222;">${escapeHtml(name)}</p>
      <table style="width:100%;border-collapse:collapse;">${rows || '<tr><td>Нет характеристик</td></tr>'}</table>
    </section>
  `;
}

function buildRecommendationsHtml(buildConfig) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#111;">
      <h2 style="font-size:17px;border-bottom:2px solid #10b981;padding-bottom:6px;margin:0 0 14px;">Рекомендации по корпусу</h2>
      <ul style="margin:0;padding-left:20px;color:#222;font-size:13px;line-height:1.6;">${getCaseRecommendations(buildConfig)}</ul>
    </div>
  `;
}

function buildHtmlBlocks(buildConfig) {
  const items = buildConfig.items || [];
  const blocks = [buildHeaderHtml(buildConfig)];

  items.forEach((item, index) => {
    blocks.push(buildComponentSectionHtml(item, index));
  });

  blocks.push(buildRecommendationsHtml(buildConfig));
  return blocks;
}

/** Добавляет фрагмент canvas на текущую страницу PDF (без дублирования соседних страниц) */
function drawCanvasSlice(pdf, canvas, sourceY, sliceHeightPx, destXMm, destYMm, destWidthMm) {
  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = canvas.width;
  sliceCanvas.height = sliceHeightPx;
  const ctx = sliceCanvas.getContext('2d');
  ctx.drawImage(
    canvas,
    0, sourceY, canvas.width, sliceHeightPx,
    0, 0, canvas.width, sliceHeightPx
  );

  const destHeightMm = (sliceHeightPx * destWidthMm) / canvas.width;
  pdf.addImage(
    sliceCanvas.toDataURL('image/png', 0.92),
    'PNG',
    destXMm,
    destYMm,
    destWidthMm,
    destHeightMm
  );
  return destHeightMm;
}

/**
 * Рендер HTML-блока и размещение в PDF с корректными переносами (каждая страница — свой фрагмент изображения).
 */
async function appendHtmlBlockToPdf(pdf, hostEl, html, layout) {
  hostEl.innerHTML = `<div style="width:${PDF_WIDTH_PX}px;padding:0 ${CONTENT_PADDING_PX}px;box-sizing:border-box;background:#fff;">${html}</div>`;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const blockEl = hostEl.firstElementChild;
  const canvas = await html2canvas(blockEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: PDF_WIDTH_PX,
    windowWidth: PDF_WIDTH_PX,
  });

  if (!canvas.height) return;

  const { contentWidthMm, contentHeightMm, marginMm } = layout;
  const pxPerMm = canvas.width / contentWidthMm;

  let sourceY = 0;

  while (sourceY < canvas.height) {
    let availableMm = contentHeightMm - (layout.yMm - marginMm);

    if (availableMm < 5) {
      pdf.addPage();
      layout.page += 1;
      layout.yMm = marginMm;
      availableMm = contentHeightMm;
    }

    let slicePx = Math.floor(availableMm * pxPerMm);
    slicePx = Math.max(1, Math.min(slicePx, canvas.height - sourceY));

    const drawnMm = drawCanvasSlice(
      pdf, canvas, sourceY, slicePx, marginMm, layout.yMm, contentWidthMm
    );

    layout.yMm += drawnMm;
    sourceY += slicePx;
  }

  layout.yMm += 4;
}

/**
 * @param {Object} buildConfig — конфигурация с API (name, items, has_rgb, cooler_count, …)
 */
export async function exportBuildToPdf(buildConfig) {
  const hostEl = document.createElement('div');
  hostEl.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'background:#ffffff',
    'z-index:1',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(hostEl);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pdf.internal.pageSize.getWidth() - MARGIN_MM * 2;
  const contentHeightMm = pageHeight - MARGIN_MM * 2;

  const layout = {
    yMm: MARGIN_MM,
    page: 0,
    contentWidthMm,
    contentHeightMm,
    marginMm: MARGIN_MM,
  };

  try {
    const blocks = buildHtmlBlocks(buildConfig);

    for (const html of blocks) {
      const blockHost = document.createElement('div');
      blockHost.style.cssText = hostEl.style.cssText;
      document.body.appendChild(blockHost);

      try {
        const comp = html.includes('<section');
        if (comp) {
          const remainingMm = contentHeightMm - (layout.yMm - MARGIN_MM);
          const minBlockMm = 35;
          if (remainingMm < minBlockMm && layout.yMm > MARGIN_MM) {
            pdf.addPage();
            layout.page += 1;
            layout.yMm = MARGIN_MM;
          }
        }

        await appendHtmlBlockToPdf(pdf, blockHost, html, layout);
      } finally {
        document.body.removeChild(blockHost);
      }
    }

    const safeName = (buildConfig.name || 'sborka').replace(/[<>:"/\\|?*]/g, '_').slice(0, 80);
    pdf.save(`${safeName}.pdf`);
  } finally {
    document.body.removeChild(hostEl);
  }
}
