---
title: "A Deep Dive into the Rhino Framework: Part 2 (Authorization and the CrudController)"
description: In this second part of our Rhino framework series, we explore how Rhino handles authentication and authorization through its secure-by-default architecture. We'll examine the CrudController and CrudPolicy system that provides robust security foundations for all your API resources.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        authorization,
        security,
        pundit,
        devise,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

In the first part of this series, we introduced Rhino's Model-Driven Development (MDD) approach and explored how its dynamic routing system generates API endpoints directly from your models. This architecture allows for rapid development, but it requires an equally robust system to secure those endpoints. This post will dissect that next layer, breaking down how Rhino handles authentication (verifying a user's identity) and authorization (determining what that user can do).

At the core of Rhino's security model are established and trusted Ruby gems: `devise_token_auth` for token-based authentication and `pundit` for fine-grained authorization. When the optional `rhino_organizations` module is installed for multi-tenancy, the `rolify` gem is introduced to enable sophisticated role-based access control (RBAC). We will explore how these components are seamlessly integrated within Rhino's default `CrudController` and `CrudPolicy` to provide a secure-by-default foundation for all your API resources, allowing you to build with confidence from the start.

<!-- truncate -->

## The Foundation: Authentication with Devise

Before an application can determine what a user is allowed to do, it must first know who the user is. Rhino entrusts this critical function to `devise_token_auth`, a gem designed for handling token-based authentication in Rails APIs. It manages the entire authentication lifecycle, including user registration, secure sign-in, and session management using authentication tokens that are exchanged with the client on each request.

From the perspective of the authorization system, Devise's most critical function is to provide a verified `current_user` object within the context of the controller for every authenticated API request. This object, representing the logged-in user, is the cornerstone upon which all subsequent permission checks and data scoping decisions are built. The `Rhino::Authenticated` concern, included in the `CrudController`, ensures that an unauthenticated request is rejected before any action is executed.

## The Gatekeeper: Authorization with Pundit and Rolify

Once a user has been authenticated, Rhino must determine their permissions. This is the responsibility of the authorization layer, which is powered by the Pundit gem. Pundit provides a clean, object-oriented approach to managing permissions through dedicated "policy" classes.

In a simple, single-user application, Pundit's authorization rules can be based directly on a user's ownership of a resource. However, for most real-world applications, a multi-tenant structure is required, where data is partitioned between different groups of users. This is where the `rhino_organizations` module becomes essential. When installed, it fundamentally shifts the ownership model:

-   **Resources are owned by an `Organization`**, not directly by an individual user. This aligns the data structure with a typical B2B SaaS model.
-   The `rolify` gem is utilized to manage a user's permissions within each organization. A `User` is connected to an `Organization` through a specific `Role` (e.g., admin, editor, viewer). Users can have different roles in different organizations.

This structure provides a powerful and flexible foundation for Role-Based Access Control (RBAC), allowing permissions to be managed at the organization level rather than on a per-user basis, which is crucial for scalability and maintainability.

## Secure by Default: The Principle of Least Privilege

Rhino's entire authorization model is built on a "deny by default" philosophy, a security best practice known as the Principle of Least Privilege (PoLP). This principle is first established in `Rhino::BasePolicy`, the abstract class from which all other policies in the framework inherit.

By default, `BasePolicy` does two critical things:

1. It defines all standard Pundit action methods (`index?`, `show?`, `create?`, `update?`, `destroy?`) and makes them return `false`.
2. It defines a `Scope` class with a `resolve` method that returns `scope.none`, an empty ActiveRecord relation.

This means that out of the box, an unconfigured policy grants no permissions and allows a user to see no data. Permission must always be explicitly granted.

This is where `Rhino::CrudPolicy`, the default policy for all resources, comes into play. It inherits from `BasePolicy` but overrides its restrictive defaults with an intelligent, role-based logic.

-   **With the Organizations Module:** The default behavior is collaborative. A `User` who has been assigned an `admin` role within an `Organization` is granted full CRUD permissions on all resources owned by that organization. Furthermore, any user who is simply a member of that organization is granted `viewer` permissions. This means if two users are in the same organization, they can both list and view the organization's blogs, regardless of who created them. This provides a sensible starting point for team-based applications.

-   **Without the Organizations Module:** In a simpler setup, the `User` who is designated as the `rhino_owner_base` of a resource hierarchy is granted full CRUD permissions.

## Tying It All Together: The `Rhino::CrudController` in Action

The `Rhino::CrudController` is the workhorse that exposes the standard CRUD operations for your resources. Let's examine how it integrates authentication and authorization by looking at a typical `update` action:

```ruby
def update
  @model = find_resource
  authorize @model
  @model.update!(permit_and_transform(@model, params))
  permit_and_render(@model)
end
```

This seemingly simple method performs several critical security operations:

1. **`find_resource`**: This private helper method retrieves the specific record from the database based on the `id` in the URL parameters.

2. **`authorize @model`**: This is the core authorization check. Pundit is invoked here. It automatically infers that it should look for a policy corresponding to the `@model`'s class (e.g., `BlogPolicy`). Since one likely doesn't exist, it falls back to the default, `Rhino::CrudPolicy`. It then calls the `update?` method on an instance of that policy, passing in the `current_user` and the `@model` record.

3. **`permit_and_transform`**: If authorization succeeds, this method from the `Rhino::Permit` concern is called. It consults the same policy to get a list of attributes that are permitted for the `update` action and sanitizes the incoming parameters, ensuring that a user cannot update fields they are not supposed to.

4. **`@model.update!(...)`**: The model is updated with the sanitized parameters.

5. **`permit_and_render`**: Finally, the updated record is serialized back to JSON, again using the policy to determine which attributes are safe to show, and sent as the response.

## The `CrudPolicy` as a Dispatcher

The most elegant part of this design is that `CrudPolicy` does not contain the final authorization logic itself. Instead, it acts as a **dispatcher**. Its primary job is to determine the user's role and then delegate the authorization check to a more specific role-based policy.

Let's look at the `check_action` helper method within `CrudPolicy`, which is called by methods like `update?`:

```ruby
def check_action(action)
  # For each role the user has for this record...
  Rhino.base_owner.roles_for_auth(auth_owner, record).each do |role, _base_owner_array|
    # Find the policy for that role (e.g., AdminPolicy)
    policy_class = Rhino::PolicyHelper.find_policy(role, record)
    next unless policy_class

    # If that role-policy allows the action, authorize immediately.
    return true if policy_class.new(auth_owner, record).send(action)
  end

  # If no role granted permission, deny.
  false
end
```

This method is a clear illustration of the dispatcher pattern:

1. **`roles_for_auth`**: It first asks the system, "What roles does this `auth_owner` (the `current_user`) have in the organization that owns this `record`?" This might return `{ "admin" => [Organization(id:1)] }`.

2. **`find_policy`**: For each role found (e.g., "admin"), it looks up the corresponding policy class (e.g., `AdminPolicy`). Rhino has a convention for this: it will first look for a highly specific policy like `AdminBlogPolicy`, and if not found, fall back to the general `AdminPolicy`.

3. **`send(action)`**: It then instantiates that specific role-policy and calls the original action method (e.g., `update?`) on it.

4. **First `true` Wins**: The moment any role-policy returns `true`, the `CrudPolicy` short-circuits and grants access. If it checks all roles and none grant access, it returns `false`.

This design is powerful because it decouples the generic controller from the specific business logic. The `CrudController` doesn't need to know anything about admins, editors, or viewers. It only needs to know how to talk to the `CrudPolicy`, which handles the routing of the authorization query.

## Applying the Dispatcher Pattern to Data Scoping

The same dispatcher pattern is applied to data scoping, which is arguably even more critical for preventing data leaks in a multi-tenant system. This logic resides in the nested `Scope` class inside `CrudPolicy`.

When the `CrudController`'s `index` action calls `policy_scope(klass)`, Pundit invokes the `resolve` method on `CrudPolicy::Scope`:

```ruby
class Scope < ::Rhino::BasePolicy::Scope
  def resolve
    role_scopes = []

    # Get every role for the auth owner across all their orgs
    Rhino.base_owner.roles_for_auth(auth_owner).each do |role, base_owner_array|
      base_owner_array.each do |base_owner|
        # Find the scope class for that role (e.g., AdminPolicy::Scope)
        scope_class = Rhino::PolicyHelper.find_policy_scope(role, scope)
        next unless scope_class

        # Instantiate the role's scope and get its resolved relation
        scope_instance = scope_class.new(auth_owner, scope)
        resolved_scope = scope_instance.resolve

        # Add the SQL for this specific role and organization to our list
        role_scopes << resolved_scope.where(tnpk(Rhino.base_owner) => base_owner.id)
      end
    end

    return scope.none unless role_scopes.present?

    # Combine all the individual SQL queries into one using UNION
    scope.where("#{tnpk(scope)} in (#{role_scopes.map(&:to_sql).join(' UNION ')})")
  end
end
```

The logic is analogous to the action check but operates on collections of data:

1. It iterates through every role the user has across all their organizations.
2. For each role in each organization, it finds the corresponding policy scope (e.g., `AdminPolicy::Scope`, `ViewerPolicy::Scope`).
3. It calls `resolve` on that specific scope. `AdminPolicy::Scope` might return `scope.all` (can see everything in the org), while a hypothetical `AuthorPolicy::Scope` might return `scope.where(user: auth_owner)` (can only see their own posts).
4. It collects the SQL query for each of these resolved scopes.
5. Finally, it combines all the individual SQL queries into a single, efficient database query using `UNION`. This returns a single `ActiveRecord::Relation` containing every record the user is permitted to see across all their roles and organizations, which is then passed back to the controller.

## Conclusion

The Rhino framework provides a layered, secure, and highly scalable architecture for API authorization. By composing the strengths of Devise for authentication, Pundit for authorization policies, and Rolify for role management, it creates a robust system that is secure by default. The `CrudController` and `CrudPolicy` act as the central nervous system, applying these security principles consistently to every resource you define. This elegant abstraction means developers can build feature-rich, multi-tenant applications with minimal boilerplate, focusing on their unique business logic while trusting that the foundation is secure. You only need to create a custom policy when the default "admin," "editor," and "viewer" roles are not sufficient for your needs.

In our next post, we will dive deeper into customizing Rhino's behavior by overriding the default policies and exploring the various configuration options available on the model objects themselves.

---

_This blog post is based on content from [A Deep Dive into the Rhino Framework: Part 2 (Authorization and the CrudController)](https://dev.to/itsalireza/a-deep-dive-into-the-rhino-framework-part-2-authorization-and-the-crudcontroller-3lm1) by Alireza on DEV Community._
