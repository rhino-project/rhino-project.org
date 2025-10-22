---
title: A Technical Look at the Rhino Project's CI/CD Setup
description: The Rhino project utilizes a CI/CD pipeline built on Docker and Heroku, creating distinct, optimized environments for development and production. This article provides a technical overview of this configuration and how it ensures code quality and smooth deployments.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        cicd,
        docker,
        heroku,
        github-actions,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

The Rhino project, a Rails and React framework, utilizes a CI/CD pipeline built on Docker and Heroku. This setup creates distinct, optimized environments for development and production, governed by key configuration files. This article provides a technical overview of this configuration.

<!-- truncate -->

## Continuous Integration with GitHub Actions

Before deployment, every change is validated through an automated Continuous Integration (CI) process using GitHub Actions. This ensures code quality and prevents regressions.

### ci.yaml: Core Validation Workflow

This workflow triggers on every push and pull request, running three parallel jobs to cover all aspects of the application:

-   **Server Job:** Lints the Ruby code with RuboCop, performs security analysis using Brakeman, and executes the full Rails test suite against a live PostgreSQL service.
-   **Client Job:** Validates the frontend by running ESLint and Prettier for code quality, followed by the Vitest unit and component test suite. It also verifies that the production build completes successfully.
-   **Cypress Job:** Executes end-to-end (E2E) tests. This job spins up the entire application stack, including the server and database, and runs Cypress tests to simulate real user interactions.

### nightly.yaml: Build Caching

A separate workflow runs daily to build the production and development Docker images without pushing them to a registry. Its purpose is to populate the GitHub Actions cache with Docker layers, which significantly speeds up subsequent builds in the main CI workflow.

## Environment-Specific Containerization

Rhino's container strategy uses two separate Dockerfiles to maintain a separation between development and production environments, optimizing each for its specific needs.

### Dockerfile.development

This file is tailored for developer productivity.

-   **Build:** A single-stage build for faster iteration.
-   **Tools:** Includes development-specific tools like git, imagemagick, and graphviz.
-   **Live Reloading:** Mounts local source code as a volume, enabling instant code updates without rebuilding.
-   **Assets:** Uses the Vite server for runtime asset compilation and hot-reloading.

### Dockerfile (Production)

This file is engineered to create a lean, secure, and performant image for deployment.

-   **Build:** A multi-stage build process copies only essential application code and production dependencies, significantly reducing the final image size.
-   **Dependencies:** Installs only production gems and packages.
-   **Assets:** Pre-compiles and bundles all frontend assets for optimal performance.
-   **Security:** Runs the application as a non-root user and uses a minimal slim base image.

## Local Development with docker-compose.yaml

The `docker-compose.yaml` file orchestrates the local development environment, defining and linking the necessary services. It uses `Dockerfile.development` to build the application images. The three core services are:

1. **backend**: The main Rails application, with the local source code mounted for live reloading.
2. **vite**: The frontend service running the Vite development server for hot module replacement.
3. **db**: A PostgreSQL database service that uses a named volume to ensure data persistence across sessions.

A single `docker compose up` command launches the entire stack.

## Production Deployment with heroku.yml

The `heroku.yml` manifest automates the build, release, and runtime processes on Heroku.

-   **Build:** It instructs Heroku to use the production Dockerfile and sets the `RAILS_ENV` to production, enabling all performance optimizations.
-   **Release:** It defines a release phase command (`bundle exec rails db:migrate`) that runs database migrations automatically after a successful build but before the new version is live.
-   **Runtime:** It defines the web and worker processes that Heroku runs.

## Environment Variable Management

Configuration is handled differently across environments for security and flexibility.

-   **Local:** `docker-compose.yaml` manages environment variables, loading secrets from a git-ignored `.env` file. It supports default values for variables not present in the `.env` file.
-   **Production:** `heroku.yml` relies on Heroku "Config Vars," which are set outside the repository via the Heroku dashboard or CLI, preventing credentials from being exposed in the codebase.

## The Full Workflow

1. **Local:** A developer runs `docker compose up` to spin up a hot-reloading development environment based on `Dockerfile.development`.
2. **CI:** A git push to a pull request triggers the GitHub Actions workflow, running backend, frontend, and E2E tests.
3. **Deployment:** Merging to the main branch triggers a deployment to Heroku. The pipeline defined in `heroku.yml` builds a minimal, secure image using the production Dockerfile, runs database migrations, and deploys the application.

This dual-environment strategy provides a CI/CD pipeline that is both efficient for developers and robust for production.

## Conclusion

The Rhino project's CI/CD setup demonstrates a well-architected approach to modern development workflows. By leveraging Docker for containerization, GitHub Actions for continuous integration, and Heroku for deployment, the framework provides developers with a seamless experience from local development to production deployment. The separation of development and production environments ensures optimal performance and security while maintaining developer productivity.

This technical foundation enables teams to focus on building great applications rather than managing complex deployment pipelines, embodying Rhino's commitment to developer experience and production readiness.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
