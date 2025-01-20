const yaml = require("js-yaml");
const fs = require("fs");
const postmanToOpenApi = require("postman-to-openapi");
const path = require("path");

const extractPath = (url) => {
  const pathname = new URL(url).pathname; // Extracts path after the domain and port
  return pathname;
};

// Function to process and combine JSON files into a single object
const processFolderToJson = (folderPath, combinedJson, tagMap) => {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && path.extname(entry.name) === ".json") {
      const jsonFilePath = path.join(folderPath, entry.name);

      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
        const tag = path.basename(entry.name, ".json"); // Use file name (without extension) as tag

        if (!combinedJson.item) {
          // Initialize combined JSON structure if not already initialized
          combinedJson.item = [];
        }

        // Add tag to each request in the item array
        if (jsonData.item && Array.isArray(jsonData.item)) {
          jsonData.item.forEach((item) => {
            if (item && item.request && item.request.url) {
              let url;
              if (item.request.url?.raw) {
                url = item.request.url.raw;
              } else {
                url = item.request.url;
              }
              const pathKey = extractPath(url);
              tagMap[pathKey] = tag; // Map path to the tag
            }
          });

          combinedJson.item.push(...jsonData.item);
        }
      } catch (err) {
        console.error(`Error reading or parsing file ${jsonFilePath}:`, err);
      }
    }
  }
};

// Recursive function to traverse folders and collect all JSON data
const traverseAndCombineJson = (folderPath, combinedJson, tagMap) => {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(folderPath, entry.name);

    if (entry.isDirectory()) {
      // Recursively process subfolders
      traverseAndCombineJson(entryPath, combinedJson, tagMap);
    } else if (entry.isFile() && path.extname(entry.name) === ".json") {
      // Process individual JSON files
      processFolderToJson(folderPath, combinedJson, tagMap);
    }
  }
};

// Function to create a single YAML file from the combined JSON data
const createYamlFile = async (combinedJson, tagMap, outputFileName) => {
  const tempJsonFilePath = path.join(__dirname, "temp_combined.json");
  const outputYamlFilePath = path.join(__dirname, outputFileName);

  let fileWithInfo = {
    info: {
      name: "Combined API Documentation",
      version: "1.0.0",
    },
    item: combinedJson.item,
  };

  try {
    // Save the combined JSON to a temporary file
    fs.writeFileSync(
      tempJsonFilePath,
      JSON.stringify(fileWithInfo, null, 2),
      "utf8"
    );

    // Convert the combined JSON to OpenAPI YAML
    await postmanToOpenApi(tempJsonFilePath, outputYamlFilePath, {
      defaultTag: "General", // This will only be used as a fallback
    });

    // Modify tags in the YAML using the tagMap
    await modifyTagsInYaml(outputYamlFilePath, tagMap);

    console.log(`Final YAML file created: ${outputYamlFilePath}`);
  } catch (err) {
    console.error("Error creating YAML file:", err);
  } finally {
    // Clean up the temporary combined JSON file
    if (fs.existsSync(tempJsonFilePath)) {
      fs.unlinkSync(tempJsonFilePath);
    }
  }
};

// Function to modify tags in the generated OpenAPI YAML
// Function to modify tags in the generated OpenAPI YAML and remove trailing slashes from paths
const modifyTagsInYaml = async (yamlFilePath, tagMap) => {
  try {
    const openApiDoc = yaml.load(fs.readFileSync(yamlFilePath, "utf8"));
    console.log("testinggg")

    openApiDoc.security = [
      {
        bearerAuth: [],
      },
    ];

    // Create a new paths object with trailing slashes removed
    const updatedPaths = {};
    for (const pathKey in openApiDoc.paths) {
      if (openApiDoc.paths.hasOwnProperty(pathKey)) {
        const normalizedPathKey = pathKey.replace(/\/+$/, ""); // Remove trailing slashes
        updatedPaths[normalizedPathKey] = openApiDoc.paths[pathKey];

        // Update tags based on the tagMap
        const methods = updatedPaths[normalizedPathKey];
        for (const methodKey in methods) {
          if (methods.hasOwnProperty(methodKey)) {
            const operation = methods[methodKey];
            if (tagMap[pathKey]) {
              operation.tags = [tagMap[pathKey]];
            } else {
              operation.tags = ["General"];
            }

            // Check for undefined responses and replace with a default "200" response
            if (operation.responses) {
              for (const responseCode in operation.responses) {
                if (operation.responses.hasOwnProperty(responseCode)) {
                  // If response code is undefined, replace it with 200
                  if (responseCode === "undefined") {
                    operation.responses["200"] = {
                      description: "Successful response",
                    };
                    delete operation.responses[responseCode]; // Remove the 'undefined' key
                  }
                }
              }
            }
          }
        }
      }
    }

    // Replace the old paths with the updated paths
    openApiDoc.paths = updatedPaths;

    // Save the updated YAML file
    fs.writeFileSync(yamlFilePath, yaml.dump(openApiDoc), "utf8");
    console.log(`Tags and paths updated successfully in ${yamlFilePath}`);
  } catch (err) {
    console.error(`Error modifying tags in YAML for ${yamlFilePath}:`, err);
  }
};


// Main function to start processing
const main = async () => {
  const collectionsFolderPath = path.join(__dirname, "_latest_collections");
  const outputDirectory = path.join("openapi");
  const outputYamlFileName = path.join(outputDirectory, "openapi.yaml");
  // const outputYamlFileName = "new.yaml";
  // console.log(outputYamlFileNameNew, "newAdress")

  const combinedJson = {}; // Combined JSON data from all folders
  const tagMap = {}; // Map to store path-to-tag relationships

  // Traverse and combine JSON data from all folders
  traverseAndCombineJson(collectionsFolderPath, combinedJson, tagMap);

  // Create the final YAML file from the combined JSON data
  await createYamlFile(combinedJson, tagMap, outputYamlFileName);
};

main();
