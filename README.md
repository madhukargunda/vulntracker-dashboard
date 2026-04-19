# Vulnerability Dashboard

Spring Boot application for building vulnerability dashboards from Sysdig scan reports stored on the filesystem.

## Stack

- Java 21
- Spring Boot 4
- Thymeleaf
- Vanilla JavaScript
- Jackson
- Apache Commons CSV

## What it does

- Scans the `GENAI` root folder for available version directories
- Loads matching CSV and JSON report pairs for each image
- Shows one dashboard widget per image
- Displays Base OS, total vulnerabilities, and severity counts
- Provides a unique CVE summary for the selected version
- Supports grouped analysis by CVE, package name, or package type

## Expected report structure

```text
GENAI/
├── 2025.42/
│   ├── ai-service-assistant_2025.42.1.csv
│   ├── ai-service-assistant_2025.42.1.json
│   ├── backend-service-ingestor_2025.42.13.csv
│   └── backend-service-ingestor_2025.42.13.json
└── 2026.32/
    └── ...
```

## Run locally

```bash
cd "/Users/madhu/work/Java Projects/vulnerability-report"
export GENAI_ROOT_PATH="$(pwd)/GENAI"
./mvnw spring-boot:run
```

Open:

```text
http://localhost:8080
```

## Build

```bash
cd "/Users/madhu/work/Java Projects/vulnerability-report"
./mvnw clean package -DskipTests
```

## Sample data

Generate sample report files with:

```bash
cd "/Users/madhu/work/Java Projects/vulnerability-report"
chmod +x ./create-sample-data.sh
./create-sample-data.sh
```

Then run the app with `GENAI_ROOT_PATH` pointing at the generated `GENAI` folder.

## Main endpoints

```text
GET /api/versions
GET /api/{version}/images/summary
GET /api/{version}/unique-summary
GET /api/{version}/group?by=cve|package|type&severity=HIGH
```

See `API_DOCUMENTATION.md` for endpoint details and response shapes.

## Current frontend structure

```text
src/main/resources/
├── templates/
│   └── index.html
└── static/
    ├── css/style.css
    └── js/app.js
```

## Notes

- No npm or React is required.
- The UI is rendered with Thymeleaf and plain browser JavaScript.
- Missing JSON or missing `baseOs` is shown as `Unknown`.
- Missing or invalid score is treated as `LOW`.

