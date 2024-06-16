const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs_controller");

router.route("/")
    .get(jobsController.getJobs);

module.exports = router;