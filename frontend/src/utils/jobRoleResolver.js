// Utility to resolve job role names from backend/dropdown to mapping keys
// without requiring the mapping file keys to be edited.

import { jobRoleCertifications } from '../data/certificateJobRoleMapping';

const aliasMap = {
  'aerial cabling (ladder)': 'Aerial cabling (LADDER)',
  'cal/omi (ladder)': 'CAL/OMI (LADDER)',
  'poling - overhead copper dropwiring (ladder)': 'Poling - Overhead Copper dropwiring (LADDER)',
  'poling - overhead copper jointing (ladder)': 'Poling - Overhead Copper Jointing (LADDER)',
  'fttp l2c step 2': 'FTTP L2C step 2',
  'desilting, gully sucking or manhole survey': 'Desilting, Gully sucking or Manhole survey',
  'supply and install - fibre cable installation': 'Supply and Install - Fibre Cable installation',
  'copper jointing ug': 'Copper Jointing UG',
  'copper first look ug': 'Copper First Look UG',
  'dslam battery replacement or rotation': 'DSLAM Battery Replacement or Rotation'
};

export function resolveJobRoleKey(inputName) {
  if (!inputName || typeof inputName !== 'string') return null;
  const name = inputName.trim();
  const keys = Object.keys(jobRoleCertifications);

  // 1) Exact match
  if (keys.includes(name)) return name;

  // 2) Case-insensitive exact match
  const lower = name.toLowerCase();
  const ciMatch = keys.find(k => k.toLowerCase() === lower);
  if (ciMatch) return ciMatch;

  // 3) Alias mapping
  if (aliasMap[lower]) return aliasMap[lower];

  // 4) Heuristic tweaks
  // - Normalize (Ladder) -> (LADDER)
  const ladderNorm = name.replace('(Ladder)', '(LADDER)');
  if (ladderNorm !== name && keys.includes(ladderNorm)) return ladderNorm;

  // - Normalize "Step 2" -> "step 2" for FTTP naming
  const step2Norm = name.replace('Step 2', 'step 2');
  if (step2Norm !== name && keys.includes(step2Norm)) return step2Norm;

  // - Normalize trailing 'survey' -> 'surveying'
  if (lower.endsWith(' survey')) {
    const surveyNorm = name.slice(0, -' survey'.length) + ' survey';
    if (keys.includes(surveyNorm)) return surveyNorm;
  }

  // No resolution found
  return null;
}

export function getCertificatesForAnyJobRole(rawName, getCertificatesForJobRole) {
  const resolved = resolveJobRoleKey(rawName);
  if (resolved) return getCertificatesForJobRole(resolved);
  return { mandatory: [], alternative: [] };
}
