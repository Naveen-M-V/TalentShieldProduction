const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 93 job roles - ensure this list is correct and unique. Review and match carefully!
const jobRoles = [
  "Spine Survey",
  "Heavy Cabling UG",
  "Cable Blowing",
  "Overblow",
  "Fibre Jointing (Ladder)",
  "Fibre Jointing (MEWP)",
  "Fibre Light Loss Testing (Ladder)",
  "Fibre Light Loss Testing (MEWP)",
  "Fibre Jointing - UG only",
  "Ribbon Fibre Jointing",
  "OFN Fibre Cabling - UG",
  "OFN Fibre Cabling - OH (Ladder)",
  "OFN Fibre Cabling - OH (MEWP)",
  "Rod and Rope",
  "FTTP Access Survey - 2",
  "FTTP Quality Checks - 2",
  "MDU Survey",
  "MDU Quality Checks",
  "MDU L2C",
  "Internal MDU Build",
  "FTTP L2C Home Install",
  "FTTP L2C step 1 (Ladder)",
  "FTTP L2C step 1 (MEWP)",
  "FTTP L2C step 1 - OH only (Ladder)",
  "FTTP L2C step 1 - OH only (MEWP)",
  "FTTP L2C repair (Ladder)",
  "FTTP L2C repair (MEWP)",
  "FTTP L2C Step 2",
  "Optical Test Head Installation - Viavi",
  "Optical Test Head Installation - Exfo",
  "PTO",
  "Supervisor - 2",
  "Poling - PEU Operative",
  "Poling - Overhead Copper dropwiring (Ladder)",
  "Poling - Overhead Copper dropwiring (MEWP)",
  "Poling - Overhead Copper Jointing (Ladder)",
  "Poling - Overhead Copper Jointing (MEWP)",
  "MEWP Operator",
  "Manual poling (provision and recovery)",
  "Pole recovery",
  "Pole Survey (AAP)",
  "Aerial cabling (Ladder)",
  "Aerial cabling (MEWP)",
  "Poling Labourer",
  "Blockages",
  "Chambers Modular",
  "Chambers Concrete",
  "Chambers Concrete advanced",
  "Carriageway Chambers",
  "Chambers Brick",
  "Manhole build",
  "Manhole Reroof",
  "Duct Laying Basic",
  "Duct Laying Intermediate",
  "Duct Laying Advanced",
  "Duct Slew Basic",
  "Duct Slew Intermediate",
  "Duct Slew Advanced",
  "Mole ploughing",
  "Maintenance Excavation",
  "Reinstatement Operative - Footway",
  "Reinstatement Operative - Carriageway",
  "Frame and Cover footway",
  "Frame and Cover Carriageway",
  "DSLAM Construction",
  "PCP Construction",
  "Desilting, Gully sucking or Manhole survey",
  "Narrow Trenching",
  "Labourer",
  "Trial Hole Excavation",
  "FTTC Commissioning",
  "Copper Frames",
  "Fibre Frames - Accredited for correct frame type",
  "CAL/OMI (Ladder)",
  "CAL/OMI (MEWP)",
  "Copper jointing UG",
  "Copper first look UG",
  "FTTC MI (Ladder)",
  "FTTC MI (MEWP)",
  "FTTC SI",
  "PCP Maintenance",
  "Heavy cable recovery",
  "Supply and Install Engineer",
  "Supply and Install - fibre cable installation",
  "Supply and Install - Mobile installation",
  "Supply and Install - Civils",
  "Ancillary Wiring or LLU Cabling",
  "Auxillary Overhead",
  "DSLAM Power Meter",
  "DSLAM - Power (RCD)",
  "DSLAM Battery replacement or rotation",
  "Conductive Concrete",
  "Equipotential Bonding"
];

// Remove duplicates and trim: deduplicate by lowercased string, but preserve display
const displayToKey = role => role.trim().toLowerCase();
const dedupedRolesMap = {};
jobRoles.forEach(role => {
  const key = displayToKey(role);
  dedupedRolesMap[key] = role.trim();
});
const uniqueJobRoles = Object.values(dedupedRolesMap);

if (uniqueJobRoles.length !== 93) {
  console.warn(`Warning: Expected 93 unique job roles, found ${uniqueJobRoles.length}`);
}

async function populateJobRoles() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('hrms');
    const collection = db.collection('jobroles');

    // Clear existing job roles
    await collection.deleteMany({});
    console.log('Cleared existing job roles');

    // Insert new job roles
    const jobRoleDocuments = uniqueJobRoles.map(name => ({
      name,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await collection.insertMany(jobRoleDocuments);
    console.log(`Successfully inserted ${result.insertedCount} job roles`);

    // Display inserted job roles
    console.log('\nInserted job roles:');
    uniqueJobRoles.forEach((role, index) => {
      console.log(`${index + 1}. ${role}`);
    });

  } catch (error) {
    console.error('Error populating job roles:', error);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

populateJobRoles();
