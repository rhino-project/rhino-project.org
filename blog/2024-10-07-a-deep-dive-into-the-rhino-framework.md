---
title: "A Deep Dive into the Rhino Framework: Part 1"
description: Welcome to our engineering blog series on Rhino, a framework that truly embodies the principles of Model-Driven Development (MDD). As a vibe-coding friendly framework, Rhino is perfect for developers who want to focus on their application's core logic and bring ideas to life with minimal friction.
authors: Ehsan
tags: [rhino-project, webdev, ruby, rails, opensource, mdd, model-driven-development]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Welcome to our engineering blog series on Rhino, a framework that truly embodies the principles of Model-Driven Development (MDD). As a vibe-coding friendly framework, Rhino is perfect for developers who want to focus on their application's core logic and bring ideas to life with minimal friction. In this series, we'll explore how its architecture accelerates development by providing a robust set of tools and conventions out of the box. This first post will provide a high-level overview of the framework's structure, walk through a practical example, and then dive into the core mechanisms that make it such an intuitive platform.

<!-- truncate -->

## The Rhino Mono-repo: A Unified Structure

At its core, the Rhino framework is organized within a single mono-repo called rhino-project. This approach houses both the backend Ruby gems and frontend JavaScript packages in one place, fostering a cohesive development experience. This structure allows for streamlined dependency management and ensures that all components of the stack are designed to work together seamlessly.

### Backend Gems

The backend functionality is broken down into a collection of modular Ruby gems located in the gems/ directory. This design allows developers to selectively include the features they need. The cornerstone is the `rhino_project_core` gem, which delivers foundational capabilities like authentication, authorization, and a dynamic system for generating API endpoints. Building upon this core, specialized gems such as `rhino_project_notifications`, `rhino_project_organizations`, and `rhino_project_subscriptions` offer targeted functionalities for notifications, multi-tenancy, and payment processing, creating a layered and extensible architecture.

### Frontend Packages

The frontend consists of a suite of JavaScript/TypeScript packages located in the packages/directory. These packages offer a variety of tools and reusable components for constructing the user interface. Notable packages include @rhino-project/core, which contains essential UI components and hooks that integrate directly with the backend API, and @rhino-project/config, which provides shareable configurations for development tools like ESLint and Prettier. To simplify project setup, the create-rhino-app package provides a command-line tool to quickly scaffold a new application.

## A Practical Example: The Tutorial Application

To understand how these pieces fit together, let's look at the official Rhino tutorial, which guides you through building a simple blog application. This example leverages the rhino-project-template, a pre-configured project that includes CI/CD setup and demonstrates the core functionalities of the framework without any additional modules like organizations.

### The Data Model

The blog application is built around three primary models: Category, Blog, and `BlogPost`. Their relationships are straightforward: a Category can have many blogs, a Blog belongs to a category and a user, and a `BlogPost` belongs to a blog.

Here is how these models are defined in the application:

```ruby
# Category Model:
# File Path: app/models/category.rb

class Category < ApplicationRecord
  has_many :blogs, dependent: :destroy

  # Rhino specific code
  rhino_owner_global

  validates :name, presence: true
end

# Blog Model:
# File Path: app/models/blog.rb
class Blog < ApplicationRecord
  belongs_to :user
  belongs_to :category
  has_many :blog_posts, dependent: :destroy

  # Rhino specific code
  rhino_owner_base
  rhino_references [:user, :category]

  validates :title, presence: true
end

# BlogPost Model:
# File Path: app/models/blog_post.rb
class BlogPost < ApplicationRecord
  belongs_to :blog

  # Rhino specific code
  rhino_owner :blog
  rhino_references [:blog]

  validates :title, presence: true
  validates :body, presence: true
end
```

Now that we have our data models, the next question is: how are they exposed through an API? This is where Rhino's controller system comes into play.

## Exposing the API: A Deep Dive into Controllers and Policies

Rhino provides a flexible and powerful system of controllers and policies that work in tandem to secure and expose your API endpoints with minimal boilerplate.

### The Controller Hierarchy

The controllers in `rhino_project_core` follow a clear inheritance hierarchy, which allows for shared functionality while enabling specialization where needed.

```
ActionController::API (from Rails)
    └── Rhino::BaseController
        ├── Rhino::AccountController
        ├── Rhino::ActiveModelExtensionController
        ├── Rhino::CrudController
        │   └── Rhino::ActiveRecordDiscardController
        ├── Rhino::SimpleController
        └── Rhino::SimpleStreamController
```

- **`Rhino::BaseController`:** This is the foundation for all other controllers in the framework. It integrates essential modules for authentication, authorization (via Pundit), and error handling. It's an abstract controller and doesn't handle routes directly.
- **`Rhino::CrudController`:** This is the default controller for database-backed resources. For the models we created in the tutorial (`Category`, `Blog`, `BlogPost`), this controller provides the standard Create, Read, Update, and Destroy (CRUD) actions out of the box.
- **`Other Controllers`:** The hierarchy also includes specialized controllers like `Rhino::ActiveRecordDiscardController` for soft-deletes, `Rhino::AccountController` for managing user-specific data, and others for handling virtual models and simple resources.

### Authorization with Policies

Authorization is seamlessly integrated into the `BaseController` via the Pundit gem, meaning every controller action is automatically authorized. The framework provides a default policy, `Rhino::CrudPolicy`, which is used by the `CrudController` to enforce basic authorization rules. For instance, it might allow any authenticated user to create a resource but permit only the resource owner to update or destroy it.

The true power of this system is the ability to override these defaults. By creating a `BlogPolicy` in your application, the `CrudController` will automatically use your custom logic instead of the default policy when handling actions on Blog resources.

Here is an example from the `CrudController` showing how Pundit is used:

```ruby
# In Rhino::CrudController
def update
  @record = policy_scope(model_class).find(params[:id])
  authorize @record

  # ... rest of the update logic
end
```

In this snippet, `authorize @record` triggers Pundit to find a policy corresponding to the record's class. If a `BlogPolicy` exists, its `update?` method will be called to determine if the action is permitted.

## Dynamic Resource Routing: The Heart of Vibe-Coding

One of Rhino's most significant features, and what makes it so conducive to vibe-coding, is its ability to automatically generate API endpoints directly from your models. This Model-Driven Development approach minimizes configuration and lets you focus on your application's logic. Here's a step-by-step breakdown of how it works.

### 1. The Central List: Rhino.resources

At the heart of the system is a simple array of strings, `Rhino.resources`, which holds the names of all the models to be exposed as API endpoints. This is defined in `rhino-project/gems/rhino_project_core/lib/rhino_project_core.rb`:

```ruby
# module Rhino
# ...
mattr_accessor :resources, default: if Rails.env.production?
                                      ['ActiveStorage::Attachment']
                                    else
                                      ['ActiveStorage::Attachment', 'Rhino::OpenApiInfo', 'Rhino::InfoGraph']
                                      end
 # ...
end
```

### 2. Registration: Adding Your Resource

You add your own resources to this list using the `Rhino.setup` block, typically located in an initializer file. In the template project, this is done in `rhino-project-template/config/initializers/rhino.rb`:

```ruby
# frozen_string_literal: true

Rhino.setup do |config|
  # ...
  # The list of resources exposed in the API
  config.resources += [ "User", "Account" ]
end
```

### 3. Gaining Capabilities: include `Rhino::Resource`

For a model to be a valid resource, it must include the `Rhino::Resource` module. This module, found in `rhino-project/gems/rhino_project_core/lib/rhino/resource.rb`, equips the model with the necessary methods to communicate with the routing system.

```ruby
# app/models/blog.rb
class Blog < ApplicationRecord
  include Rhino::Resource

# ...
end
```

By including this module, the Blog model now has methods like `route_key` and `controller_name` that the router will use.

### 4. The Router: Generating the Routes

The final step occurs in the routes file, `rhino-project/gems/rhino_project_core/config/routes.rb`. Here, the code iterates over the resource classes and generates the routes.

```ruby
# frozen_string_literal: true

Rails.application.routes.draw do
  scope Rhino.namespace do
    # ...
    Rhino.resource_classes.each do |m|
      # ...
      resources m.route_key, path: m.route_path, controller: m.controller_name, only: m.routes, rhino_resource: m.name, format: false   
      # ...
    end
  end
  # ...
end
```

The key is the call to `Rhino.resource_classes`. This method converts the array of strings in `Rhino.resources` into an array of class objects, allowing the router to call the methods provided by the `Rhino::Resource` module to build the routes dynamically.

## Conclusion

The Rhino framework provides a well-architected foundation that champions a Model-Driven Development approach. By combining a mono-repo structure with a powerful system of controllers, policies, and dynamic routing, it facilitates a rapid, 'vibe-coding' workflow that streamlines development. This allows you to build secure and scalable APIs with remarkable efficiency by focusing on what matters: your data model. In our next post, we will build upon this foundation and explore some of the more advanced features Rhino has to offer. Stay tuned!

---

*This blog post is based on content from [A Deep Dive into the Rhino Framework](https://dev.to/codalio/a-deep-dive-into-the-rhino-framework-5adf) by Yousef on DEV Community.*
