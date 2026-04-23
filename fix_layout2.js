const fs = require('fs');
let html = fs.readFileSync('src/index.html', 'utf8');

function extractPanel(html, id) {
  const start = html.indexOf(id);
  if (start === -1) return null;
  const divStart = html.lastIndexOf('<div', start);
  let depth = 0;
  let end = divStart;
  for (let i = divStart; i < html.length - 5; i++) {
    if (html.slice(i, i+4) === '<div') depth++;
    if (html.slice(i, i+6) === '</div>') {
      depth--;
      if (depth === 0) { end = i + 6; break; }
    }
  }
  return { content: html.slice(divStart, end), start: divStart, end };
}

const left = extractPanel(html, 'id="left-panel"');
const right = extractPanel(html, 'id="right-panel"');

if (!left || !right) { console.error('Panneaux introuvables'); process.exit(1); }

// Supprime les deux panneaux
let newHtml = html;
// Supprime right d'abord (index plus grand)
const rightIdx = newHtml.indexOf(right.content);
newHtml = newHtml.slice(0, rightIdx).trimEnd() + '\n' + newHtml.slice(rightIdx + right.content.length);

const leftIdx = newHtml.indexOf(left.content);
newHtml = newHtml.slice(0, leftIdx).trimEnd() + '\n' + newHtml.slice(leftIdx + left.content.length);

// Trouve la fin de Pokémon 2
const p2Start = newHtml.indexOf('aria-label="Pok');
const p2Second = newHtml.indexOf('aria-label="Pok', p2Start + 10);
let depth = 0;
let p2End = p2Second;
const divStart = newHtml.lastIndexOf('<div', p2Second);
for (let i = divStart; i < newHtml.length - 5; i++) {
  if (newHtml.slice(i, i+4) === '<div') depth++;
  if (newHtml.slice(i, i+6) === '</div>') {
    depth--;
    if (depth === 0) { p2End = i + 6; break; }
  }
}

// Insère left + right après Pokémon 2
newHtml = newHtml.slice(0, p2End) + '\n    ' + left.content + '\n    ' + right.content + newHtml.slice(p2End);

fs.writeFileSync('src/index.html', newHtml, 'utf8');
console.log('Layout réorganisé avec succès.');