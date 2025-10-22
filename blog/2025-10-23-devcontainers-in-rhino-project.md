---
title: DevContainers in the Rhino Project
description: DevContainers provide a standardized way to define and manage development environments using Docker containers. In the Rhino project, they eliminate the "it works on my machine" problem by ensuring all developers use identical toolchains and configurations.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        devcontainers,
        docker,
        vscode,
        development-environment,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

DevContainers (Development Containers) are a standardized way to define and manage development environments using Docker containers. They encapsulate an entire development toolchain into a single, self-contained unit, providing a consistent, reproducible, and isolated environment that works seamlessly across different machines and operating systems.

In the context of the Rhino project, devcontainers are crucial for eliminating the classic "it works on my machine" problem. By ensuring that all developers, whether working on macOS, Windows, or Linux use an identical set of tools, dependencies, and configurations, we streamline collaboration and reduce environment-related bugs.

<!-- truncate -->

## Introduction to DevContainers

These containers are particularly powerful in two key scenarios:

-   **Cloud-Based Development:** In environments like GitHub Codespaces, the devcontainer can be automatically provisioned, providing a ready-to-code workspace in the cloud within minutes.
-   **Local Development:** Using VS Code with the "Remote - Containers" extension, developers can run the exact same environment on their local machine.

The environment defined in our devcontainer includes everything needed to build, run, and test the application, from the base operating system and language runtimes to specific versions of libraries, linters, and debugging tools.

## Requirements and Setup

### Core Requirement: Docker

The primary requirement for using devcontainers is **Docker**, which serves as the underlying containerization engine. The Rhino project's devcontainer configuration is designed to work with:

-   **Docker Desktop** on macOS and Windows.
-   **Docker Engine** on Linux.

Before you begin, ensure you have a compatible version of Docker installed and running.

### How It Works

The setup process is designed to be as simple as possible. When you open the Rhino project in VS Code, the "Remote - Containers" extension will automatically detect the `.devcontainer` directory and prompt you to "Reopen in Container."

Once you accept, VS Code performs the following steps:

1. It reads the configuration files within the `.devcontainer` directory.
2. It builds or pulls the specified Docker image, which contains all our project's dependencies.
3. It starts the container(s), including any supporting services like our database.
4. It mounts the project repository into the container using a volume. Specifically, it maps your local project directory to the `/workspaces` directory inside the container. We use the cached flag for this volume mount to ensure better I/O performance, allowing for real-time file changes between your host machine and the container environment.

This process means you can edit code using your familiar VS Code interface on your host machine, while all commands (compiling, running tests, debugging) are executed inside the fully configured container. This gives you the best of both worlds: a consistent, managed environment without sacrificing the performance and comfort of your local editor.

## The .devcontainer Configuration Explained

The Rhino project's devcontainer environment is defined by three key files located in the `.devcontainer/` directory. Each file has a distinct responsibility, creating a clean separation of concerns.

### 1. devcontainer.json

This is the primary configuration file that tells VS Code how to build, start, and configure the development environment. It orchestrates the entire setup and customizes the editor experience. Key settings include:

-   **Container Definition:** It points to the Dockerfile and compose.yaml to specify how the container environment should be built and run.
-   **VS Code Settings:** It defines editor-specific settings that will apply only when working inside the container, such as theme preferences, formatter settings, and language-specific configurations.
-   **Extensions:** It lists the VS Code extensions that should be automatically installed inside the container. This ensures every developer has the same set of tools for linting, debugging, and language support.
-   **Lifecycle Scripts:** It can define commands to run at different stages of the container's lifecycle, such as postCreateCommand to run setup scripts after the container is created or postAttachCommand to run commands every time you connect.

### 2. Dockerfile

This file provides the blueprint for building the main development container image. It is a step-by-step recipe that defines the environment from the ground up. A typical Dockerfile in our project will:

-   **Specify a Base Image:** It starts from a base operating system image (e.g., Debian, Ubuntu) that may already include a specific language runtime (like Python or Node.js).
-   **Install System Dependencies:** It uses package managers like apt-get to install necessary system-level tools and libraries (e.g., git, curl, build essentials).
-   **Install Language-Specific Dependencies:** It runs commands to install project dependencies using tools like pip, npm, or go get.
-   **Configure the Environment:** It sets up user accounts, working directories, and environment variables needed for the application to run correctly.

### 3. compose.yaml (or docker-compose.yml)

This file is used to define and run a multi-container application. For the Rhino project, this is essential for managing not just our application container but also its supporting services, like a database. Our compose.yaml configures:

-   **Application Service:** This service is built using the Dockerfile mentioned above. It defines how the main application container should run.
-   **Database Service:** It defines a separate container for our PostgreSQL database. This configuration includes:
    -   **Image:** Specifies the official PostgreSQL image to use.
    -   **Persistent Volume:** Sets up a named volume to ensure that database data persists even if the container is stopped or rebuilt.
    -   **Environment Variables:** Configures the default database name, user, and password.
-   **Initialization Scripts:** It mounts SQL scripts, such as create-db-user.sql, into the database container's initialization directory. This script is automatically executed when the database container starts for the first time, setting up the necessary users and permissions for our application.

## Conclusion

DevContainers provide a powerful and modern solution for maintaining consistent, manageable, and portable development environments in the Rhino project. By containerizing the entire development stack, we achieve several key benefits:

-   **Consistency:** Every team member works with an identical setup, drastically reducing environment-related issues.
-   **Rapid Onboarding:** New contributors can get a fully configured development environment running with a single click, significantly reducing setup and onboarding time.
-   **Flexibility:** The configuration is designed to be portable, supporting both local development on any operating system and cloud-based environments like GitHub Codespaces.

The clear separation of concerns between the development environment (Docker), editor configuration (VS Code), and application services (Compose) makes the project more maintainable and easier to understand. Adopting this approach significantly improves the overall development experience and helps maintain high quality and consistency across the entire development lifecycle.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
