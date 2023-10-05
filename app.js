const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;
const _ = require("lodash"); // Import Lodash

// Middleware to parse JSON requests
app.use(express.json());

// Use the cors middleware with appropriate options
app.use(
  cors({
    origin: "*", // Change this to the specific origin you want to allow
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Function to fetch blog data
const fetchBlogData = async () => {
  try {
    const response = await axios.get(
      "https://intent-kit-16.hasura.app/api/rest/blogs",
      {
        headers: {
          "x-hasura-admin-secret":
            "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
        },
      }
    );

    if (response.status === 200) {
      return response.data.blogs; // Return the blogs array
    } else {
      throw new Error("Failed to fetch blog data from the third-party API.");
    }
  } catch (error) {
    throw error;
  }
};

// Cache the fetchBlogData function with a 5-minute expiration period
const cachedFetchBlogData = _.memoize(fetchBlogData, () => Date.now(), 300000);

// Function to calculate analytics
const calculateAnalytics = async () => {
  const blogs = await cachedFetchBlogData();

  // Analytics using Lodash
  const totalBlogs = blogs.length;
  const blogWithLongestTitle = _.maxBy(blogs, (blog) => blog.title.length);
  const blogsWithPrivacyTitle = _.filter(blogs, (blog) =>
    blog.title.toLowerCase().includes("privacy")
  );
  const uniqueBlogTitles = _.uniq(_.map(blogs, "title"));

  return {
    totalBlogs,
    longestBlogTitle: blogWithLongestTitle.title,
    blogsContainingPrivacy: blogsWithPrivacyTitle.length,
    uniqueBlogTitles,
  };
};

// Cache the calculateAnalytics function with a 5-minute expiration period
const cachedCalculateAnalytics = _.memoize(
  calculateAnalytics,
  () => Date.now(),
  300000
);

// Route for /api/blog-stats
app.get("/api/blog-stats", async (req, res, next) => {
  try {
    const statistics = await cachedCalculateAnalytics();
    res.json(statistics); // Send the statistics as the response
  } catch (error) {
    console.error("Error fetching and analyzing blog data:", error);

    // Respond with an appropriate error message
    res.status(500).json({
      error: "An error occurred while fetching and analyzing blog data.",
    });
  }
});

// Route for /api/blog-search
app.get("/api/blog-search", async (req, res, next) => {
  try {
    const query = req.query.query; // Get the query parameter from the request

    if (!query) {
      return res
        .status(400)
        .json({ error: 'Query parameter "query" is required.' });
    }

    // Fetch blog data
    const blogs = await cachedFetchBlogData();

    // Search functionality
    const searchResults = blogs.filter((blog) =>
      blog.title.toLowerCase().includes(query.toLowerCase())
    );

    res.json(searchResults); // Send the search results as the response
  } catch (error) {
    console.error("Error performing blog search:", error);

    // Respond with an appropriate error message
    res
      .status(500)
      .json({ error: "An error occurred while performing the blog search." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
