const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');

router.get('/', usersController.getWorkers);
router.get('/:id', usersController.getWorkerById);

module.exports = router;
