const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jobsRouter = require("./routes/jobs");

dotenv.config();
const app = express();

const port = process.env.PORT || 8080;
app.use(cors());

app.use("/jobs", jobsRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

