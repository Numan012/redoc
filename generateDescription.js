const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

let message =
  "Read all the provided data and provide a detailed description of each data in this endpoint. The response will be saved as the description in the Postman collection. Write the description in plain English for developers.";

const OPENAI_API_KEY = process.env.apiKey;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const urlTracker = new Map(); // Track duplicate URLs
const copiedData = [];

// Function to generate documentation using OpenAI
async function generateDocumentation(endpointDetails, message) {
  console.log("Generating documentation...");
  const response = await axios.post(
    OPENAI_URL,
    {
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a documentation generator." },
        { role: "user", content: `${message} ${JSON.stringify(endpointDetails, null, 2)}` },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}

// Process collection files and update descriptions
async function processCollection(latestCollection, previousCollection, fileName) {
  try {
    const finalDocuments = [];
    const previousItems = previousCollection.item;

    console.log("Processing collection:", latestCollection.item.length);

    for (let i = 0; i < latestCollection.item.length; i++) {
      const latestUrl = await latestCollection.item[i].request?.url?.raw;
      console.log("theirrr")

      if (latestUrl) {
        // Handle duplicate URLs
        if (urlTracker.has(latestUrl)) {
          const existingEntry = urlTracker.get(latestUrl);
          existingEntry.files.push(fileName);
          existingEntry.params.push(latestCollection.item[i]?.name);
          urlTracker.set(latestUrl, existingEntry);
        } else {
          urlTracker.set(latestUrl, {
            files: [fileName],
            params: [latestCollection.item[i]?.name],
          });
        }
      }

      const previousItem = previousCollection?.item ? previousCollection?.item[i] : [];


      // Function to compare specific fields
      const isDifferent = (item1, item2) => {
        if (!item1 || !item2) return true;
        return (
          item1.name !== item2.name ||
          item1.request?.description !== item2.request?.description ||
          JSON.stringify(item1.request) !== JSON.stringify(item2.request) ||
          JSON.stringify(item1.response) !== JSON.stringify(item2.response)
        );
      };

      const isNewItem = !previousItem;
      const hasChanges = previousItem && isDifferent(latestCollection.item[i], previousItem);

      if (isNewItem || hasChanges) {
        console.log(isNewItem ? `New item: ${latestCollection.item[i].name}` : `Updated item: ${latestCollection.item[i].name}`);

        const endpointDetails = {
          name: latestCollection.item[i].name,
          request: {
            method: latestCollection.item[i].request.method,
            url: latestCollection.item[i].request.url.raw,
            headers: latestCollection.item[i].request.header,
            body: latestCollection.item[i].request.body?.raw,
            query: latestCollection.item[i].request.url.query,
            auth: latestCollection.item[i].request.auth,
          },
        };

        // Generate description
        let description = "";
        description = await generateDocumentation(endpointDetails, message);


        latestCollection.item[i].request.description = description;

        finalDocuments.push(latestCollection.item[i]);
      } else {
        console.log(`No changes detected: ${latestCollection.item[i].name}`);
        finalDocuments.push(latestCollection.item[i]);
      }
    }

    const result = { info: latestCollection.info, item: finalDocuments };
    fs.writeFileSync(fileName, JSON.stringify(result, null, 2));
    console.log(`Saved updated collection to ${fileName}`);
  } catch (error) {
    console.error(`Error processing collection ${fileName}:`, error);
  }
}



// Traverse directories and process JSON files
async function traverseDirectories(latestFolderPath, previousFolderPath) {
  try {
    const entries = fs.readdirSync(latestFolderPath, { withFileTypes: true });

    for (const entry of entries) {
      const latestFullPath = path.join(latestFolderPath, entry.name);
      const previousFullPath = path.join(previousFolderPath, entry.name);

      if (entry.isDirectory()) {
        await traverseDirectories(latestFullPath, previousFullPath);
      } else if (entry.isFile() && path.extname(entry.name) === ".json") {
        console.log(`Processing file: ${latestFullPath}`);

        if (fs.statSync(latestFullPath).size === 0) {
          console.warn(`Skipping empty file: ${latestFullPath}`);
          continue;
        }

        let latestJson, previousJson;

        try {
          latestJson = JSON.parse(fs.readFileSync(latestFullPath, "utf8"));
        } catch (error) {
          console.error(`Error parsing latest JSON file: ${latestFullPath}`, error.message);
          latestJson = null;
        }

        if (fs.existsSync(previousFullPath)) {
          try {
            previousJson = JSON.parse(fs.readFileSync(previousFullPath, "utf8"));
          } catch (error) {
            console.error(`Error parsing previous JSON file: ${previousFullPath}`, error.message);
            previousJson = null;
          }
        } else {
          previousJson = {};
        }

        if (latestJson) {
          await processCollection(latestJson, previousJson, latestFullPath);
        }
      }
    }
  } catch (error) {
    console.error("Error traversing directories:", error.message);
  }
}


// Save duplicate URLs to a file
function saveDuplicateUrls() {
  const duplicates = [];
  urlTracker.forEach((value, url) => {
    if (value.files.length > 1) {
      duplicates.push({ url, files: value.files, params: value.params });
    }
  });

  if (duplicates.length > 0) {
    fs.writeFileSync("duplication.txt", JSON.stringify(duplicates, null, 2));
    console.log("Saved duplicates to duplication.txt");
  } else {
    console.log("No duplicates found.");
  }
}

// Replace `_previous_collections` with `_latest_collections`
function replacePreviousCollections(latestFolderPath, previousFolderPath) {
  if (fs.existsSync(previousFolderPath)) {
    fs.rmSync(previousFolderPath, { recursive: true, force: true });
  }

  const copyRecursive = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        copyRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyRecursive(latestFolderPath, previousFolderPath);
}

// Main
(async () => {
  const latestFolderPath = "./_latest_collections";
  const previousFolderPath = "./_previous_collections";

  console.log("Starting...");
  await traverseDirectories(latestFolderPath, previousFolderPath);
  saveDuplicateUrls();
  replacePreviousCollections(latestFolderPath, previousFolderPath);
  console.log("Completed.");
})();
