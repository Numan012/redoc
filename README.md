Running the Code
Step 1: Refactor JSON Files to make sure its compatible for converting to YAML format
This step processes and updates JSON files (e.g., modifying URLs, headers, and placeholders).

File: refactorJson.js
How to Run:

node refactorJson.js
Input: Place your JSON files in the input/json/ directory.
Output: Processed JSON files will be saved in the output/json/ directory.
Step 2: Generate Descriptions with OpenAI
This step generates descriptions for your endpoints using OpenAI's API.

File: generateDescription.js
How to Run:

node generateDescription.js
Input: Processed JSON files from Step 1 (located in output/json/).
Output: Updated JSON files with descriptions will be saved in output/descriptions/.
Step 3: Convert Collections to YAML
This step combines Postman collections, normalizes paths, and converts them to OpenAPI YAML format.

File: collectionConverts.js
How to Run:

node collectionConverts.js
Input: JSON files with descriptions from Step 2 (located in output/descriptions/).
Output: OpenAPI YAML file saved in output/openapi/ directory.
