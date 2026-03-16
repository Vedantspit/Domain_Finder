require("dotenv").config();
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const axios = require("axios");
const { Parser } = require("json2csv");
const cors = require("cors");
const { Readable } = require("stream");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  cors({
    origin: "https://domain-finders.vercel.app", // Your specific frontend
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

// Explicitly handle OPTIONS requests
app.options("*", cors());
// Health check route
app.get("/", (req, res) => {
  res.json({
    status: "Backend is running!",
    time: new Date().toISOString(),
    api_key_loaded: !!process.env.SERPER_API_KEY,
  });
});
const upload = multer({ storage: multer.memoryStorage() });

const API_KEY = process.env.SERPER_API_KEY;
const CONCURRENCY = 8;

// async function getDomain(company) {
//   try {
//     const res = await axios.post(
//       "https://google.serper.dev/search",
//       { q: `${company} official website` },
//       { headers: { "X-API-KEY": API_KEY, "Content-Type": "application/json" } },
//     );
//     const firstResult = res.data.organic?.[0];
//     if (!firstResult || !firstResult.link) return "Not Found";
//     return new URL(firstResult.link).hostname.replace("www.", "");
//   } catch (err) {
//     return "Error";
//   }
// }
async function getDomain(company, retries = 2) {
  try {
    const res = await axios.post(
      "https://google.serper.dev/search",
      { q: `${company} official website` },
      { headers: { "X-API-KEY": API_KEY } },
    );

    const first = res.data.organic?.[0];
    if (!first) return "Not Found";

    return new URL(first.link).hostname.replace("www.", "");
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return getDomain(company, retries - 1);
    }
    return "Error";
  }
}
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const rows = [];
  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csv())
    .on("data", (data) => rows.push(data))
    .on("end", async () => {
      if (rows.length === 0) return res.json({ error: "CSV is empty" });

      const originalHeaders = Object.keys(rows[0]).filter(
        (h) => h.toLowerCase() !== "domain",
      );
      const companyKey =
        originalHeaders.find((h) => h.toLowerCase().includes("company")) ||
        originalHeaders[0];

      // Process batches
      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const batch = rows.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map(async (row) => {
            const domainValue = row[companyKey]
              ? await getDomain(row[companyKey])
              : "Empty";

            // Force 'domain' to be the last key by rebuilding the object
            originalHeaders.forEach((header) => {
              const val = row[header];
              delete row[header];
              row[header] = val;
            });
            row.domain = domainValue;
          }),
        );
      }

      try {
        const finalFields = [...originalHeaders, "domain"];
        const json2csvParser = new Parser({ fields: finalFields, quote: '"' });
        const csvData = json2csvParser.parse(rows);

        res.json({
          data: rows,
          headers: finalFields,
          csvString: csvData,
        });
      } catch (err) {
        res.status(500).json({ error: "CSV Generation Error" });
      }
    });
});

// Port for local testing
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ready on port ${PORT}`));

module.exports = app;
