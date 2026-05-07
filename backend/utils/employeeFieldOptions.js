const ETHNICITY_OPTIONS = [
  'Unspecified',
  'Asian',
  'Black',
  'White',
  'Mixed',
  'Other'
];

const EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Friend',
  'Partner',
  'Other'
];

const normalizeEthnicity = (value) => {
  if (value === undefined || value === null || value === '') return 'Unspecified';
  return ETHNICITY_OPTIONS.includes(value) ? value : 'Other';
};

const normalizeEmergencyContactRelationship = (value) => {
  if (value === undefined || value === null || value === '') return '';
  return EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS.includes(value) ? value : 'Other';
};

module.exports = {
  ETHNICITY_OPTIONS,
  EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS,
  normalizeEthnicity,
  normalizeEmergencyContactRelationship
};
