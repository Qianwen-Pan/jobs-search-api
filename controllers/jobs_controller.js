const axios = require('axios');
const cheerio = require('cheerio');

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

const fetchJobDetails = async (jobUrl) => {
    try {
        const jobPage = await axios.get(jobUrl);
        const $ = cheerio.load(jobPage.data);

        const jobDetails = {};
        $('.job-detail-section .des-item').each((index, element) => {
            const title = $(element).find('.des-title').text().trim().replace(':', '');
            const content = $(element).find('.des-content').text().trim();
            jobDetails[title] = content;
        });
        const jobDescription = $('.detail-intro-content').text().trim();
        jobDetails['description'] = jobDescription
        const publishTimeText = $('.detail-intro-publish-at').text().trim().replace(' 发布时间：', '');
        jobDetails['publishAt'] = publishTimeText;

        return jobDetails;
    } catch (error) {
        console.error(`Error fetching job details for ${jobUrl}:`, error.message);
        return null;
    }
};

const filterJobsByLocation = (jobs, locations) => {
    return jobs.filter(job => locations.includes(job.workLocation));
};

const sortJobsById = (jobs) => {
    return jobs.sort((a, b) => b.id - a.id);
};

const getJobs = async (req, res) => {
    try {
        const workLocation = req.query.location || '万锦';
        const allJobs = await fetchAllJobs();

        let filteredJobs = allJobs;
        if (workLocation) {
            const locations = workLocation.split(',');
            filteredJobs = filterJobsByLocation(allJobs, locations);
        }

        const sortedJobs = sortJobsById(filteredJobs);
        console.log(sortedJobs.length);

        // Fetch details for each job
        const detailedJobs = [];
        for (const job of sortedJobs) {
            const jobUrl = `https://www.51.ca/jobs/job-posts/${job.id}`;
            const details = await fetchJobDetails(jobUrl);
            if (details) {
                detailedJobs.push({ ...job, ...details });
            }
        }

        res.json(detailedJobs);
    } catch (error) {
        console.error('Error fetching job data:', error.message);
        res.status(500).json({ error: 'Error fetching job data' });
    }
};

module.exports = {
    getJobs,
};
