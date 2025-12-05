---
title: "Getting Started with Rhino: A Step-by-Step Implementation Guide"
description: Learn how to implement a Rhino-based application from scratch using the official project template. This comprehensive guide walks you through cloning the template, installing required modules, creating custom models, and setting up your development environment.
authors: Ehsan
tags: [rhino-project, webdev, ruby, rails, opensource, getting-started, tutorial]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

The Rhino framework provides a powerful Rails + React foundation for building modern web applications. Whether you're starting a new project from a Product Requirements Document (PRD) or exploring the framework's capabilities, this guide will walk you through the essential steps to get your Rhino application up and running.

<!-- truncate -->

## Prerequisites

Before beginning your Rhino implementation, ensure you have the following installed on your system:

- Ruby (version specified in `.ruby-version`)
- Node.js (version specified in `.nvmrc`)
- PostgreSQL or your preferred database
- Rails CLI tools

## Step 1: Clone the Rhino Project Template

Begin by cloning the official Rhino project template repository:

```bash
git clone https://github.com/rhino-project/rhino-project-template
cd rhino-project-template
```

Install the base dependencies:

```bash
bundle install
npm install
```

This sets up the foundation of your application with all the core Rhino components ready to use.

## Step 2: Analyze PRD and Install Required Modules

Review your PRD document to determine which Rhino modules are required for your application. The template includes `rhino_project_core` by default, which provides essential functionality including authentication, authorization, and dynamic API endpoint generation.

### Install Organizations Module (Required)

The organizations module is a required dependency that enables multi-tenancy functionality, including organization management, roles, and user invitations:

```bash
rails rhino_organizations:install
```

This command will:
- Set up the organizations data model
- Configure role-based access control
- Add support for user invitations across organizations
- Modify the database schema to support multi-tenancy

### Install Subscriptions Module (Optional)

If your PRD indicates payment processing or subscription management requirements, install the subscriptions module:

```bash
rails rhino_subscriptions:install
```

This module integrates Stripe functionality for handling recurring payments and subscription lifecycle management.

## Step 3: Create Custom Models

Based on your PRD, create the necessary models and migrations for your application's domain logic. Note that the following models are already provided by the installed modules:

**Pre-existing Models:**
- `users` - User accounts and authentication
- `organizations` - Organization/tenant entities
- `roles` - Role definitions for authorization
- `users_roles` - Join table for user-role associations
- `invites` - Organization invitation management

### Model Creation Guidelines

When creating new models, follow the Rhino resource conventions as detailed in the official documentation:

**Resource Documentation:** [https://www.rhino-project.org/docs/concepts/resources/](https://www.rhino-project.org/docs/concepts/resources/)

Key points to remember:
- Include `Rhino::Resource` in your model class
- Define ownership using `rhino_owner` or `rhino_owner_global`
- Specify readable, creatable, and updatable properties using `rhino_properties_read`, `rhino_properties_create`, and `rhino_properties_update`
- Register your model in `config/initializers/rhino.rb` by adding it to `config.resources`

**Example:**

```ruby
# app/models/blog.rb
class Blog < ApplicationRecord
  include Rhino::Resource
  
  rhino_owner :user
  rhino_references [:user]
  
  rhino_properties_read only: [:id, :title, :content, :created_at]
  rhino_properties_create only: [:title, :content]
  rhino_properties_update only: [:title, :content]
  
  belongs_to :user
  validates :title, presence: true
end
```

## Step 4: Install Notifications Module (Optional)

If your PRD requires notification functionality, install the notifications module after your core business logic and models are in place. The notifications system is typically built on top of your domain models and business logic.

```bash
rails rhino_notifications:install
```

After installation, configure your notification triggers and templates according to your application's requirements. Refer to the Rhino notifications documentation for detailed setup instructions and best practices.

## Step 5: Run Database Migrations

After all modules are installed and custom models are created, apply the database changes:

```bash
rails db:migrate
```

If you have seed data defined, populate your database:

```bash
rails db:seed
```

## Step 6: Verify Installation

Start your development server to verify the installation:

```bash
bin/dev
```

Your application should now be running. You can verify the setup by accessing:

- Application: `http://localhost:3000`
- API endpoints: `http://localhost:3000/api`
- OpenAPI documentation: `http://localhost:3000/api/info/openapi`
- Resource graph: `http://localhost:3000/api/info/graph`

## Troubleshooting Common Issues

If you encounter issues during setup:

1. Ensure all prerequisites are installed and up to date
2. Verify that database credentials are correctly configured in `config/database.yml`
3. Check that all environment variables are set (copy from `env.sample` to `.env`)
4. Review the Rails logs in `log/development.log` for detailed error messages

## Next Steps

After completing this setup:

1. Create custom policies for authorization if needed
2. Configure frontend routes and components based on your PRD
3. Set up testing suites for your custom models and business logic
4. Review security settings before deploying to production

## Conclusion

The Rhino framework provides a streamlined path from project template to production-ready application. By following this guide, you can quickly set up a robust foundation with authentication, authorization, multi-tenancy, and other essential features built-in. The modular architecture allows you to install only what you need, keeping your application lean and maintainable.

With your development environment configured and core modules installed, you're ready to build your custom features on top of Rhino's solid foundation. The framework's conventions and built-in functionality will help you move quickly from concept to implementation, allowing you to focus on your application's unique business logic rather than infrastructure concerns.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._

