---
title: "Robust and Reliable: Understanding Job Queues in the Rhino Framework"
description: In modern web applications, offloading time-consuming tasks to background jobs is essential for maintaining responsiveness and a smooth user experience. The Rhino framework provides a robust, built-in system for handling these asynchronous operations through ActiveJob and Solid Queue.
authors: Ehsan
tags: [rhino-project, webdev, ruby, rails, opensource, background-jobs, activejob, solid-queue]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

In modern web applications, offloading time-consuming tasks to background jobs is essential for maintaining responsiveness and a smooth user experience. The Rhino framework, a powerful Rails + React solution, provides a robust, built-in system for handling these asynchronous operations. This article delves into Rhino's job queue architecture.

<!-- truncate -->

## The Foundation: ActiveJob and Solid Queue

At its core, Rhino's background processing system is built on two key technologies:

-   **ActiveJob:** The standard Rails framework for declaring and running jobs. It provides a consistent interface, allowing developers to write jobs without worrying about the underlying queueing system.
-   **Solid Queue:** A database-backed queuing backend for Active Job. Unlike other popular solutions that rely on external services like Redis, Solid Queue stores and manages jobs directly in your application's relational database.

This strategic choice simplifies the infrastructure, as it removes a dependency that would otherwise need to be installed, configured, and maintained separately. This single-database approach reduces operational complexity, making it a compelling option for a wide range of applications, especially those seeking a streamlined setup.

## How Solid Queue Works

Solid Queue's design is focused on reliability and performance. It works by using a set of dedicated tables in your database to manage the job lifecycle.

-   Jobs are initially created in the `solid_queue_jobs` table.
-   A "dispatcher" process is responsible for moving jobs from a scheduled state to a "ready" state when they are due to run.
-   "Workers" then pick up these ready jobs from a separate `solid_queue_ready_executions` table, process them, and mark them as finished.

Solid Queue also natively supports a variety of advanced features, including delayed jobs, concurrency controls, and recurring tasks, which are defined in a separate `config/recurring.yml` file. This architecture ensures that jobs are processed efficiently and reliably, even under heavy load, by leveraging the transactional integrity and locking mechanisms of the database.

## Default Rhino Configuration: Convenience First

For local development, Rhino prioritizes convenience and ease of use. By default, the job queue is configured to use the same database as your main application. This means you don't have to manage a separate database connection or schema just for your jobs. The configuration at `config/queue.yaml` defines the default settings. It specifies dispatchers with a `polling_interval` of 1 second and a `batch_size` of 500, and workers that pull from all queues with 3 threads and a process count determined by the `JOB_CONCURRENCY` environment variable, with a `polling_interval` of 0.1 seconds.

The most notable feature of the default setup is the use of the `SOLID_QUEUE_IN_PUMA` environment variable. When this is set, Solid Queue's workers and schedulers run within the same process as your web server (Puma). This in-process execution is ideal for a development environment, as it eliminates the need to run separate worker processes, simplifying the setup and allowing you to start handling background tasks immediately with a single command.

However, this convenience-focused configuration is not meant for production. Running jobs in the same process as your web server is generally not a best practice for production, as a long-running or resource-intensive job could block web requests and impact the application's performance.

## Scaling for Production: Separate Processes and Horizontal Scaling

When deploying to a production environment, it is crucial to separate the job processing from the web server. Rhino's architecture makes this transition straightforward. The `SOLID_QUEUE_IN_PUMA` flag can be turned off, allowing you to run Solid Queue workers in dedicated, isolated processes.

Because Solid Queue uses the database as its central point of communication, it is inherently designed for horizontal scaling. You can run multiple worker processes on the same machine, or even on entirely different machines, all connecting to the same database. This allows you to easily distribute the workload and increase your job processing throughput as your application grows, without any significant changes to your job definitions. If performance becomes a bottleneck, the Solid Queue database itself can be moved to a separate server for further isolation and scaling.

## Deployment Made Easy: Procfiles and Heroku Configuration

Rhino simplifies the deployment process by providing pre-configured files that follow best practices for production environments. The framework's `Procfile` and `heroku.yml` are excellent examples of this.

Instead of relying on the in-process `SOLID_QUEUE_IN_PUMA` setting, these files define separate worker processes specifically for Solid Queue. For platforms like Heroku, this means you can deploy your application with a clear separation of concerns: your web dynos handle HTTP requests, while your worker dynos process background jobs. This setup ensures that your web application remains fast and responsive, regardless of the workload in the job queue.

By providing these sensible defaults and a clear path for scaling, Rhino makes it easy for developers to build robust applications with a professional-grade job queue, from local development all the way to a horizontally scaled production environment.

## Conclusion

The Rhino framework's job queue system demonstrates the framework's commitment to developer experience and production readiness. By leveraging ActiveJob and Solid Queue, Rhino provides a powerful yet simple solution for background processing that scales from development to production. The database-backed approach eliminates external dependencies while maintaining reliability and performance, making it an excellent choice for applications of all sizes.

Whether you're building a simple prototype or a large-scale production application, Rhino's job queue architecture ensures that your background processing needs are met with minimal configuration and maximum reliability.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
