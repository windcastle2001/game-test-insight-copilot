import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginMm = 8;
  const contentWidthMm = pageWidthMm - marginMm * 2;
  const imgHeightMm = (canvas.height * contentWidthMm) / canvas.width;

  let remainingHeightMm = imgHeightMm;
  let positionMm = marginMm;

  // First page
  pdf.addImage(imgData, 'PNG', marginMm, positionMm, contentWidthMm, imgHeightMm, undefined, 'FAST');
  remainingHeightMm -= pageHeightMm - marginMm * 2;

  // Additional pages: shift the image up by negative offset
  while (remainingHeightMm > 0) {
    pdf.addPage();
    positionMm = marginMm - (imgHeightMm - remainingHeightMm);
    pdf.addImage(imgData, 'PNG', marginMm, positionMm, contentWidthMm, imgHeightMm, undefined, 'FAST');
    remainingHeightMm -= pageHeightMm - marginMm * 2;
  }

  pdf.save(filename);
}
