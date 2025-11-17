# Day 16: Set Up CALM Hub Locally

## Overview
Deploy CALM Hub locally using Docker Compose to create a centralized architecture repository.

## Objective and Rationale
- **Objective:** Run CALM Hub locally and upload your architecture via the API
- **Rationale:** CALM Hub provides centralized storage, discovery, and collaboration for architecture models. Teams can share architectures, search across systems, and track changes. Essential for organization-wide architecture governance.

## Requirements

### 1. Prerequisites

Ensure you have Docker and Docker Compose installed:

```bash
docker --version
docker-compose --version
```

### 2. Get CALM Hub Docker Compose Configuration

The CALM Hub repository includes a ready-to-use Docker Compose setup:

```bash
# If you're in the main architecture-as-code repo
cd calm-hub/deploy

# Or download the compose file separately
curl -O https://raw.githubusercontent.com/finos/architecture-as-code/main/calm-hub/deploy/docker-compose.yml
```

### 3. Start CALM Hub

```bash
docker-compose up -d
```

This starts:
- **MongoDB:** Database backend (port 27017)
- **CALM Hub:** API server (port 8080)

Verify containers are running:
```bash
docker-compose ps
```

Should show both `calm_mongodb` and `calm-hub` containers running.

### 4. Verify CALM Hub is Running

```bash
curl http://localhost:8080/q/health/ready
```

Should return health status indicating the service is ready.

### 5. Explore the API

Get API documentation:

```bash
curl http://localhost:8080/q/swagger-ui
```

Or open in browser: http://localhost:8080/q/swagger-ui

### 6. Upload Your Architecture

Use curl to upload your e-commerce architecture:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d @architectures/ecommerce-platform.json \
  http://localhost:8080/api/architectures
```

The API should return the created architecture with an assigned ID.

Save the response to capture the architecture ID:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d @architectures/ecommerce-platform.json \
  http://localhost:8080/api/architectures \
  | tee hub-response.json | jq .
```

### 7. List All Architectures

```bash
curl http://localhost:8080/api/architectures | jq .
```

You should see your uploaded architecture in the list.

### 8. Retrieve Specific Architecture

Extract the ID from the previous response, then:

```bash
# Replace {id} with the actual ID
curl http://localhost:8080/api/architectures/{id} | jq .
```

### 9. Search Architectures

Search for architectures by name or metadata:

```bash
# Search by name
curl "http://localhost:8080/api/architectures?name=ecommerce" | jq .

# Search by owner (adjust based on your metadata)
curl "http://localhost:8080/api/architectures?owner=your-name" | jq .
```

### 10. Document Your Hub Interaction

**File:** `docs/calm-hub-setup.md`

**Content:**
```markdown
# CALM Hub Setup

## Overview

CALM Hub provides centralized architecture storage and discovery.

## Local Deployment

### Start Hub

\`\`\`bash
cd calm-hub/deploy
docker-compose up -d
\`\`\`

### Verify

\`\`\`bash
curl http://localhost:8080/q/health/ready
\`\`\`

### Stop Hub

\`\`\`bash
docker-compose down
\`\`\`

## API Usage

### Upload Architecture

\`\`\`bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d @architectures/ecommerce-platform.json \
  http://localhost:8080/api/architectures
\`\`\`

### List All Architectures

\`\`\`bash
curl http://localhost:8080/api/architectures | jq .
\`\`\`

### Get Specific Architecture

\`\`\`bash
curl http://localhost:8080/api/architectures/{id} | jq .
\`\`\`

### Search

\`\`\`bash
curl "http://localhost:8080/api/architectures?name=ecommerce" | jq .
\`\`\`

## Architecture IDs

| Architecture | Hub ID | Upload Date |
|--------------|--------|-------------|
| E-Commerce Platform | `{captured-id}` | 2024-12-15 |

## API Endpoints

- **Health:** http://localhost:8080/q/health
- **Swagger UI:** http://localhost:8080/q/swagger-ui
- **Architectures:** http://localhost:8080/api/architectures

## Benefits

1. **Centralized Repository:** Single source of truth for all architectures
2. **Discovery:** Search and browse architectures across teams
3. **Version Control:** Track architecture evolution over time
4. **Collaboration:** Share architectures organization-wide
5. **API Access:** Programmatic access for tools and automation

## Next Steps

- Set up authentication for production deployment
- Configure backup for MongoDB
- Integrate with CI/CD to auto-upload architectures
- Deploy to shared infrastructure for team access
```

### 11. Create Hub Upload Script

**File:** `scripts/upload-to-hub.sh`

**Content:**
```bash
#!/bin/bash
set -e

HUB_URL="${CALM_HUB_URL:-http://localhost:8080}"
ARCHITECTURE_FILE="${1:-architectures/ecommerce-platform.json}"

echo "🚀 Uploading architecture to CALM Hub..."
echo "   Hub URL: $HUB_URL"
echo "   File: $ARCHITECTURE_FILE"

# Verify hub is running
if ! curl -sf "$HUB_URL/q/health/ready" > /dev/null; then
    echo "❌ CALM Hub is not running at $HUB_URL"
    echo "   Start it with: cd calm-hub/deploy && docker-compose up -d"
    exit 1
fi

# Upload architecture
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d @"$ARCHITECTURE_FILE" \
  "$HUB_URL/api/architectures")

# Check for errors
if echo "$RESPONSE" | jq -e .id > /dev/null 2>&1; then
    ID=$(echo "$RESPONSE" | jq -r .id)
    echo "✅ Architecture uploaded successfully!"
    echo "   ID: $ID"
    echo "   View: $HUB_URL/api/architectures/$ID"
else
    echo "❌ Upload failed:"
    echo "$RESPONSE" | jq .
    exit 1
fi
```

Make it executable:
```bash
chmod +x scripts/upload-to-hub.sh
```

Test:
```bash
./scripts/upload-to-hub.sh architectures/ecommerce-platform.json
```

### 12. Take Screenshots

**Document these views:**
1. Docker containers running (`docker-compose ps`)
2. Swagger UI in browser
3. Successful API response showing uploaded architecture
4. List of architectures from API

### 13. Stop CALM Hub

When done testing:

```bash
cd calm-hub/deploy
docker-compose down
```

To stop and remove all data:
```bash
docker-compose down -v
```

### 14. Commit Your Work

```bash
git add docs/calm-hub-setup.md scripts/upload-to-hub.sh docs/screenshots README.md
git commit -m "Day 16: Set up CALM Hub locally and upload architecture via API"
git tag day-16
```

## Deliverables

✅ **Required:**
- `docs/calm-hub-setup.md` - Hub setup documentation
- `scripts/upload-to-hub.sh` - Upload automation script
- Screenshots showing:
  - Hub running in Docker
  - API interaction
  - Architecture uploaded successfully
- Updated `README.md` - Day 16 marked complete

✅ **Validation:**
```bash
# Verify documentation exists
test -f docs/calm-hub-setup.md
test -x scripts/upload-to-hub.sh

# Start hub (if not running)
# cd calm-hub/deploy && docker-compose up -d

# Test health endpoint
curl -sf http://localhost:8080/q/health/ready

# Test upload script
./scripts/upload-to-hub.sh architectures/ecommerce-platform.json

# List architectures
curl http://localhost:8080/api/architectures | jq length

# Stop hub
# cd calm-hub/deploy && docker-compose down

# Check tag
git tag | grep -q "day-16"
```

## Resources
- [CALM Hub Repository](https://github.com/finos/architecture-as-code/tree/main/calm-hub)
- [CALM Hub Documentation](https://github.com/finos/architecture-as-code/blob/main/calm-hub/README.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Tips
- Use environment variable `CALM_HUB_URL` to point to different Hub instances
- For production: enable authentication and HTTPS
- Consider deploying Hub on shared infrastructure for team access
- MongoDB data persists in Docker volumes (use `-v` flag to remove)
- Hub can be deployed on Kubernetes using the k8s manifests in the repo

## Next Steps
Tomorrow (Day 17) you'll use AI to perform advanced architecture refactoring!
