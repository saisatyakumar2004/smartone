const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const { STATUSES } = JobApplication;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Validates and cleans the request body. Returns { error } or { data }.
function parseBody(body) {
  const company = str(body.company);
  const role = str(body.role);
  const jobUrl = str(body.jobUrl);
  const notes = str(body.notes);
  const status = body.status === undefined || body.status === '' ? 'Applied' : body.status;
  const appliedDate = new Date(body.appliedDate);

  if (!company || !role) return { error: 'Company name and job role are required.' };
  if (!body.appliedDate || Number.isNaN(appliedDate.getTime())) return { error: 'A valid application date is required.' };
  if (!STATUSES.includes(status)) return { error: `Status must be one of: ${STATUSES.join(', ')}.` };
  if (jobUrl && !/^https?:\/\/\S+$/i.test(jobUrl)) return { error: 'Job URL must start with http:// or https://.' };
  if (company.length > 150 || role.length > 150) return { error: 'Company and role must be 150 characters or fewer.' };
  if (jobUrl.length > 500) return { error: 'Job URL must be 500 characters or fewer.' };
  if (notes.length > 2000) return { error: 'Notes must be 2000 characters or fewer.' };

  return { data: { company, role, jobUrl, notes, status, appliedDate } };
}

// Loads an application only if it belongs to the logged-in user.
// Returns 404 (not 403) for other users' records so existence isn't leaked.
async function findOwned(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid application id.' });
    return null;
  }
  const app = await JobApplication.findOne({ _id: req.params.id, user: req.user._id });
  if (!app) {
    res.status(404).json({ message: 'Application not found.' });
    return null;
  }
  return app;
}

exports.list = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    const status = str(req.query.status);
    const search = str(req.query.search);

    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status filter.' });
      filter.status = status;
    }
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ company: rx }, { role: rx }];
    }

    const applications = await JobApplication.find(filter).sort({ appliedDate: -1, createdAt: -1 });

    // Stats are over ALL of the user's applications, regardless of search/filter.
    const grouped = await JobApplication.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let total = 0;
    grouped.forEach((g) => {
      byStatus[g._id] = g.count;
      total += g.count;
    });

    res.json({ applications, stats: { total, byStatus } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { error, data } = parseBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const app = await JobApplication.create({ ...data, user: req.user._id });
    res.status(201).json({ application: app });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const app = await findOwned(req, res);
    if (app) res.json({ application: app });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { error, data } = parseBody(req.body);
    if (error) return res.status(400).json({ message: error });
    const app = await findOwned(req, res);
    if (!app) return;
    Object.assign(app, data);
    await app.save();
    res.json({ application: app });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const app = await findOwned(req, res);
    if (!app) return;
    await app.deleteOne();
    res.json({ message: 'Application deleted.' });
  } catch (err) {
    next(err);
  }
};
