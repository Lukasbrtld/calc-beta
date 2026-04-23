const fs = require('fs');
let html = fs.readFileSync('src/index.html', 'utf8');

const rightStart = html.indexOf('<div class="panel" id="right-panel">');
const leftStart = html.indexOf('<div class="panel" id="left-panel">');

if (rightStart === -1) { console.error('right-panel introuvable'); process.exit(1); }
if (leftStart === -1) { console.error('left-panel introuvable'); process.exit(1); }

// Trouve la fin du right-panel (deux </div> imbriqués)
let depth = 0;
let rightEnd = rightStart;
for (let i = rightStart; i < html.length - 5; i++) {
  if (html.slice(i, i+4) === '<div') depth++;
  if (html.slice(i, i+6) === '</div>') {
    depth--;
    if (depth === 0) { rightEnd = i + 6; break; }
  }
}

// Trouve la fin du left-panel
let depthL = 0;
let leftEnd = leftStart;
for (let i = leftStart; i < html.length - 5; i++) {
  if (html.slice(i, i+4) === '<div') depthL++;
  if (html.slice(i, i+6) === '</div>') {
    depthL--;
    if (depthL === 0) { leftEnd = i + 6; break; }
  }
}

const rightPanel = html.slice(rightStart, rightEnd);

// Supprime le right-panel de sa position
let newHtml = html.slice(0, rightStart).trimEnd() + '\n' + html.slice(rightEnd);

// Recalcule leftEnd après suppression
const newLeftStart = newHtml.indexOf('<div class="panel" id="left-panel">');
let newDepth = 0;
let newLeftEnd = newLeftStart;
for (let i = newLeftStart; i < newHtml.length - 5; i++) {
  if (newHtml.slice(i, i+4) === '<div') newDepth++;
  if (newHtml.slice(i, i+6) === '</div>') {
    newDepth--;
    if (newDepth === 0) { newLeftEnd = i + 6; break; }
  }
}

// Insère right-panel juste après left-panel
newHtml = newHtml.slice(0, newLeftEnd) + '\n    ' + rightPanel + newHtml.slice(newLeftEnd);

fs.writeFileSync('src/index.html', newHtml, 'utf8');
console.log('Layout réorganisé avec succès.');