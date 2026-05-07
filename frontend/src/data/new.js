// Certificate to Job Role Mapping Data
// Extracted from Excel data provided by user

export const jobRoleCertificateMapping = {
  // Civils Job Roles
  "Heavy Cabling UG": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["K008", "N023"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },
  
  "Rod and Rope": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["K008", "N023"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "SA018"]
  },

  "Fibre Jointing (Ladder)": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "Fibre Jointing (MEWP)": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038", "SA020"]
  },

  "Overhead Civils": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "K008"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },

  "Fibre Light Live Testing (MEWP)": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["N023", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "Fibre Splicing": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "Balloon Fibre Splicing": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038", "SA020"]
  },

  "OH Fibre Cabling": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "K008"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },

  "OH Fibre Cabling - OH (MEWP)": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["N023", "K008"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "SA020", "Emergency First Aid"]
  },

  // Flex/Fibre Job Roles
  "FTTP Civils": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "MDU Quality Checks": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "FTTP LBC (Ladder)": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  "FTTP LBC (MEWP)": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038", "SA020"]
  },

  // Additional roles from the data
  "Manual Jointing (Overhead and recovery)": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "K008"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },

  "Duct Survey": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["K008", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "SA018"]
  },

  "Cable Blowing UG": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["K008", "N023"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "N038"]
  },

  // New Sample Job Roles for Demo
  "Network Engineer": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023", "N027", "N038", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid", "SA018"]
  },

  "Site Supervisor": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["K008", "N023"],
    mandatoryNRSWA: ["NRSWA Certificate LA & O1 & O2 & O3"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid", "SA018", "SA020"]
  },

  "Apprentice Technician": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },

  "Senior Field Engineer": {
    mandatorySafety: ["SA002", "SA006", "SA001"],
    mandatoryCraft: ["K008", "N023", "N027", "N038", "N039"],
    mandatoryNRSWA: ["NRSWA Certificate LA & O1 & O2 & O3"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid", "SA018", "SA020"]
  },

  // Additional job roles from spreadsheet
  "Project Manager": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid"]
  },

  "Health & Safety Officer": {
    mandatorySafety: ["SA002", "SA006", "SA005"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Advanced First Aid", "Fire Safety"]
  },

  "Quality Assurance": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid"]
  },

  "Network Engineer": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: ["N023"],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["N038", "N039"]
  },

  "Field Technician": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023"],
    mandatoryNRSWA: ["NRSWA Certificate O1"],
    mandatorySecurity: ["MT003"],
    optional: ["SA005", "Emergency First Aid"]
  },

  "Operations Manager": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid"]
  },

  "Training Coordinator": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid", "Advanced First Aid"]
  },

  "Compliance Officer": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid"]
  },

  "Administrative Assistant": {
    mandatorySafety: [],
    mandatoryCraft: [],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: []
  },

  "Team Leader": {
    mandatorySafety: ["SA002", "SA006"],
    mandatoryCraft: ["N023"],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["Emergency First Aid", "Advanced First Aid"]
  },

  "Technical Specialist": {
    mandatorySafety: ["SA002"],
    mandatoryCraft: ["N023", "N027"],
    mandatoryNRSWA: [],
    mandatorySecurity: ["MT003"],
    optional: ["N038", "N039"]
  }
};

// All available certificates with descriptions
export const allCertificates = {
  // Safety Accreditations
  "SA001": "MEWP (Mobile Elevated Work Platform) Safety Certification",
  "SA002": "Basic Safety Training and Awareness",
  "SA006": "Advanced Safety Protocol and Risk Assessment",
  "SA005": "General Safety Awareness and Site Induction",
  "SA018": "Specialized Safety Protocol for High-Risk Operations",
  "SA020": "Environmental Safety and Sustainability Practices",

  // Craft Accreditations
  "K008": "Underground Cabling Specialist Certification",
  "N023": "Fibre Optic Technician Level 1",
  "N027": "Advanced Fibre Optic Installation and Maintenance",
  "N038": "Telecommunications Equipment Installation",
  "N039": "Network Infrastructure Design and Implementation",

  // NRSWA Streetworks
  "NRSWA Certificate O1": "NRSWA Operative Unit 1 - Basic Streetworks",
  "NRSWA Certificate LA & O1 & O2 & O3": "NRSWA Location & Assessment + All Operative Units (Supervisor Level)",

  // Security and Regulatory
  "MT003": "Mandatory Security & Regulatory Compliance Training",

  // Optional certifications
  "Emergency First Aid": "Basic Emergency Response and First Aid",
  "Advanced First Aid": "Advanced Emergency Medical Response",
  "Fire Safety": "Fire Prevention and Emergency Response"
};

// Helper function to get all certificates for a job role
export const getCertificatesForJobRole = (jobRole) => {
  const mapping = jobRoleCertificateMapping[jobRole];
  if (!mapping) return { mandatory: [], optional: [] };

  const mandatory = [
    ...mapping.mandatorySafety,
    ...mapping.mandatoryCraft,
    ...mapping.mandatoryNRSWA,
    ...mapping.mandatorySecurity
  ];

  return {
    mandatory: mandatory.map(cert => ({
      code: cert,
      description: allCertificates[cert] || cert,
      category: getCertificateCategory(cert, mapping)
    })),
    optional: mapping.optional.map(cert => ({
      code: cert,
      description: allCertificates[cert] || cert,
      category: 'Optional'
    }))
  };
};

// Helper function to determine certificate category
const getCertificateCategory = (cert, mapping) => {
  if (mapping.mandatorySafety.includes(cert)) return 'Safety';
  if (mapping.mandatoryCraft.includes(cert)) return 'Craft';
  if (mapping.mandatoryNRSWA.includes(cert)) return 'NRSWA';
  if (mapping.mandatorySecurity.includes(cert)) return 'Security';
  return 'Other';
};

// Get all unique job roles
export const getAllJobRoles = () => {
  return Object.keys(jobRoleCertificateMapping);
};
