// src/utils/vtid.js
export function generateVTID(profile) {
  if (!profile) return "N/A";
 
  if (profile.vtid) return profile.vtid;


  const firstName = profile.firstName || '';
  const lastName = profile.lastName || '';
  const company = profile.company || 'VTX';
  const timestamp = profile.createdOn ? new Date(profile.createdOn).getTime() : Date.now();

  return `${company.substring(0, 3).toUpperCase()}${firstName.substring(0, 2).toUpperCase()}${lastName.substring(0, 2).toUpperCase()}${timestamp.toString().slice(-4)}`;
}
