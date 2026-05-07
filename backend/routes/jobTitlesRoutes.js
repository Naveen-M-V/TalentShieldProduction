'use strict';
/**
 * Job Title Routes
 * Mounted at:  /api/job-titles
 */

const express  = require('express');
const router   = express.Router();
const JobTitle = require('../models/JobTitle');

// ── GET /api/job-titles ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const jobTitles = await JobTitle.find({ isActive: true }).sort({ name: 1 });
    res.json(jobTitles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/job-titles/search ────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const jobTitles = await JobTitle.find({
      name:     { $regex: q || '', $options: 'i' },
      isActive: true,
    }).sort({ name: 1 }).limit(10);
    res.json(jobTitles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/job-titles ──────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Job title name is required' });
    }
    const trimmed  = name.trim();
    let   jobTitle = await JobTitle.findOne({ name: { $regex: new RegExp(`^${trimmed}$`, 'i') } });

    if (jobTitle) return res.json(jobTitle);

    jobTitle = await new JobTitle({
      name:        trimmed,
      description: description?.trim(),
      createdBy:   req.user?.userId,
    }).save();

    res.status(201).json(jobTitle);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Job title already exists' });
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
