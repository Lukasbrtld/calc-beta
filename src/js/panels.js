// ============================================================
//  panels.js — Logique des panneaux Team/Box et Opposing Team
// ============================================================

const SPRITE_URL = name =>
  `https://play.pokemonshowdown.com/sprites/ani/${name.toLowerCase().replace(/[^a-z0-9-]/g, '')}.gif`;

// ── Utilitaires ──────────────────────────────────────────────

function parseShowdownSet(raw) {
  if (!raw) return null;
  const lines = raw.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const firstLine = lines[0];
  const atIndex = firstLine.indexOf(' @');
  const fullName = atIndex >= 0 ? firstLine.substring(0, atIndex).trim() : firstLine.trim();
  const parenMatch = fullName.match(/^.+\(([^)]+)\)/);
  const species = parenMatch ? parenMatch[1].trim() : fullName.trim();
  return {
    id: 'set-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: fullName,
    species: species,
    raw: raw.trim(),
  };
}

function syncLocalStorage(data) {
  // Ne touche pas au localStorage — laisse le calc le gérer
  // On relit juste ce qui est déjà là et on supprime les entrées
  // correspondant aux sets supprimés de nos boxes
  const customsets = localStorage.customsets
    ? JSON.parse(localStorage.customsets) : {};

  const allSpecies = new Set([
    ...(data.boxes || []).flatMap(b => (b.sets || []).filter(Boolean).map(s => s.species)),
    ...(data.trash || []).filter(Boolean).map(s => s.species)
  ]);

  // Supprime du localStorage les espèces qui ne sont plus dans aucune box
  for (const species in customsets) {
    if (!allSpecies.has(species)) {
      delete customsets[species];
    }
  }

  localStorage.customsets = JSON.stringify(customsets);
}

function buildRawFromDex(species, setName, dexObj) {
  const lines = [];
  lines.push(species + (dexObj.item ? ` @ ${dexObj.item}` : ''));
  if (dexObj.ability) lines.push(`Ability: ${dexObj.ability}`);
  if (dexObj.level && dexObj.level !== 100) lines.push(`Level: ${dexObj.level}`);
  if (dexObj.nature) lines.push(`${dexObj.nature} Nature`);
  if (dexObj.evs) {
    const evParts = Object.entries(dexObj.evs)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k.toUpperCase()}`);
    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`);
  }
  (dexObj.moves || []).filter(m => m && m.name !== '(No Move)')
    .forEach(m => lines.push(`- ${m.name || m}`));
  return lines.join('\n');
}

function monToShowdown(mon) {
  const lines = [];
  
  // Première ligne : espèce (genre) @ objet
  let firstLine = mon.species;
  if (mon.gender && mon.gender !== 'N') firstLine += ` (${mon.gender})`;
  if (mon.item) firstLine += ` @ ${mon.item}`;
  lines.push(firstLine);

  if (mon.ability) lines.push(`Ability: ${mon.ability}`);
  if (mon.level && mon.level !== 100) lines.push(`Level: ${mon.level}`);
  if (mon.nature) lines.push(`${mon.nature} Nature`);

  // EVs seulement si non nuls
  if (mon.evs) {
    const evParts = Object.entries(mon.evs)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k.toUpperCase()}`);
    if (evParts.length) lines.push(`EVs: ${evParts.join(' / ')}`);
  }

  // IVs seulement si différents de 31
  if (mon.ivs) {
    const ivParts = Object.entries(mon.ivs)
      .filter(([, v]) => v !== 31)
      .map(([k, v]) => `${v} ${k.toUpperCase()}`);
    if (ivParts.length) lines.push(`IVs: ${ivParts.join(' / ')}`);
  }

  (mon.moves || []).filter(Boolean).forEach(m => lines.push(`- ${m}`));
  return lines.join('\n');
}

// ── Chargement dans un slot ───────────────────────────────────

function loadIntoSlot(set, slotId) {
  addSets(set.raw, set.name);
  const targetId = `${set.species} (${set.name})`;
  const input = $(`#${slotId} .set-selector`).filter('input');
  input.val(targetId).trigger('change');
  setTimeout(() => {
    $(`#${slotId} .set-selector`).filter('div').find('.select2-chosen').first().text(targetId);
  }, 150);
}

function spriteEl(set, onClick) {
  if (!set) return document.createTextNode('');
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;padding:2px';
  wrap.title = set.name;
  wrap.dataset.setId = set.id;
  const img = document.createElement('img');
  img.src = SPRITE_URL(set.species);
  img.alt = set.species;
  img.style.cssText = 'width:40px;height:40px;object-fit:contain';
  img.addEventListener('error', () => { img.src = SPRITE_URL('substitute'); });
  wrap.appendChild(img);
  wrap.addEventListener('click', () => onClick(set));
  return wrap;
}

// ── Panneau gauche ────────────────────────────────────────────

let _storage = null;

function renderLeftPanel() {
  const data = _storage.getSets();
  if (!data || !data.boxes) return;
  const boxes = data.boxes;
  const trash = data.trash || [];
  const container = document.getElementById('box-container');
  const trashBox = document.getElementById('trash-box');
  if (!container || !trashBox) return;
  document.querySelectorAll('[data-box-idx]').forEach(el => {
    if (el._sortable) el._sortable.destroy();
  });

  container.innerHTML = '';

  boxes.forEach((box, idx) => {
    const isTeam = box.id === 'team';
    const isProtected = isTeam || idx === 1; // Team + Box 1 non supprimables

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:8px';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap';

    const title = document.createElement('strong');
    title.textContent = box.name;

    const btnRename = document.createElement('button');
    btnRename.textContent = 'Rename';
    btnRename.style.cssText = 'font-size:10px;padding:1px 4px';
    btnRename.addEventListener('click', async () => {
      const newName = prompt('Nouveau nom :', box.name);
      if (newName?.trim()) {
        const d = _storage.getSets();
        d.boxes[idx].name = newName.trim();
        await _storage.saveSets(d);
        renderLeftPanel();
      }
    });

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Supprimer';
    btnDelete.style.cssText = `font-size:10px;padding:1px 4px;opacity:${isProtected ? '0.3' : '1'}`;
    btnDelete.disabled = isProtected;
    btnDelete.addEventListener('click', async () => {
      if (!confirm(`Supprimer "${box.name}" et envoyer ses Pokémon à la poubelle ?`)) return;
      const d = _storage.getSets();
      const removed = d.boxes.splice(idx, 1)[0];
      d.trash.push(...(removed.sets || []).filter(Boolean));
      await _storage.saveSets(d);
      syncLocalStorage(d);
      renderLeftPanel();
    });

    const btnMoveUp = document.createElement('button');
    btnMoveUp.textContent = '↑';
    btnMoveUp.style.cssText = 'font-size:10px;padding:1px 4px';
    btnMoveUp.disabled = idx <= 1; // Team et Box 1 ne bougent pas
    btnMoveUp.addEventListener('click', async () => {
      const d = _storage.getSets();
      [d.boxes[idx - 1], d.boxes[idx]] = [d.boxes[idx], d.boxes[idx - 1]];
      await _storage.saveSets(d);
      renderLeftPanel();
    });

    header.appendChild(title);
    header.appendChild(btnRename);
    header.appendChild(btnDelete);
    header.appendChild(btnMoveUp);

    const sprites = document.createElement('div');
    sprites.dataset.boxIdx = idx;
    sprites.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;min-height:44px;padding:4px;border:1px solid #555;border-radius:4px';

    (box.sets || []).filter(Boolean).forEach(set => {
      sprites.appendChild(spriteEl(set, s => loadIntoSlot(s, 'p1')));
    });

    section.appendChild(header);
    section.appendChild(sprites);
    container.appendChild(section);

    sprites._sortable = Sortable.create(sprites, {
      group: 'boxes',
      animation: 150,
      onEnd: async (evt) => {
        if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
        const d = _storage.getSets();
        const fromIdx = parseInt(evt.from.dataset.boxIdx);
        const toEl = evt.to;
        const movedSet = d.boxes[fromIdx].sets.splice(evt.oldIndex, 1)[0];
        if (toEl.dataset.boxIdx === 'trash') {
          d.trash.splice(evt.newIndex, 0, movedSet);
        } else {
          const toIdx = parseInt(toEl.dataset.boxIdx);
          d.boxes[toIdx].sets.splice(evt.newIndex, 0, movedSet);
        }
        await _storage.saveSets(d);
        syncLocalStorage(d);
        renderLeftPanel();
      }
    });
  });

  // Trash
  trashBox.innerHTML = '';
  trashBox.dataset.boxIdx = 'trash';
  trashBox.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;min-height:44px;padding:4px;border:1px solid #555;border-radius:4px';
  trash.filter(Boolean).forEach(set => {
    trashBox.appendChild(spriteEl(set, s => loadIntoSlot(s, 'p1')));
  });

  trashBox._sortable = Sortable.create(trashBox, {
    group: 'boxes',
    animation: 150,
    onEnd: async (evt) => {
      if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
      const d = _storage.getSets();
      let movedSet;
      if (evt.from.dataset.boxIdx === 'trash') {
        movedSet = d.trash.splice(evt.oldIndex, 1)[0];
      } else {
        movedSet = d.boxes[parseInt(evt.from.dataset.boxIdx)].sets.splice(evt.oldIndex, 1)[0];
      }
      if (evt.to.dataset.boxIdx === 'trash') {
        d.trash.splice(evt.newIndex, 0, movedSet);
      } else {
        d.boxes[parseInt(evt.to.dataset.boxIdx)].sets.splice(evt.newIndex, 0, movedSet);
      }
      await _storage.saveSets(d);
      syncLocalStorage(d);
      renderLeftPanel();
    }
  });
}

// ── Panneau droit ─────────────────────────────────────────────

let currentTrainerIndex = 0;

function renderRightPanel() {
  const trainers = _storage.getTrainers();
  const nameEl = document.getElementById('trainer-name');
  const spritesEl = document.getElementById('trainer-sprites');
  if (!nameEl || !spritesEl) return;

  if (!trainers.length) {
    nameEl.textContent = '—';
    spritesEl.innerHTML = '<span style="font-size:11px;color:#888">Aucun dresseur enregistré</span>';
    return;
  }

  const trainer = trainers[currentTrainerIndex];
  nameEl.textContent = `#${trainer.order} — ${trainer.name}`;
  spritesEl.innerHTML = '';

  (trainer.team || []).forEach(mon => {
    const set = {
      species: mon.species,
      name: trainer.name,
      raw: monToShowdown(mon),
    };
    spritesEl.appendChild(spriteEl(set, s => loadIntoSlot(s, 'p2')));
  });
}

// ── Interception du bouton Import ────────────────────────────

function interceptImportButton() {
  const waitForBtn = setInterval(() => {
    const btn = document.querySelector('#import.bs-btn');
    if (!btn) return;
    clearInterval(waitForBtn);

    btn.addEventListener('click', () => {
      // Snapshot AVANT l'import
      const beforeStr = localStorage.customsets || '{}';

      setTimeout(async () => {
        const before = JSON.parse(beforeStr);
        const customsets = localStorage.customsets
          ? JSON.parse(localStorage.customsets) : {};

        // Noms des dresseurs à exclure
        const trainerNames = new Set(
          (_storage.getTrainers() || []).map(t => t.name)
        );

        const d = _storage.getSets();
        const targetBox = d.boxes.find(b => b.id === 'box-1') || d.boxes[1];
        if (!targetBox) return;

        for (const species in customsets) {
          for (const setName in customsets[species]) {
            // Ignore les sets des dresseurs
            if (trainerNames.has(setName)) continue;

            const dexObj = customsets[species][setName];
            if (!dexObj.moves) continue;

            const raw = buildRawFromDex(species, setName, dexObj);
            const newSet = {
              id: 'set-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              name: setName,
              species: species,
              raw: raw,
            };

            let found = false;
            for (const box of d.boxes) {
              const idx = (box.sets || []).findIndex(s => s?.species === species && s?.name === setName);
              if (idx >= 0) {
                box.sets[idx] = newSet;
                found = true;
                break;
              }
            }
            if (!found) {
              const trashIdx = (d.trash || []).findIndex(s => s?.species === species && s?.name === setName);
              if (trashIdx >= 0) {
                d.trash[trashIdx] = newSet;
                found = true;
              }
            }
            if (!found) targetBox.sets.push(newSet);
          }
        }

        await _storage.saveSets(d);
        renderLeftPanel();

        const textarea = document.querySelector('textarea.import-team-text');
        if (textarea) textarea.value = '';
      }, 100);
    });
  }, 200);
}

function interceptP2Selector() {
  const selector = $('#p2 .set-selector').filter('input');
  selector.on('change', () => {
    const val = selector.val();
    if (!val) return;

    const match = val.match(/\(([^)]+)\)$/);
    if (!match) return;
    const setName = match[1];

    const trainers = _storage.getTrainers();
    const idx = trainers.findIndex(t => t.name === setName);
    if (idx >= 0) {
      currentTrainerIndex = idx;
      renderRightPanel();
    }
  });
}

// ── Initialisation ────────────────────────────────────────────

async function initPanels() {
  _storage = new GistStorage(
    STORAGE_CONFIG.token,
    STORAGE_CONFIG.setsGistId,
    STORAGE_CONFIG.trainersGistId
  );
  await _storage.init();

  // Initialise si vide ou ancien format
  let setsData = _storage.getSets();
  if (!setsData || !setsData.boxes) {
    setsData = {
      boxes: [
        { id: 'team', name: 'Team', sets: [] },
        { id: 'box-1', name: 'Box 1', sets: [] },
      ],
      trash: []
    };
    await _storage.saveSets(setsData);
  }

  // Ajoute Team si absente
  if (!setsData.boxes.find(b => b.id === 'team')) {
    setsData.boxes.unshift({ id: 'team', name: 'Team', sets: [] });
    await _storage.saveSets(setsData);
  }

  renderLeftPanel();
  renderRightPanel();
  interceptImportButton();
  interceptP2Selector();

  // Boutons
  document.getElementById('btn-add-box')?.addEventListener('click', async () => {
    const d = _storage.getSets();
    const n = d.boxes.filter(b => b.id !== 'team').length + 1;
    d.boxes.push({ id: 'box-' + Date.now(), name: `Box ${n}`, sets: [] });
    await _storage.saveSets(d);
    renderLeftPanel();
  });

  document.getElementById('btn-empty-trash')?.addEventListener('click', async () => {
    if (!confirm('Vider la poubelle définitivement ?')) return;
    const d = _storage.getSets();
    d.trash = [];
    await _storage.saveSets(d);
    syncLocalStorage(d);
    renderLeftPanel();
  });

  document.getElementById('btn-empty-all')?.addEventListener('click', async () => {
    if (!confirm('Vider toutes les boxes ?')) return;
    const d = _storage.getSets();
    d.boxes.forEach(b => b.sets = []);
    await _storage.saveSets(d);
    syncLocalStorage(d);
    renderLeftPanel();
  });

  document.getElementById('btn-prev-trainer')?.addEventListener('click', () => {
    const t = _storage.getTrainers();
    if (!t.length) return;
    currentTrainerIndex = (currentTrainerIndex - 1 + t.length) % t.length;
    renderRightPanel();
  });

  document.getElementById('btn-next-trainer')?.addEventListener('click', () => {
    const t = _storage.getTrainers();
    if (!t.length) return;
    currentTrainerIndex = (currentTrainerIndex + 1) % t.length;
    renderRightPanel();
  });

  document.getElementById('btn-reset-trainer')?.addEventListener('click', () => {
    currentTrainerIndex = 0;
    renderRightPanel();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPanels);
} else {
  initPanels();
}