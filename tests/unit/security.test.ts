import { describe, expect, it } from "vitest";
import { escapeHtml, escapeRegExp, highlightMatch } from "../../src/lib/security";

describe("security helpers", () => {
  it("escapa HTML peligroso", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapa metacaracteres de RegExp", () => {
    expect(escapeRegExp("a+b(c)")).toBe("a\\+b\\(c\\)");
  });

  it("resalta coincidencias sin XSS", () => {
    const html = highlightMatch("Martillo <b>Pro</b>", "Martillo");
    expect(html).toContain("<mark>Martillo</mark>");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>");

    const injectedQuery = highlightMatch("<img>", "<img>");
    expect(injectedQuery).toBe("<mark>&lt;img&gt;</mark>");
    expect(injectedQuery).not.toContain("<img>");
  });
});
