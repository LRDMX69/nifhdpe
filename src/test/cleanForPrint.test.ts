import { describe, it, expect } from 'vitest';
import { cleanForPrint } from '../../src/lib/generatePdf';

describe('cleanForPrint', () => {
  it('removes markdown headings, code and links', () => {
    const md = "# Title\n\nThis is **bold** text and `inline code` and a [link](https://example.com).\n\n- Item 1\n- Item 2\n";
    const out = cleanForPrint(md);
    expect(out).toContain('Title');
    expect(out).not.toContain('**');
    expect(out).not.toContain('`inline code`');
    expect(out).not.toMatch(/\[link\]\(/);
    expect(out).toContain('Item 1');
  });

  it('collapses multiple newlines and strips images', () => {
    const md = `Paragraph 1\n\n\nParagraph 2\n![](image.png)`;
    const out = cleanForPrint(md);
    expect(out).toContain('Paragraph 1');
    expect(out).toContain('Paragraph 2');
    expect(out).not.toContain('![](');
    // no triple newlines
    expect(out).not.toMatch(/\n{3,}/);
  });
});
