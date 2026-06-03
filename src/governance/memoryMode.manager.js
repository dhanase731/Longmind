const VALID = ['OFF', 'SESSION', 'EPISODIC', 'SEMANTIC', 'FULL', 'INCOGNITO'];

function isValid(mode) {
  return VALID.includes((mode || '').toUpperCase());
}

function normalize(mode) {
  if (!mode) return 'FULL';
  return mode.toUpperCase();
}

function allowRetrieval(mode) {
  mode = normalize(mode);
  if (mode === 'OFF' || mode === 'INCOGNITO') return false;
  return true;
}

function allowStorage(mode) {
  mode = normalize(mode);
  if (mode === 'OFF' || mode === 'INCOGNITO') return false;
  return true;
}

function allowedTypes(mode) {
  mode = normalize(mode);
  switch (mode) {
    case 'OFF':
      return [];
    case 'SESSION':
      return ['stm'];
    case 'EPISODIC':
      return ['episodic', 'stm'];
    case 'SEMANTIC':
      return ['semantic', 'stm'];
    case 'FULL':
      return ['stm', 'episodic', 'semantic', 'ltm'];
    case 'INCOGNITO':
      return [];
    default:
      return ['stm', 'episodic', 'semantic', 'ltm'];
  }
}

module.exports = { isValid, normalize, allowRetrieval, allowStorage, allowedTypes };
