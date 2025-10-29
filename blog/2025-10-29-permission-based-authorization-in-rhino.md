---
title: "Permission-Based Authorization in Rhino"
description: Rhino provides core authorization and authentication out of the box, but for fine-grained permission control, you may need to implement a custom permission system. This guide shows how to extend Rhino's policy system with permission-based authorization using custom policies and permission tables.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        authorization,
        permissions,
        pundit,
        security,
        policies,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Rhino provides robust core authorization and authentication through its policy system. While the default `CrudPolicy` and role-based policies (`AdminPolicy`, `EditorPolicy`, `ViewerPolicy`) handle most scenarios, some applications require fine-grained, permission-based authorization where individual actions are explicitly granted or denied based on a permissions table.

This guide will explore how to extend Rhino's authorization system with custom permissions while leveraging the existing policy architecture.

<!-- truncate -->

## Understanding Rhino's Policy Hierarchy

Before implementing permission-based authorization, it's important to understand how Rhino's policy system works. The framework provides several built-in policies that inherit from `Rhino::BasePolicy`:

-   **`CrudPolicy`** - The default policy for most resources, acts as a dispatcher that delegates to role-specific policies
-   **`AdminPolicy`** - Grants full CRUD permissions (create, read, update, destroy)
-   **`EditorPolicy`** - Grants read and update permissions
-   **`ViewerPolicy`** - Grants read-only permissions (index and show)

### The Policy Lookup Chain

When `CrudPolicy` checks permissions, it uses a lookup chain to find the appropriate role-specific policy. For example, when checking access for a user with the `admin` role on a `Blog` resource, Rhino tries to find policies in this order:

```ruby
# 1. Tries "AdminBlogPolicy".safe_constantize  # => nil (doesn't exist)
# 2. Tries "AdminPolicy".safe_constantize       # => nil (doesn't exist)
# 3. Tries "Rhino::AdminPolicy".safe_constantize  # => Rhino::AdminPolicy ✓
```

This lookup mechanism allows you to override policies at different levels of specificity.

### CrudPolicy's Delegation Pattern

`CrudPolicy` acts as a dispatcher that:

1. Retrieves all roles for the authenticated user within the resource's organization
2. For each role, finds the corresponding policy class
3. Delegates the authorization check to that role-specific policy
4. Returns `true` if any role grants permission (first `true` wins)

The key insight is that `CrudPolicy` doesn't contain the authorization logic itself—it delegates to role-based policies. To implement permission-based authorization, you should override policies for specific roles rather than trying to replace `CrudPolicy` entirely.

## Implementing Permission-Based Authorization

### Step 1: Create the Permission Model

First, create a `Permission` model to store role-based permissions:

```ruby
# app/models/permission.rb
class Permission < ApplicationRecord
  # Columns:
  #   role: string      (e.g., "editor", "admin", "custom_role")
  #   resource: string  (e.g., "Blog", "Article", "Comment")
  #   action: string    (e.g., "update", "create", "destroy", "show", "index")

  validates :role, :resource, :action, presence: true
  validates :action, inclusion: { in: %w[create update destroy show index] }

  # Find if a permission exists
  def self.exists_for?(role:, resource:, action:)
    exists?(role: role, resource: resource.to_s, action: action.to_s)
  end
end
```

Create the migration:

```ruby
# db/migrate/TIMESTAMP_create_permissions.rb
class CreatePermissions < ActiveRecord::Migration[7.0]
  def change
    create_table :permissions do |t|
      t.string :role, null: false
      t.string :resource, null: false
      t.string :action, null: false

      t.timestamps
    end

    add_index :permissions, [:role, :resource, :action], unique: true
  end
end
```

### Step 2: Add Permission Checking to the User Model

Add a helper method to check if a user has a specific permission:

```ruby
# app/models/user.rb
class User < Rhino::User
  # ... existing code ...

  # Check if user has permission for a specific action on a resource
  def has_permission?(action, record)
    # Get all roles for this user in the organization that owns the record
    roles = Rhino.base_owner.roles_for_auth(self, record)

    # Check if any of the user's roles have the required permission
    roles.keys.any? do |role|
      Permission.exists_for?(
        role: role.to_s,
        resource: record.class.name,
        action: action.to_s.gsub('?', '')
      )
    end
  end
end
```

### Step 3: Create a Custom Role Policy

Create a custom policy for your role that checks permissions. For example, if you have a `custom_role`, create `CustomRolePolicy`:

```ruby
# app/policies/custom_role_policy.rb
class CustomRolePolicy < Rhino::BasePolicy
  def update?
    authorize_action(check_permission(:update?))
  end

  def create?
    authorize_action(check_permission(:create?))
  end

  def destroy?
    authorize_action(check_permission(:destroy?))
  end

  def show?
    authorize_action(check_permission(:show?))
  end

  def index?
    authorize_action(check_permission(:index?))
  end

  private

  def check_permission(action)
    # Convert action method name to action string
    action_name = action.to_s.gsub('?', '')

    # Look up permission in the permissions table
    auth_owner.has_permission?(action_name, record)
  end

  def authorize_action(has_permission)
    # Additional authorization logic can go here
    # For example, checking ownership or other business rules
    has_permission
  end

  class Scope < ::Rhino::BasePolicy::Scope
    def resolve
      # Scope to resources where user has 'index' permission
      if auth_owner.has_permission?('index', scope.model)
        scope.all
      else
        scope.none
      end
    end
  end
end
```

### Step 4: Seed Permissions

Populate your permissions table with the desired role-resource-action combinations:

```ruby
# db/seeds.rb
Permission.create([
  { role: "admin", resource: "Blog", action: "update" },
  { role: "admin", resource: "Blog", action: "destroy" },
  { role: "admin", resource: "Blog", action: "create" },
  { role: "admin", resource: "Blog", action: "show" },
  { role: "admin", resource: "Blog", action: "index" },

  { role: "editor", resource: "Blog", action: "update" },
  { role: "editor", resource: "Blog", action: "show" },
  { role: "editor", resource: "Blog", action: "index" },

  { role: "viewer", resource: "Blog", action: "show" },
  { role: "viewer", resource: "Blog", action: "index" },

  # Custom role permissions
  { role: "custom_role", resource: "Article", action: "update" },
  { role: "custom_role", resource: "Article", action: "show" },
])
```

## Usage Flow

Here's how the permission check flows when a user tries to perform an action:

```
user = User.find(1)  # has roles: ["editor"]
blog = Blog.find(5)

# Controller calls: authorize @blog
policy = CustomRoleBlogPolicy.new(user, blog)  # or falls back to CustomRolePolicy
policy.update?
# ↓
# check_permission(:update?)
# ↓
# user.has_permission?(:update, blog)
# ↓
# Permission.exists?(role: "editor", resource: "Blog", action: "update")
# ↓ returns true
# authorize_action(true) → true
```

## Advanced Patterns

### Resource-Specific Permissions

You can create resource-specific policies that combine permission checks with other logic:

```ruby
# app/policies/custom_role_blog_policy.rb
class CustomRoleBlogPolicy < CustomRolePolicy
  def update?
    # Check base permission first
    return false unless super

    # Additional resource-specific logic
    # For example: only allow updates during business hours
    Time.current.hour.between?(9, 17)
  end

  def destroy?
    # Maybe only admins can destroy, even if they have update permission
    return false unless super

    # Check if user has explicit destroy permission
    auth_owner.has_permission?('destroy', record)
  end
end
```

### Combining with Existing Policies

You can inherit from existing Rhino policies and add permission checks:

```ruby
# app/policies/custom_role_policy.rb
class CustomRolePolicy < Rhino::ViewerPolicy
  # Inherit read permissions from ViewerPolicy
  # Override write permissions to check custom permissions

  def update?
    authorize_action(check_permission(:update?))
  end

  def create?
    authorize_action(check_permission(:create?))
  end

  private

  def check_permission(action)
    action_name = action.to_s.gsub('?', '')
    auth_owner.has_permission?(action_name, record)
  end

  def authorize_action(has_permission)
    has_permission
  end
end
```

### Handling Callback Chains

Rhino's `CrudPolicy` supports callback chains that can be used for additional authorization logic. When overriding policies, be aware that:

-   `CrudPolicy` delegates with `check_action` for each CRUD action
-   The callback chain can be set, but by default it's not
-   If you need to modify the callback behavior, you may need to override methods in your custom policy

## Best Practices

1. **Override Role-Specific Policies**: Don't try to replace `CrudPolicy` directly. Instead, create or override policies for specific roles (e.g., `CustomRolePolicy`, `CustomRoleBlogPolicy`).

2. **Use the Policy Lookup Chain**: Leverage Rhino's policy lookup mechanism by creating policies at the appropriate level of specificity.

3. **Combine with Scopes**: Make sure to implement the `Scope` class in your custom policy to control what records appear in `index` actions.

4. **Cache Permission Checks**: For performance, consider caching permission lookups or using a more efficient storage mechanism if you have many permissions.

5. **Test Thoroughly**: Create comprehensive tests for your permission system, especially edge cases where users have multiple roles.

6. **Document Permission Structure**: Keep clear documentation of which roles have which permissions on which resources.

## Example: Complete Custom Role Implementation

Here's a complete example of implementing a permission-based "Author" role:

```ruby
# app/models/permission.rb
# (as shown above)

# app/policies/author_policy.rb
class AuthorPolicy < Rhino::ViewerPolicy
  def create?
    authorize_action(check_permission(:create?))
  end

  def update?
    # Authors can only update their own resources OR if they have explicit permission
    return true if record.respond_to?(:user) && record.user == auth_owner
    authorize_action(check_permission(:update?))
  end

  def destroy?
    authorize_action(check_permission(:destroy?))
  end

  private

  def check_permission(action)
    action_name = action.to_s.gsub('?', '')
    auth_owner.has_permission?(action_name, record)
  end

  def authorize_action(has_permission)
    has_permission
  end

  class Scope < ::Rhino::ViewerPolicy::Scope
    def resolve
      # Authors can see their own resources plus any they have 'index' permission for
      own_resources = scope.where(user: auth_owner)

      if auth_owner.has_permission?('index', scope.model)
        scope.where(id: own_resources.select(:id))
          .or(scope.all)
      else
        own_resources
      end
    end
  end
end

# db/seeds.rb
Permission.create([
  { role: "author", resource: "Blog", action: "create" },
  { role: "author", resource: "Blog", action: "update" },  # For own blogs
  { role: "author", resource: "Blog", action: "show" },
  { role: "author", resource: "Blog", action: "index" },
])
```

## Conclusion

Permission-based authorization in Rhino requires creating a permissions table and custom policies that check against it, but the framework's flexible policy system makes this straightforward. By understanding how `CrudPolicy` delegates to role-specific policies and leveraging the policy lookup chain, you can implement fine-grained permissions while maintaining compatibility with Rhino's existing authorization infrastructure.

The key is to work with Rhino's policy system rather than against it—create custom role policies that inherit from the appropriate base policy and add permission checks on top. This approach gives you the flexibility of custom permissions while preserving all the benefits of Rhino's built-in authorization features.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
