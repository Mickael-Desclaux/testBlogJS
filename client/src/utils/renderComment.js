import { Marked } from "marked";
import DOMPurify from "dompurify";

// Comments accept Markdown, HTML and plain text: everything goes through marked,
// then through DOMPurify. marked does NOT sanitize, so the output of renderComment
// is the only HTML that may be passed to dangerouslySetInnerHTML.

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		heading({ tokens }) {
			return `<p><strong>${this.parser.parseInline(tokens)}</strong></p>\n`;
		},
	},
});

const SANITIZE_CONFIG = {
	ALLOWED_TAGS: [
		"p",
		"br",
		"strong",
		"em",
		"del",
		"code",
		"pre",
		"blockquote",
		"ul",
		"ol",
		"li",
	],
	// No links and no attributes at all: <a> is removed, its text is kept
	ALLOWED_ATTR: [],
};

const purify = DOMPurify(window);

export function renderComment(text) {
	if (typeof text !== "string" || text.trim() === "") return "";
	return purify.sanitize(marked.parse(text), SANITIZE_CONFIG);
}
