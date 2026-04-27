const STORAGE_CONFIG = (function() {
  // Lit depuis l'URL si présent : ?token=xxx&sets=yyy&trainers=zzz
  const params = new URLSearchParams([window.location.search]);
  const token = params.get('token');
  const setsGistId = params.get('sets');
  const trainersGistId = params.get('trainers');

  // Si les params sont dans l'URL, les sauvegarder dans localStorage
  if (token && setsGistId && trainersGistId) {
    localStorage.setItem('calc_token', token);
    localStorage.setItem('calc_sets_gist', setsGistId);
    localStorage.setItem('calc_trainers_gist', trainersGistId);
    // Nettoie l'URL sans recharger la page
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Lit depuis localStorage
  const storedToken = localStorage.getItem('calc_token');
  const storedSets = localStorage.getItem('calc_sets_gist');
  const storedTrainers = localStorage.getItem('calc_trainers_gist');

  return {
    token: storedToken || '',
    setsGistId: storedSets || '',
    trainersGistId: storedTrainers || '',
  };
})();