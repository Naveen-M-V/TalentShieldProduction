const express = require('express');
const router  = require('express').Router();
const JobRole = require('../models/JobRole');

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

// POST /api/bulk-job-roles - Bulk insert job roles
router.post('/bulk-job-roles', async (req, res) => {
  try {
    // Remove duplicates and prepare documents
    const uniqueJobRoles = [...new Set(jobRoles)];
    const docs = uniqueJobRoles.map(name => ({ name: name.trim() }));

    // Replace all existing job roles
    await JobRole.deleteMany({});
    const result = await JobRole.insertMany(docs, { ordered: false });

    res.json({
      success: true,
      message: `Successfully inserted ${result.length} job roles`,
      count: result.length,
      jobRoles: uniqueJobRoles
    });
  } catch (err) {
    console.error('Error bulk inserting job roles:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk insert job roles',
      error: err.message
    });
  }
});

module.exports = router;
