# Contributing to Flisk Person CRUD Example

Thank you for your interest in contributing! This document details repository standards, topic categorization, and verification workflows.

---

## Repository Topics

### Why GitHub Topics Matter

GitHub topics are tags that improve repository discoverability across GitHub. They categorize repositories by purpose, ecosystem, runtime, and technologies used. Accurate topics allow developers searching for specific frameworks, architecture patterns, or tools (like Flisk, React, or MongoDB) to locate and learn from relevant examples.

### Mandatory Topics

To maintain consistency across Flisk example repositories, the following topics are **mandatory**:

1. **`example`** — Designates this repository as an official architectural reference example.
2. **`local-development`** — Identifies the primary use case of the Flisk CLI: running multi-service environments locally without remote cloud dependencies.

### Minimum Requirement

The repository must have **at least 5 GitHub topics** configured.

### Recommended Stack Topics

The topics should accurately reflect the actual technology stack used in the project. For this repository, the recommended topics are:

| Topic | Category | Description |
| :--- | :--- | :--- |
| `example` | Role | **Mandatory.** Reference implementation example. |
| `local-development` | Purpose | **Mandatory.** Local multi-service development tooling. |
| `flisk` | Framework | Orchestration CLI framework powering the stack. |
| `react` | Frontend | React 19 single-page UI (`person-app`). |
| `express` | Backend API | Express 5 REST API service (`person-api`). |
| `mongodb` | Database | Persistent document datastore for Person entities. |
| `redis` | Cache | In-memory cache for API query optimization. |
| `rabbitmq` | Message Broker | AMQP broker for asynchronous person event streaming. |
| `bun` | Runtime | Fast JavaScript runtime and package manager used across services. |

### Identifying Topics for New Examples

When contributing or creating new Flisk examples, follow these guidelines to select topics:

1. **Always include the core topics:** Every example must include `example`, `local-development`, and `flisk`.
2. **Identify the application layers:**
   - **Frontend:** Tag the UI framework/library (e.g., `react`, `vue`, `svelte`).
   - **Backend API:** Tag the web server or microservice framework (e.g., `express`, `hono`, `fastify`).
   - **Datastores:** Tag the databases and caches (e.g., `mongodb`, `postgres`, `redis`).
   - **Messaging / Queues:** Tag any message brokers (e.g., `rabbitmq`, `nats`, `kafka`).
   - **Runtimes:** Tag the JavaScript/TypeScript runtime if specific (e.g., `bun`, `nodejs`).
3. **Naming Conventions:** All topics must be lowercase alphanumeric strings with hyphens where necessary (GitHub topic format).

---

## Topic Verification

### Running the Check Locally

You can verify the repository topics at any time using the topic verification script:

```bash
bun run check:topics
```

#### Verification Options

- **Target Repository:** By default, the script checks `flisk-sh/flisk-person-crud-example`. You can check a fork or sibling repository by setting the `GITHUB_REPOSITORY` environment variable:
  ```bash
  GITHUB_REPOSITORY="your-org/your-repo" bun run check:topics
  ```
- **Authentication:** To avoid unauthenticated GitHub API rate limits (60 requests/hour), provide a GitHub personal access token:
  ```bash
  GITHUB_TOKEN="ghp_your_token" bun run check:topics
  ```

### Automated Verification in CI

A GitHub Actions workflow (`.github/workflows/verify-topics.yml`) automatically executes `bun run check:topics` on:
- Every Pull Request targeting `main`.
- Every push to `main`.
- Manual trigger via `workflow_dispatch`.

The workflow runs with minimum necessary permissions (`contents: read`) and passes the default repository `GITHUB_TOKEN` to authenticate against the GitHub API.

---

## Setting Repository Topics (Permission Notice)

Repository topics are stored as GitHub repository metadata and **cannot be modified through Git files or pull requests**.

- **Required Permissions:** Modifying topics requires **write** or **admin** permissions on the GitHub repository.
- **Applying Topics:** A repository administrator or maintainer must set the topics via the GitHub repository web interface (under the **About** section on the main page) or via the GitHub REST API (`PUT /repos/{owner}/{repo}/topics`).
- **Pull Request Contributions:** As an open-source contributor, your pull request provides the verification script, CI automation, and documentation. Once a maintainer applies the required topics on GitHub, the automated check will pass.
