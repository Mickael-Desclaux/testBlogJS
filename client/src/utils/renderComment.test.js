import { describe, expect, it } from "vitest";
import { renderComment } from "./renderComment";

const render = (text) => {
	const container = document.createElement("div");
	container.innerHTML = renderComment(text);
	return container;
};

describe("renderComment - formats", () => {
	it("renders Markdown", () => {
		const dom = render("**bold** *italic* ~~strike~~ `code`");
		expect(dom.querySelector("strong").textContent).toBe("bold");
		expect(dom.querySelector("em").textContent).toBe("italic");
		expect(dom.querySelector("del").textContent).toBe("strike");
		expect(dom.querySelector("code").textContent).toBe("code");
	});

	it("renders lists, quotes and code blocks", () => {
		const dom = render("> quote\n\n- one\n- two\n\n```\nconst a = 1;\n```");
		expect(dom.querySelector("blockquote").textContent.trim()).toBe("quote");
		expect(dom.querySelectorAll("ul li")).toHaveLength(2);
		expect(dom.querySelector("pre code").textContent).toContain("const a = 1;");
	});

	it("keeps safe HTML", () => {
		const dom = render("<strong>html</strong> <em>ok</em>");
		expect(dom.querySelector("strong").textContent).toBe("html");
		expect(dom.querySelector("em").textContent).toBe("ok");
	});

	it("keeps plain text and its line breaks", () => {
		const dom = render("line 1\nline 2");
		expect(dom.textContent.trim()).toBe("line 1line 2");
		expect(dom.querySelectorAll("br")).toHaveLength(1);
	});

	it("escapes special characters in plain text", () => {
		expect(render("a < b && c > d").textContent.trim()).toBe("a < b && c > d");
	});

	it("renders headings as bold text instead of titles", () => {
		const dom = render("# Title\n## Subtitle");
		expect(dom.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
		expect(dom.querySelectorAll("strong")).toHaveLength(2);
	});

	it("returns an empty string for empty or invalid input", () => {
		expect(renderComment("")).toBe("");
		expect(renderComment("   ")).toBe("");
		expect(renderComment(null)).toBe("");
		expect(renderComment(undefined)).toBe("");
	});
});

describe("renderComment - XSS protection", () => {
	it("removes script tags", () => {
		const html = renderComment("<script>alert(1)</script>hello");
		expect(html).not.toContain("<script");
		expect(html).not.toContain("alert");
	});

	it("removes images and their event handlers", () => {
		const html = renderComment('<img src="x" onerror="alert(1)">');
		expect(html).not.toContain("<img");
		expect(html).not.toContain("onerror");
	});

	it("removes event handler attributes on allowed tags", () => {
		const dom = render(
			'<a href="https://ok.com" onclick="alert(1)">x</a><p onmouseover="alert(1)">y</p>',
		);
		expect(dom.querySelector("[onclick], [onmouseover]")).toBeNull();
	});

	it("removes iframe, style, svg, form and inline styles", () => {
		const dom = render(
			'<iframe src="https://evil.com"></iframe><style>body{}</style>' +
				'<svg onload="alert(1)"></svg><form><input></form><p style="color:red">p</p>',
		);
		expect(
			dom.querySelector("iframe, style, svg, form, input, [style]"),
		).toBeNull();
	});

	it.each([
		["javascript in Markdown", "[x](javascript:alert(1))"],
		["javascript in HTML", '<a href="javascript:alert(1)">x</a>'],
		["obfuscated javascript", '<a href="JaVaScRiPt:alert(1)">x</a>'],
		["data URI", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
	])("removes dangerous links (%s)", (_, input) => {
		const link = render(input).querySelector("a");
		expect(link?.hasAttribute("href") ?? false).toBe(false);
	});

	it("keeps http(s) and mailto links and opens them safely", () => {
		const dom = render("[web](https://example.com) [mail](mailto:a@b.com)");
		const [web, mail] = dom.querySelectorAll("a");

		expect(web.getAttribute("href")).toBe("https://example.com");
		expect(mail.getAttribute("href")).toBe("mailto:a@b.com");
		expect(web.getAttribute("target")).toBe("_blank");
		expect(web.getAttribute("rel")).toBe("noopener noreferrer nofollow");
	});
});
