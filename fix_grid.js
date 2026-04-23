const fs = require('fs');
let html = fs.readFileSync('src/index.html', 'utf8');

// Trouve le début de Pokémon 1
const start = html.indexOf('    <div aria-label="Pok');

// Trouve la fin du right-panel
const rightPanel = html.indexOf('id="right-panel"');
let depth = 0;
const divStart = html.lastIndexOf('<div', rightPanel);
let end = divStart;
for (let i = divStart; i < html.length - 5; i++) {
  if (html.slice(i, i+4) === '<div') depth++;
  if (html.slice(i, i+6) === '</div>') {
    depth--;
    if (depth === 0) { end = i + 6; break; }
  }
}

// Enveloppe dans un grid container
const before = html.slice(0, start);
const panels = html.slice(start, end);
const after = html.slice(end);

const wrapped = `    <div id="calc-grid">\n${panels}\n    </div>`;
fs.writeFileSync('src/index.html', before + wrapped + after, 'utf8');
console.log('Grid wrapper ajouté.');