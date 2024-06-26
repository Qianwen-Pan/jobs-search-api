const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

const jobsFilePath = path.join(__dirname, 'jobs.json');
const subCategories = [1, 2, 3, 4, 6];

const fetchAllJobsForSubCategory = async (subCategory) => {
    let page = 1;
    const perPage = 50;
    let allJobs = [];
    let hasMoreJobs = true;

    while (hasMoreJobs) {
        const url = `https://www.51.ca/jobs/api/sub-categories/${subCategory}/job-posts?page=${page}&perPage=${perPage}`;
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
            console.error(`Error fetching jobs from page ${page} for sub-category ${subCategory}:`, error.message);
        }
    }

    return allJobs;
};

const fetchAllJobs = async () => {
    let allJobs = [];

    for (const subCategory of subCategories) {
        const jobs = await fetchAllJobsForSubCategory(subCategory);
        allJobs = allJobs.concat(jobs);
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

const readJobsFromFile = async () => {
    try {
        const data = await fs.readFile(jobsFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        } else {
            throw error;
        }
    }
};

const writeJobsToFile = async (jobs) => {
    try {
        await fs.writeFile(jobsFilePath, JSON.stringify(jobs, null, 2));
    } catch (error) {
        console.error('Error writing jobs to file:', error.message);
    }
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
        console.log("all jobs:", sortedJobs.length);

        // Read existing jobs from file
        const existingJobs = await readJobsFromFile();

        const detailedJobs = [];
        let newJobs = 0;
        for (const job of sortedJobs) {
            let jobDetails = existingJobs.find(j => j.id === job.id);
            if (!jobDetails) {
                newJobs++;
                const jobUrl = `https://www.51.ca/jobs/job-posts/${job.id}`;
                jobDetails = await fetchJobDetails(jobUrl);
                if (jobDetails) {
                    jobDetails = { ...job, ...jobDetails };
                    existingJobs.push(jobDetails);
                }
            }
            if (jobDetails) {
                detailedJobs.push(jobDetails);
            }
        }
        console.log("new Jobs",newJobs);
        // Write the updated jobs to the file
        await writeJobsToFile(existingJobs);

        res.json(detailedJobs);
    } catch (error) {
        console.error('Error fetching job data:', error.message);
        res.status(500).json({ error: 'Error fetching job data' });
    }
};

module.exports = {
    getJobs,
};
