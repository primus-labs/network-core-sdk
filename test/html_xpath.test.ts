import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { parseHtmlByXPath } from "../src/utils";

const sha256 = async (message: string): Promise<string> => {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await (globalThis.crypto?.subtle
    ? globalThis.crypto.subtle.digest("SHA-256", data)
    : require("crypto").webcrypto.subtle.digest("SHA-256", data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
};

const normalizeLineEndings = (value: string, source: string): string => {
  if (source.includes("\r\n")) {
    return value;
  }
  return value.replace(/\n/g, "\r\n");
};

const getRawHtmlByXPath = (html: string, xpath: string): string | null => {
  const dom = new JSDOM(html, { includeNodeLocations: true });
  const { document } = dom.window;
  const result = document.evaluate(
    xpath,
    document,
    null,
    dom.window.XPathResult.ANY_TYPE,
    null
  );
  const node = result.iterateNext();
  if (!node) {
    return null;
  }
  if (node.nodeType === dom.window.Node.ATTRIBUTE_NODE) {
    return (node as Attr).value ?? null;
  }

  const location = dom.nodeLocation(node as Node);
  if (location?.startOffset != null && location?.endOffset != null) {
    const raw = html.slice(location.startOffset, location.endOffset);
    return normalizeLineEndings(raw, html);
  }

  if ((node as Element).outerHTML) {
    return (node as Element).outerHTML;
  }
  return node.textContent ?? null;
};

describe("parseHtmlByXPath", () => {
  it("extracts data from federalreserve.html via XPath", async () => {
    const htmlPath = path.join(__dirname, "federalreserve.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const xpath = "/html/body/div[4]/div[2]/div[1]/div[1]";

    const rawHtml = getRawHtmlByXPath(html, xpath);
    // 为 rawHtml 计算 sha256 hash
    let hash = "";
    let length = rawHtml ? rawHtml.length : 0;

    if (rawHtml) {
      hash = await sha256(rawHtml);
      console.log("rawHtml sha256 hash=", hash);
    }
    console.log("rawHtml length=", length);
    const value = parseHtmlByXPath(html, xpath);

    expect(rawHtml).toBeTruthy();
    expect(rawHtml).toContain("<table");
    expect(value).toBeTruthy();
    expect(value).toContain("Date");
  });
});
