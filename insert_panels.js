const fs = require('fs');
const path = 'src/index.html';
let html = fs.readFileSync(path, 'utf8');

const LEFT_PANEL = [
  '    <div class="panel" id="left-panel">',
  '        <fieldset class="poke-info">',
  '            <legend align="center">Team/Box</legend>',
  '            <div id="box-container"></div>',
  '            <div id="trash-section">',
  '                <strong>Trash</strong>',
  '                <div id="trash-box" class="box-content"></div>',
  '            </div>',
  '            <div style="margin-top:8px">',
  '                <button id="btn-add-box">+ New Box</button>',
  '                <button id="btn-empty-trash">Empty Trash</button>',
  '                <button id="btn-empty-all">Empty All Boxes</button>',
  '            </div>',
  '            <div style="margin-top:8px">',
  '                <textarea id="import-set-input" rows="8" style="width:100%;font-size:11px" placeholder="Paste a Showdown set here..."></textarea>',
  '                <select id="import-target-box"></select>',
  '                <button id="btn-import-set">Import</button>',
  '            </div>',
  '        </fieldset>',
  '    </div>',
].join('\n');

const RIGHT_PANEL = [
  '    <div class="panel" id="right-panel">',
  '        <fieldset class="poke-info">',
  '            <legend align="center">Opposing Team</legend>',
  '            <div id="trainer-name" style="text-align:center;font-weight:bold;margin-bottom:6px">—</div>',
  '            <div id="trainer-sprites" style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;min-height:40px"></div>',
  '            <div style="margin-top:8px;text-align:center">',
  '                <button id="btn-prev-trainer">Previous Trainer</button>',
  '                <button id="btn-next-trainer">Next Trainer</button>',
  '                <button id="btn-reset-trainer">Reset</button>',
  '            </div>',
  '        </fieldset>',
  '    </div>',
].join('\n');

// Ancre gauche : juste avant le panel Field
const ANCHOR_LEFT = '    <div class="panel">\n        <div aria-label="Field information"';
if (!html.includes(ANCHOR_LEFT)) {
  console.error('ERREUR : ancre gauche introuvable. Verifiez le HTML.');
  process.exit(1);
}
html = html.replace(ANCHOR_LEFT,
  LEFT_PANEL + '\n\n    <div class="panel">\n        <div aria-label="Field information"'
);

// Ancre droite : juste avant les scripts vendor
const ANCHOR_RIGHT = '    <script type="text/javascript" src="./js/vendor/jquery';
if (!html.includes(ANCHOR_RIGHT)) {
  console.error('ERREUR : ancre droite introuvable. Verifiez le HTML.');
  process.exit(1);
}
html = html.replace(ANCHOR_RIGHT,
  RIGHT_PANEL + '\n\n    ' + '<script type="text/javascript" src="./js/vendor/jquery'
);

fs.writeFileSync(path, html, 'utf8');
console.log('Panneaux inseres avec succes.');
