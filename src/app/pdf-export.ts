import { Topic } from './models';

const PAGE_MARGIN = 15;
const LINE_GAP = 1.5;

/**
 * Generates and downloads a PDF listing all topics with their questions and
 * sub-questions (no marks). jsPDF is imported lazily so it stays out of the
 * initial bundle.
 */
export async function exportTopicsPdf(topics: Topic[]): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  const ensureRoom = (needed: number): void => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const writeLines = (
    text: string,
    indent: number,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' = 'normal',
  ): void => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    const lines: string[] = doc.splitTextToSize(text, contentWidth - indent);
    const lineHeight = fontSize * 0.3528 + LINE_GAP;
    for (const line of lines) {
      ensureRoom(lineHeight);
      doc.text(line, PAGE_MARGIN + indent, y);
      y += lineHeight;
    }
  };

  writeLines('Interview Questions', 0, 18, 'bold');
  y += 6;

  for (const topic of topics) {
    ensureRoom(20);
    writeLines(topic.name, 0, 14, 'bold');
    y += 2;

    topic.questions.forEach((question, i) => {
      writeLines(`${i + 1}. ${question.text}`, 4, 11);
      for (const sub of question.subQuestions) {
        writeLines(`• ${sub.text}`, 10, 10);
        if (sub.description) {
          doc.setTextColor(110);
          writeLines(sub.description, 14, 9, 'italic');
          doc.setTextColor(0);
        }
      }
      y += 1.5;
    });
    y += 5;
  }

  doc.save('interview-questions.pdf');
}
