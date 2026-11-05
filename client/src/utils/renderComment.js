import { Marked } from 'marked';
import DOMPurify from 'dompurify';

// Comments accept Markdown, HTML and plain text: everything goes through marked,
// then through DOMPurify. marked does NOT sanitize, so the output of renderComment
// is the only HTML that may be passed to dangerouslySetInnerHTML.

const marked = new Marked({
    gfm: true,
    breaks: true, // keep plain-text line breaks
    renderer: {
        // A heading in a comment would look like an article title: render it as bold text
        heading({ tokens }) {
            return `<p><strong>${this.parser.parseInline(tokens)}</strong></p>\n`;
        },
    },
});

const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a'],
    ALLOWED_ATTR: ['href'],
    // Only absolute http(s) and mailto links (blocks javascript:, data:, vbscript:...)
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
};

// Dedicated instance so this hook does not affect other DOMPurify users
const purify = DOMPurify(window);

purify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
});

export function renderComment(text) {
    if (typeof text !== 'string' || text.trim() === '') return '';
    return purify.sanitize(marked.parse(text), SANITIZE_CONFIG);
}
