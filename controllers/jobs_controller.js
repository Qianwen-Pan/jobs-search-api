const axios = require("axios");

const fetchAllJobs = async () => {
  let page = 1;
  const perPage = 50;
  let allJobs = [];
  let hasMoreJobs = true;

  while (hasMoreJobs) {
    const url = `https://www.51.ca/jobs/api/sub-categories/2/job-posts?page=${page}&perPage=${perPage}`;
    try {
      const response = await axios.get(url);

      if (response.status === 200 && response.data.data.length > 0) {
        allJobs = allJobs.concat(response.data.data);
        page++;
      } else {
        hasMoreJobs = false;
      }
    } catch (error) {
      hasMoreJobs = false;
      console.error(`Error fetching jobs from page ${page}:`, error.message);
    }
  }

  return allJobs;
};

const filterJobsByLocation = (jobs, locations) => {
  return jobs.filter((job) => locations.includes(job.workLocation));
};

const sortJobsById = (jobs) => {
  return jobs.sort((a, b) => b.id - a.id);
};

const getJobs = async (req, res) => {
  try {
    const workLocation = req.query.location || "万锦";
    const allJobs = await fetchAllJobs();

    let filteredJobs = allJobs;

    filteredJobs = filterJobsByLocation(allJobs, workLocation);

    console.log(filteredJobs.length);
    const sortedJobs = sortJobsById(filteredJobs);
    res.json(sortedJobs);
  } catch (error) {
    console.error("Error fetching job data:", error.message);
    res.status(500).json({ error: "Error fetching job data" });
  }
};

module.exports = {
  getJobs,
};
