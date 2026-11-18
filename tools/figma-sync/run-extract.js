// cap/*.html 화면마다 트리 JSON 만들기
const { chromium } = require('playwright');
const fs = require('fs');
const D = process.argv[2], OUT = process.argv[3];
const names = process.argv.slice(4);
(async () => {
  const b = await chromium.launch();
  const code = fs.readFileSync(__dirname + '/extract.js', 'utf8');
  for (const n of names) {
    const html = fs.readFileSync(`${D}/${n}.html`, 'utf8');
    const H = +html.match(/#app \{[^}]*height: (\d+)px/)[1];
    const p = await b.newPage({ viewport: { width: 360, height: H } });
    await p.goto('file://' + D + '/' + n + '.html'); await p.waitForTimeout(250);
    const json = await p.evaluate(code);
    fs.writeFileSync(`${OUT}/${n}.json`, json);
    console.log(n, H, Math.round(json.length / 1024) + 'KB');
    await p.close();
  }
  await b.close();
})();
