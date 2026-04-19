# Vulnerability Dashboard - API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication
No authentication required for current version.

## Response Format
All endpoints return JSON responses.

---

## Endpoints

### 1. Get Available Versions

**Endpoint:**
```
GET /api/versions
```

**Description:**
Returns a list of all available Sysdig report versions in descending order (newest first).

**Response:**
```json
[
  "2026.32",
  "2025.42",
  "2025.41"
]
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl http://localhost:8080/api/versions
```

---

### 2. Get Image Summaries

**Endpoint:**
```
GET /api/{version}/images/summary
```

**Parameters:**
- `version` (path): Version identifier (e.g., "2025.42")

**Description:**
Returns vulnerability summaries for all Docker images in the specified version. Returns one summary per image.

**Response:**
```json
[
  {
    "imageName": "ai-service-assistant",
    "imageVersion": "2025.42.1",
    "baseOs": "debian:11",
    "totalVulnerabilities": 45,
    "criticalCount": 2,
    "highCount": 8,
    "mediumCount": 20,
    "lowCount": 15
  },
  {
    "imageName": "backend-service-ingestor",
    "imageVersion": "2025.42.13",
    "baseOs": "ubuntu:20.04",
    "totalVulnerabilities": 67,
    "criticalCount": 3,
    "highCount": 15,
    "mediumCount": 35,
    "lowCount": 14
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| imageName | string | Docker image name |
| imageVersion | string | Docker image version |
| baseOs | string | Base OS from JSON metadata (e.g., "debian:11") |
| totalVulnerabilities | number | Total count of vulnerabilities |
| criticalCount | number | Count of CRITICAL severity vulnerabilities |
| highCount | number | Count of HIGH severity vulnerabilities |
| mediumCount | number | Count of MEDIUM severity vulnerabilities |
| lowCount | number | Count of LOW severity vulnerabilities |

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Version not found

**Example:**
```bash
curl http://localhost:8080/api/2025.42/images/summary
```

---

### 3. Get Unique Vulnerabilities Summary

**Endpoint:**
```
GET /api/{version}/unique-summary
```

**Parameters:**
- `version` (path): Version identifier (e.g., "2025.42")

**Description:**
Returns counts of unique CVE IDs across all images in the version. Uniqueness is determined by CVE ID.

**Response:**
```json
{
  "uniqueCriticalCves": 5,
  "uniqueHighCves": 12,
  "uniqueMediumCves": 30,
  "uniqueLowCves": 25,
  "totalUniqueCves": 72
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| uniqueCriticalCves | number | Count of unique CRITICAL CVEs |
| uniqueHighCves | number | Count of unique HIGH CVEs |
| uniqueMediumCves | number | Count of unique MEDIUM CVEs |
| uniqueLowCves | number | Count of unique LOW CVEs |
| totalUniqueCves | number | Total count of unique CVEs |

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Version not found

**Example:**
```bash
curl http://localhost:8080/api/2025.42/unique-summary
```

---

### 4. Get Grouped Vulnerabilities

**Endpoint:**
```
GET /api/{version}/group
```

**Parameters:**
- `version` (path): Version identifier (e.g., "2025.42")
- `by` (query, optional): Grouping key - "cve", "package", or "type" (default: "cve")
- `severity` (query, optional): Filter by severity - "CRITICAL", "HIGH", "MEDIUM", or "LOW"

**Description:**
Returns vulnerabilities grouped by the specified field with aggregated information.

**Response:**
```json
[
  {
    "groupKey": "CVE-2024-1234",
    "occurrences": 5,
    "maxScore": 8.5,
    "severity": "HIGH",
    "impactedImages": [
      "ai-service-assistant:2025.42.1",
      "backend-service-ingestor:2025.42.13"
    ]
  },
  {
    "groupKey": "CVE-2024-5678",
    "occurrences": 2,
    "maxScore": 9.2,
    "severity": "CRITICAL",
    "impactedImages": [
      "data-processor:2025.42.7"
    ]
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| groupKey | string | The grouped value (CVE ID, Package Name, or Package Type) |
| occurrences | number | Count of occurrences across all images |
| maxScore | number | Highest CVSS score within the group |
| severity | string | Severity based on maxScore |
| impactedImages | array | List of images affected (format: "name:version") |

**Query Examples:**

**Example 1: Group by CVE ID (default)**
```bash
curl "http://localhost:8080/api/2025.42/group"
curl "http://localhost:8080/api/2025.42/group?by=cve"
```

**Example 2: Group by Package Name**
```bash
curl "http://localhost:8080/api/2025.42/group?by=package"
```

**Example 3: Group by Package Type**
```bash
curl "http://localhost:8080/api/2025.42/group?by=type"
```

**Example 4: Filter by Severity**
```bash
curl "http://localhost:8080/api/2025.42/group?by=cve&severity=CRITICAL"
```

**Example 5: Filter High severity, grouped by package**
```bash
curl "http://localhost:8080/api/2025.42/group?by=package&severity=HIGH"
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Version not found

---

## Data Types & Enums

### Severity Enum
```
CRITICAL  - Score >= 9.0
HIGH      - Score >= 7.0 and < 9.0
MEDIUM    - Score >= 4.0 and < 7.0
LOW       - Score < 4.0 (default for missing/invalid)
```

### Image Reference Format
```
{imageName}:{imageVersion}
Example: "ai-service-assistant:2025.42.1"
```

---

## Error Responses

### 404 - Not Found
```json
{
  "timestamp": "2025-04-19T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Version not found",
  "path": "/api/2099.00/images/summary"
}
```

### 500 - Internal Server Error
```json
{
  "timestamp": "2025-04-19T10:00:00Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Error reading reports",
  "path": "/api/2025.42/images/summary"
}
```

---

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) for:
- All origins (`*`)
- Methods: GET, POST, OPTIONS
- All headers

---

## Rate Limiting

No rate limiting is currently implemented. Future versions may include rate limiting.

---

## Versioning

Current API Version: **1.0** (implicit)

All endpoints are at `/api/{version}/...` where `{version}` is the Sysdig scan report version, not the API version.

---

## Caching Behavior

- Version list is cached on application startup
- File system is scanned once per application restart
- API responses are computed dynamically (no response caching)
- For frequent requests, consider implementing client-side caching

---

## CSV & JSON Parsing Details

### CSV Parsing Rules
1. All lines before the header row are ignored
2. Header row is detected when it contains both "PackageName" and "CVE ID"
3. Data rows must have a valid CVE ID (non-empty)
4. Missing or invalid scores default to 0.0 (LOW severity)
5. Quoted values are unquoted during parsing

### JSON Parsing Rules
1. Dynamically finds the first child object under `result`
2. Extracts `metadata.baseOs` from that child
3. Returns "Unknown" if baseOs is missing, null, or JSON structure is invalid

---

## Sample Integration Code

### JavaScript (Fetch)
```javascript
// Get versions
const versions = await fetch('/api/versions').then(r => r.json());

// Get image summaries
const summaries = await fetch(`/api/${versions[0]}/images/summary`).then(r => r.json());

// Get unique summary
const unique = await fetch(`/api/${versions[0]}/unique-summary`).then(r => r.json());

// Get grouped vulnerabilities
const grouped = await fetch(`/api/${versions[0]}/group?by=cve&severity=CRITICAL`).then(r => r.json());
```

### Python (Requests)
```python
import requests

base_url = 'http://localhost:8080/api'

# Get versions
versions = requests.get(f'{base_url}/versions').json()

# Get image summaries
summaries = requests.get(f'{base_url}/{versions[0]}/images/summary').json()

# Get unique summary
unique = requests.get(f'{base_url}/{versions[0]}/unique-summary').json()

# Get grouped vulnerabilities
grouped = requests.get(f'{base_url}/{versions[0]}/group', params={'by': 'cve', 'severity': 'CRITICAL'}).json()
```

### CURL
```bash
# Get versions
curl http://localhost:8080/api/versions

# Get image summaries
curl http://localhost:8080/api/2025.42/images/summary

# Get unique summary
curl http://localhost:8080/api/2025.42/unique-summary

# Get grouped vulnerabilities
curl "http://localhost:8080/api/2025.42/group?by=cve&severity=CRITICAL"
```

---

## Troubleshooting API Issues

### Empty Results
- Verify version exists: `GET /api/versions`
- Check file paths in GENAI folder
- Ensure CSV/JSON files follow naming convention

### BaseOs Shows "Unknown"
- Verify JSON file structure has `result.<child>.metadata.baseOs`
- Check JSON file is valid (use JSON validator)

### Wrong Severity Counts
- Verify scores in CSV files
- Check severity classification rules above

---

## Future API Enhancements

- Request body filtering for POST endpoints
- Response pagination for large datasets
- Advanced search/filter API
- Export endpoints (CSV, PDF, JSON)
- Webhook support
- API versioning (v1, v2, etc.)

---

**Last Updated**: April 19, 2026  
**API Version**: 1.0

