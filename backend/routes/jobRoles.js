'use strict';
// routes/jobRoles.js — uses shared Mongoose connection (no raw MongoClient)
const express = require('express');
const router  = express.Router();
const JobRole = require('../models/JobRole');

// GET /api/job-roles — list all, sorted alphabetically
router.get('/', async (req, res) => {
  try {
    const jobRoles = await JobRole.find().sort({ name: 1 }).lean();
    res.json(jobRoles);
  } catch (err) {
    console.error('Error fetching job roles:', err);
    res.status(500).json({ error: 'Failed to fetch job roles' });
  }
});

// GET /api/job-roles/search?q=... — search by name
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    const jobRoles = await JobRole.find({ name: { $regex: q, $options: 'i' } }).lean();
    res.json(jobRoles);
  } catch (err) {
    console.error('Error searching job roles:', err);
    res.status(500).json({ error: 'Failed to search job roles' });
  }
});

// POST /api/job-roles — create a new job role
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Job role name is required' });
    }

    const existing = await JobRole.findOne({
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (existing) return res.status(409).json({ error: 'Job role already exists' });

    const jobRole = await JobRole.create({
      name: name.trim(),
      description: description?.trim() || ''
    });
    res.status(201).json(jobRole);
  } catch (err) {
    console.error('Error adding job role:', err);
    res.status(500).json({ error: 'Failed to add job role' });
  }
});

module.exports = router;
