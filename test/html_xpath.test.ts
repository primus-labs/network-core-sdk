import fs from "fs";
import path from "path";

import { getRawHtmlByXPath, sha256 } from "../src/utils";


describe("parseHtmlByXPath", () => {
  it("extracts data from federalreserve.html via XPath", async () => {
    const htmlPath = path.join(__dirname, "federalreserve.html");
    const html = fs.readFileSync(htmlPath, "utf-8");
    const xpath = "/html/body/div[4]/div[2]/div[1]/div[1]";

    const rawHtml = getRawHtmlByXPath(html, xpath);
    let hash = "";

    if (rawHtml) {
      hash = await sha256(rawHtml);
      console.log("rawHtml sha256 hash=", hash);
    }

    expect(rawHtml).toBeTruthy();
    expect(rawHtml).toContain("<table");
  });
});
