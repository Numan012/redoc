# API Documentation Refactor and Generation

This project automates the process of refining, describing, and generating API documentation using Redocly. It ensures that API documentation is complete, accurate, and easily accessible for developers.

## How To Run Project

You can run project using **`npm run redoc`**

## Project Workflow

### 1. **Refactor the JSON Collection**

- The script `refactor.js` processes the JSON collection file to ensure:
  - Missing endpoints are identified and added.
  - Incorrect or invalid URLs are fixed.
- Output: A refined JSON collection.

### 2. **Generate Description for JSON Collection**

- The script `generatedescription.js` ensures every API endpoint in the JSON collection has a meaningful description.
  - Checks for missing descriptions in the JSON collection.
  - Automatically generates descriptions based on the endpoint structure and parameters.
  - Ensures all APIs are well-documented for developers.
- How it works:

- Iterates through all endpoints in the JSON file.
  - Detects endpoints without a description.
  - Generates descriptions dynamically (e.g., "This endpoint retrieves user details").
  - Updates the JSON file with the new descriptions.

### 3. **Convert Collection to YAML**

- The script `convertcollection.js` converts the refined and described JSON collection into a YAML file, which is compatible with OpenAPI specifications.

How it works:

- Reads the updated JSON collection file.
- Maps JSON fields to the YAML structure required by OpenAPI.
- Outputs a openapi.yaml file that can be processed by Redocly.

### 4. **Use Redocly for OpenAPI Documentation**

a. **Bundle the YAML File**

- Combines and optimizes the YAML file into a single bundled file for better performance.
- `redocly bundle openapi.yaml --output bundled.yaml`

b. **Lint the Bundled File**

- Validates the bundled file to ensure compliance with OpenAPI standards and detects potential errors.
- `redocly lint bundled.yaml`

c. **Split the Bundled File**

- Splits the bundled YAML file into smaller, organized files for modular management and better readability.
- `redocly split bundled.yaml --outDir .`

d. **Preview the Documentation**

- Provides a live preview of the API documentation in a web browser, allowing you to verify its appearance and accuracy.
- `redocly preview-docs bundled.yaml`
