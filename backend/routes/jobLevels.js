'use strict';
// routes/jobLevels.js — uses shared Mongoose connection (no raw MongoClient)
const express  = require('express');
const router   = express.Router();
const { ObjectId } = require('mongoose').Types;
const JobLevel = require('../models/JobLevel');

// GET /api/job-levels — list all
router.get('/', async (req, res) => {
  try {
    const jobLevels = await JobLevel.find().sort({ name: 1 }).lean();
    res.json(jobLevels);
  } catch (err) {
    console.error('Error fetching job levels:', err);
    res.status(500).json({ error: 'Failed to fetch job levels' });
  }
});

// GET /api/job-levels/search?q=...
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query is required' });
    const jobLevels = await JobLevel.find({ name: { $regex: q, $options: 'i' } }).lean();
    res.json(jobLevels);
  } catch (err) {
    console.error('Error searching job levels:', err);
    res.status(500).json({ error: 'Failed to search job levels' });
  }
});

// POST /api/job-levels — create
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Job level name is required' });

    const existing = await JobLevel.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: 'Job level already exists' });

    const jobLevel = await JobLevel.create({ name: name.trim(), description: description?.trim() || '' });
    res.status(201).json(jobLevel);
  } catch (err) {
    console.error('Error adding job level:', err);
    res.status(500).json({ error: 'Failed to add job level' });
  }
});

// PUT /api/job-levels/:id — update
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Job level name is required' });

    const jobLevel = await JobLevel.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description?.trim() || '', updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!jobLevel) return res.status(404).json({ error: 'Job level not found' });
    res.json(jobLevel);
  } catch (err) {
    console.error('Error updating job level:', err);
    res.status(500).json({ error: 'Failed to update job level' });
  }
});

// DELETE /api/job-levels/:id
router.delete('/:id', async (req, res) => {
  try {
    const jobLevel = await JobLevel.findByIdAndDelete(req.params.id);
    if (!jobLevel) return res.status(404).json({ error: 'Job level not found' });
    res.json({ message: 'Job level deleted successfully' });
  } catch (err) {
    console.error('Error deleting job level:', err);
    res.status(500).json({ error: 'Failed to delete job level' });
  }
});

module.exports = router;
