'use strict';
/**
 * Certificate Name Routes
 * Mounted at:  /api/certificate-names
 * Manages the curated list of known certificate names used in autocomplete.
 */

const express         = require('express');
const router          = express.Router();
const CertificateName = require('../models/CertificateName');

// ── GET /api/certificate-names ────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const names = await CertificateName.find().sort({ usageCount: -1, name: 1 });
    res.json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/certificate-names/search ────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      const names = await CertificateName.find().sort({ usageCount: -1, name: 1 });
      return res.json(names);
    }
    const names = await CertificateName.find({ name: { $regex: q, $options: 'i' } })
      .sort({ usageCount: -1, name: 1 });
    res.json(names);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/certificate-names ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Certificate name is required' });
    }
    const trimmed = name.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let entry = await CertificateName.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });

    if (entry) {
      entry.usageCount += 1;
      await entry.save();
    } else {
      entry = await new CertificateName({ name: trimmed, createdBy: req.user?.userId, usageCount: 1 }).save();
    }
    res.json(entry);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Certificate name already exists' });
    res.status(400).json({ message: error.message });
  }
});

// ── POST /api/certificate-names/initialize ────────────────────────────────
// Seeds the database with predefined industry-standard certificate codes.
router.post('/initialize', async (req, res) => {
  try {
    const predefined = [
      'SA006','SA001','SA001A','SA009','SA051C','IPAF 1B','SA020','A16','SA020A','SA007',
      'SA021','A14','GO1','EUSR Category 3','EUSR Category 4','EUSR Category 5',
      'Level 2 Award Excavation support systems','MOCOPA','Emergency first Aid','SA018',
      'NRSWA Card Certificate S1','NRSWA Certificate LA','NRSWA Certificate O2','NRSWA Certificate O3',
      'NRSWA Certificate O4','NRSWA Certificate O5','NRSWA Certificate O6','NRSWA Certificate O7',
      'NRSWA Certificate O8','SA051C or Equivalent','K008','SA005','SA003','K009','N020','J005',
      'SA008','SA024','S017','M022','M006','N10','N039','SA023 or Equivalent','K003','K004',
      'O008','1a','3a','3b or Equivalent','Q035(SEC1)','Q036(SLEW1)','Q037(SLEW2)','Q038(SLEW3)',
      'Certificate O6','Certificate O7','Certificate O5','N025','F016','F022','SA004','N024',
      'H004','J008','F017','G005','N030','N006','G39','UKATA','SA026 or Equivalent','S013',
      'S018','K006','N033','N023','N026','N034','N028','N027','S011','M023','S012','M029',
      'N029','N038','N022','N043','N011','N037','N036','N041','N035','O002','O003','O004',
      'O005','O006','E001','F020','O009','Q020(DB1)','Q013(BB1M)','Q012(BB1C)','Q014(BB2C)',
      'Q015(BB3C)','Q011(BB1B)','Q029(MH1)','Q031','Q021(DL1)','Q019(CD1)','Q022(DL2)','Q023(DL3)',
      'Q030(MP1)','Q028(ME1)','Q025(FCFW1)','Q024(FCCW1)','Q016(CB2)','Q017(CB3)','Q018(CCC1)',
      'Q039','N005','H001','N031(ODF)','N004(OCR)','J010(OFF)','J010(OFR)','C004','F005',
      'F023','K010','C&G Part 1,2 & 3','18th edition','C&G 2391 - 51',
      'Ace Telecoms Battery installation course','A350',
    ];

    let added = 0;
    for (const certName of predefined) {
      try {
        const esc      = certName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existing = await CertificateName.findOne({ name: { $regex: new RegExp(`^${esc}$`, 'i') } });
        if (!existing) {
          await new CertificateName({ name: certName, usageCount: 1 }).save();
          added++;
        }
      } catch (itemErr) {
        console.error(`Error processing "${certName}":`, itemErr.message);
      }
    }

    res.json({ message: `Initialized ${added} new certificate names`, total: predefined.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
