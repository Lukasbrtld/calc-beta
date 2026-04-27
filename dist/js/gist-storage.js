// Initialise la config depuis l'URL ou le localStorage
(function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const sets = params.get('sets');
  const trainers = params.get('trainers');

  if (token && sets && trainers) {
    localStorage.setItem('calc_token', token);
    localStorage.setItem('calc_sets_gist', sets);
    localStorage.setItem('calc_trainers_gist', trainers);
    window.history.replaceState({}, '', window.location.pathname);
  }
})();

const GIST_API = 'https://api.github.com/gists';

class GistStorage {
  constructor(token, setsGistId, trainersGistId) {
    this.token = token;
    this.setsGistId = setsGistId;
    this.trainersGistId = trainersGistId;
    this._cache = { sets: null, trainers: null };
  }

  // --- Méthode interne : lecture d'un Gist ---
  async _readGist(gistId) {
    const res = await fetch(`${GIST_API}/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    if (!res.ok) throw new Error(`Gist read failed (${res.status}): ${gistId}`);
    const data = await res.json();
    // Récupère le contenu du premier fichier trouvé dans le Gist
    const firstFile = Object.values(data.files)[0];
    return JSON.parse(firstFile.content);
  }

  // --- Méthode interne : écriture dans un Gist ---
  async _writeGist(gistId, filename, payload) {
    const res = await fetch(`${GIST_API}/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          [filename]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`Gist write failed (${res.status}): ${gistId}`);
    return res.json();
  }

  // --- Init : charge les deux Gists en parallèle au démarrage ---
  async init() {
    try {
      const [sets, trainers] = await Promise.all([
        this._readGist(this.setsGistId),
        this._readGist(this.trainersGistId),
      ]);
      this._cache.sets = sets;
      this._cache.trainers = trainers;
      console.log(`[GistStorage] Chargé : ${sets.length} sets, ${trainers.length} dresseurs`);
    } catch (err) {
      console.error('[GistStorage] Erreur init :', err);
      throw err;
    }
  }

  // --- Sets ---
  getSets()               { return this._cache.sets ?? []; }
  async saveSets(sets)    {
    this._cache.sets = sets;
    return this._writeGist(this.setsGistId, 'sets.json', sets);
  }

  // --- Dresseurs ---
  getTrainers()              { return this._cache.trainers ?? []; }
  async saveTrainers(trainers) {
    this._cache.trainers = trainers;
    return this._writeGist(this.trainersGistId, 'trainers.json', trainers);
  }

  // --- Utilitaire : ajouter un set sans écraser les autres ---
  async addSet(set) {
    const sets = this.getSets();
    // Remplace si un set avec le même nom+espèce existe déjà
    const idx = sets.findIndex(s => s.name === set.name && s.species === set.species);
    if (idx >= 0) sets[idx] = set;
    else sets.push(set);
    return this.saveSets(sets);
  }

  // --- Utilitaire : ajouter/mettre à jour un dresseur ---
  async addTrainer(trainer) {
    const trainers = this.getTrainers();
    const idx = trainers.findIndex(t => t.id === trainer.id);
    if (idx >= 0) trainers[idx] = trainer;
    else trainers.push(trainer);
    return this.saveTrainers(trainers);
  }
}