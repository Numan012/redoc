const fs = require("fs");
const path = require("path");

const latestCollectionFolder = "_latest_collections";
const processedApiIndices = []; // Array to store API indices

// Ensure a directory exists
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Process and update JSON files
const processFile = (filePath, fileName) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file ${fileName}:`, err);
      return;
    }

    try {
      let jsonData = JSON.parse(data);

      const processEndpoints = (json, parentIndex = "") => {
        json?.item?.forEach((item, index) => {
          const currentIndex = parentIndex ? `${parentIndex}.${index}` : `${index}`;

          if (item.request && item.request.url) {
            let url = item.request.url.raw;
            processedApiIndices.push({ file: fileName, index: currentIndex }); // Store API index

            if (item.request.auth?.bearer?.[0]?.value) {
              let authValue = item?.request?.auth?.bearer[0]?.value || "";
              authValue = authValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.auth.bearer[0].value = authValue;
            }
            if (item.request.header[0]) {
              let headerValue = item?.request?.header[0]?.value || "";
              headerValue = headerValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.header[0].value = headerValue;
            }
            if (item.request.url.query) {
              item?.request?.url.query.forEach((query) => {
                let queryValue = query.value || "";
                queryValue = queryValue.replace(
                  /{{(.*?)}}/g,
                  (_, placeholder) => placeholder
                );
                query.value = queryValue;
              });
            }

            if (item.request?.body?.raw) {
              let bodyValue = item?.request?.body?.raw;
              bodyValue = bodyValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.body.raw = bodyValue;
            }

            url = url.replace(/{{endpoint}}/g, "http://localhost:3000");
            url = url.replace(/{{(.*?)}}/g, (_, placeholder) => placeholder);
            url = url.replace(/\/$/, "");

            item.request.url.raw = url;
            item.request.url.host = [url.split("/")[2]];
          }

          if (item.item) {
            processEndpoints(item, currentIndex);
          }
        });
      };

      processEndpoints(jsonData);

      const updatedJson = JSON.stringify(jsonData, null, 2);

      fs.writeFile(filePath, updatedJson, "utf8", (err) => {
        if (err) {
          console.error(`Error writing file ${filePath}:`, err);
        } else {
          console.log(`File successfully updated: ${filePath}`);
        }
      });
    } catch (parseError) {
      console.error(`Error parsing JSON in file ${fileName}:`, parseError);
    }
  });
};

// Traverse and process JSON files
const traverseFolders = (folderPath) => {
  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error(`Error reading folder ${folderPath}:`, err);
      return;
    }

    entries.forEach((entry) => {
      const entryPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        traverseFolders(entryPath);
      } else if (entry.isFile() && path.extname(entry.name) === ".json") {
        processFile(entryPath, entry.name);
      }
    });
  });
};

// Ensure the directory exists
ensureDirectoryExists(latestCollectionFolder);

// Process the latest collection
traverseFolders(latestCollectionFolder);

// Log the indices of processed APIs
process.on("exit", () => {
  console.log("\nProcessed API Indices:");
  console.log(processedApiIndices);
});
