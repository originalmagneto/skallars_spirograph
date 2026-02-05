const hasStructuredHtml = (html: string) => /<(p|h1|h2|h3|h4|ul|ol|li|blockquote|table|figure)\b/i.test(html);

const slugifyHeading = (text: string) => {
  const normalized = text
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return encodeURIComponent(normalized || text.toLowerCase().trim());
};

const addHeadingAnchors = (html: string) => {
    if (!html) return html;
    const used: Record<string, number> = {};
    return html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, inner) => {
        if (/id=/.test(attrs) || /anchor-link/.test(inner)) return match;
    const textOnly = inner.replace(/<[^>]+>/g, '').trim();
    if (!textOnly) return match;
    let slug = slugifyHeading(textOnly);
    const count = used[slug] || 0;
    used[slug] = count + 1;
    if (count > 0) slug = `${slug}-${count + 1}`;

    const classMatch = attrs.match(/class="([^"]*)"/i);
    const existingClass = classMatch ? classMatch[1] : '';
    const baseClass = `ghost-heading ghost-heading-${level} ghost-heading-group group flex items-center`;
    const mergedClass = existingClass ? `${existingClass} ${baseClass}` : baseClass;
    const cleanedAttrs = attrs.replace(/class="[^"]*"/i, '').trim();
    const classAttr = ` class="${mergedClass.trim()}"`;
    const idAttr = ` id="${slug}"`;
    const anchor = `<a href="#${slug}" class="ghost-anchor-link anchor-link ml-2 text-primary opacity-0 group-hover:opacity-100">#</a>`;
    return `<h${level}${cleanedAttrs ? ' ' + cleanedAttrs : ''}${idAttr}${classAttr}>${inner}${anchor}</h${level}>`;
    });
};

const looksLikeHeading = (plain: string) => {
    if (!plain) return false;
    if (/^\d+\.\s+/.test(plain)) return true;
    if (/^[ivxlcdm]+\.\s+/i.test(plain)) return true;
    if (plain.length <= 120 && /:$/.test(plain)) return true;
    return false;
};

export const formatArticleHtml = (input: string) => {
    if (!input) return '';
    const trimmed = input.trim();
    if (!trimmed) return '';

    const canUseDom = typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined';
    if (hasStructuredHtml(trimmed) && canUseDom) {
        const parser = new window.DOMParser();
        const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
        const container = doc.body.firstElementChild as HTMLElement | null;
        if (!container) {
            return addHeadingAnchors(trimmed);
        }

        // Split paragraphs by <br> into individual paragraphs
        container.querySelectorAll('p').forEach((p) => {
            const html = p.innerHTML;
            if (!/<br\s*\/?>/i.test(html)) return;
            const parts = html
                .split(/<br\s*\/?>/i)
                .map((part) => part.trim())
                .filter(Boolean);
            if (parts.length <= 1) return;
            const fragment = doc.createDocumentFragment();
            parts.forEach((part) => {
                const nextP = doc.createElement('p');
                nextP.innerHTML = part;
                fragment.appendChild(nextP);
            });
            p.replaceWith(fragment);
        });

        // Upgrade heading-like paragraphs
        container.querySelectorAll('p').forEach((p) => {
            const text = (p.textContent || '').trim();
            if (!text) return;

            const plain = text.replace(/\s+/g, ' ');
            const isShort = plain.length <= 140;
            const strongOnly =
                p.children.length === 1 &&
                p.firstElementChild?.tagName === 'STRONG' &&
                p.firstElementChild?.textContent?.trim() === text;

            // Split "<strong>Heading</strong> Body text" into heading + paragraph
            const strongAtStart = /^<strong>[\s\S]*?<\/strong>/i.test(p.innerHTML);
            if (strongAtStart && !strongOnly) {
                const match = p.innerHTML.match(/^<strong>([\s\S]*?)<\/strong>\s*(.*)$/i);
                if (match) {
                    const headingText = match[1]?.trim();
                    const rest = match[2]?.trim();
                    if (headingText && rest && headingText.length <= 120) {
                        const h3 = doc.createElement('h3');
                        h3.innerHTML = headingText;
                        const newP = doc.createElement('p');
                        newP.innerHTML = rest;
                        p.replaceWith(h3, newP);
                        return;
                    }
                }
            }

            if ((looksLikeHeading(plain) && isShort) || (strongOnly && isShort)) {
                const h2 = doc.createElement('h2');
                h2.innerHTML = p.innerHTML;
                p.replaceWith(h2);
            }
        });

        return addHeadingAnchors(container.innerHTML);
    }

    if (hasStructuredHtml(trimmed)) {
        return addHeadingAnchors(trimmed);
    }

  const lines = trimmed.replace(/\r/g, '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return '';

  const output: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    output.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
    listItems = [];
  };

  lines.forEach((line) => {
    const plain = line.replace(/<[^>]+>/g, '').trim();
    const isBullet = /^[-•]\s+/.test(plain);
    const isStrongHeading = /^<strong>[\s\S]+<\/strong>$/.test(line);
    const isQuote = /^(“|\"|„)/.test(plain);

    if (isBullet) {
      const item = plain.replace(/^[-•]\s+/, '');
      listItems.push(item);
      return;
    }

    flushList();

    const strongSegments = line.split(/(<strong>[\s\S]*?<\/strong>)/i).filter(Boolean);
    if (strongSegments.length > 1) {
      strongSegments.forEach((segment) => {
        const match = segment.match(/^<strong>([\s\S]*?)<\/strong>$/i);
        if (match) {
          const headingText = match[1]?.trim();
          if (headingText) {
            output.push(`<h2>${headingText}</h2>`);
          }
          return;
        }
        const segmentPlain = segment.replace(/<[^>]+>/g, '').trim();
        if (!segmentPlain) return;
        output.push(`<p>${segment}</p>`);
      });
      return;
    }

    if (looksLikeHeading(plain) || isStrongHeading) {
      output.push(`<h2>${line}</h2>`);
      return;
    }

    if (isQuote && plain.length < 300) {
      output.push(`<blockquote>${line}</blockquote>`);
      return;
    }

    output.push(`<p>${line}</p>`);
  });

  flushList();
  return addHeadingAnchors(output.join('\n'));
};
