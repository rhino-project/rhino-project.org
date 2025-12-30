---
title: "Rhino Subscriptions - Technical Deep Dive"
description: This document provides technical details about the rhino_project_subscriptions module architecture, installation, and integration requirements. Learn how Rhino handles Stripe integration, multi-tenancy support, and subscription management.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        subscriptions,
        stripe,
        payments,
        saas,
        billing,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

This document provides technical details about the `rhino_project_subscriptions` module architecture, installation, and integration requirements.

<!-- truncate -->

## Module Architecture

### Dependencies

The `rhino_project_subscriptions` gem requires:

-   **Rails** `~> 8.0.0`
-   **rhino_project_core** (matching version)
-   **rhino_project_organizations** (for `base_owner` multi-tenancy support)
-   **stripe** gem `13.3.1` (bundled automatically)

The module will **only register** if the `RHINO_STRIPE_SECRET_KEY` environment variable is set. Without this key, the module silently fails to activate.

## Installation Details

When you run `rails rhino_subscriptions:install`, the following occurs:

### 1. Initializer File Created

**Location:** `config/initializers/rhino_subscriptions.rb`

```ruby
RhinoSubscriptions.setup do |config|
  # Products to show pricing for
  # config.products = ["prod_3893aadf", "prod_33aa44adf"]

  # https://docs.stripe.com/api/checkout/sessions/object#checkout_session_object-payment_method_collection
  # config.payment_method_collection = :if_required
end
```

**Configuration Options:**

-   `products`: Array of Stripe product IDs to display, or `:all` (default) to show all active products
-   `payment_method_collection`: Controls when Stripe collects payment methods
    -   `:always` (default) - Always collect payment method
    -   `:if_required` - Only collect if needed for the transaction

### 2. Database Migrations

Two migrations are added to your application when you run `rails db:migrate`:

**Migration 1: Create stripe_customers table**

```ruby
create_table :stripe_customers do |t|
  t.references :user, null: false, foreign_key: true
  t.string :customer_id                    # Stripe customer ID
  t.string :current_stripe_session_id      # Active checkout session
  t.timestamps
end
```

**Migration 2: Multi-tenancy support**

```ruby
remove_reference :stripe_customers, :user
add_reference :stripe_customers, :base_owner
```

This migration changes from user-only ownership to `base_owner`, enabling subscriptions to be owned by either Users or Organizations.

### 3. Model Added

**Model:** `Rhino::StripeCustomer`

**Location:** `rhino-project/gems/rhino_project_subscriptions/app/models/rhino/stripe_customer.rb`

```ruby
module Rhino
  class StripeCustomer < ApplicationRecord
    belongs_to :base_owner, class_name: "::#{Rhino.base_owner.name}"
    rhino_owner :base_owner
  end
end
```

**Purpose:**

-   Links your application's users/organizations to Stripe customer records
-   Stores the Stripe `customer_id` for API calls
-   Tracks `current_stripe_session_id` to validate successful payment completion
-   Owned by `base_owner` (User or Organization depending on configuration)

### 4. Controller Added

**Controller:** `Rhino::StripeController`

**Location:** `rhino-project/gems/rhino_project_subscriptions/app/controllers/rhino/stripe_controller.rb`

**Inheritance:** `Rhino::BaseController`

**Includes:** `Rhino::Authenticated` (requires logged-in user for all actions)

**Key Characteristics:**

-   Sets Stripe API key from `ENV["RHINO_STRIPE_SECRET_KEY"]` on load
-   All endpoints require authentication
-   Uses custom `StripePolicy` for authorization
-   Automatically creates Stripe customers on first checkout

### 5. API Routes Mounted

Six endpoints are added under the `/api/subscription/` namespace:

| Endpoint                              | Method | Action                  |
| ------------------------------------- | ------ | ----------------------- |
| `/api/subscription/prices`            | GET    | `prices`                |
| `/api/subscription/customer`          | POST   | `customer`              |
| `/api/subscription/subscriptions`    | GET    | `subscriptions`         |
| `/api/subscription/create-checkout-session` | POST   | `create_checkout_session` |
| `/api/subscription/cancel`            | POST   | `cancel`                |
| `/api/subscription/check_session_id` | GET    | `check_session_id`      |

### 6. Authorization Policy Added

**Policy:** `StripePolicy`

**Location:** `rhino-project/gems/rhino_project_subscriptions/app/policies/stripe_policy.rb`

```ruby
class StripePolicy < Rhino::BasePolicy
  def create_checkout_session?
    authorize_action(admin?)
  end

  private
    def admin?
      Rhino.base_owner.roles_for_auth(auth_owner).any? { |k, _| k.to_s == "admin" }
    end
end
```

**Authorization Rules:**

-   Only users with an `admin` role can create checkout sessions
-   All other actions inherit base authorization from `Rhino::BasePolicy`
-   Non-admin users receive 403 Forbidden when attempting checkout

## Multi-Tenancy and Organization Support

### Base Owner Concept

The module uses `base_owner_id` for ownership, which abstracts over Users and Organizations:

-   When `rhino_project_organizations` is installed, `base_owner` = Organization
-   Otherwise, `base_owner` = User
-   All API calls require passing the `base_owner_id` parameter

### API Usage with Multi-Tenancy

**For User-Owned Subscriptions:**

```json
{
  "base_owner_id": "123",  // current_user.id
  "price": "price_xxxxx"
}
```

**For Organization-Owned Subscriptions:**

```json
{
  "base_owner_id": "456",  // organization.id
  "price": "price_xxxxx"
}
```

The `StripeCustomer` model stores one Stripe customer per `base_owner`, enabling:

-   Individual user subscriptions
-   Organization-wide subscriptions
-   Role-based access control via the organizations module

## Detailed API Endpoint Documentation

### GET `/api/subscription/prices`

**Purpose:** Fetch active Stripe prices for display

**Authentication:** Required

**Parameters:** None

**Filtering Behavior:**

-   If `RhinoSubscriptions.products == :all`, returns up to 5 active prices from all products
-   If specific product IDs are configured, returns up to 5 active prices per product
-   Response includes expanded product data

**Response:**

```json
{
  "prices": [
    {
      "id": "price_xxxxx",
      "unit_amount": 1999,
      "recurring": {
        "interval": "month"
      },
      "product": {
        "id": "prod_xxxxx",
        "name": "Pro Plan"
      }
    }
  ]
}
```

### POST `/api/subscription/create-checkout-session`

**Purpose:** Create Stripe Checkout session and redirect user to payment

**Authentication:** Required

**Authorization:** Admin role required (enforced by `StripePolicy`)

**Parameters:**

-   `base_owner_id` (required): Owner of the subscription
-   `price` (required): Stripe price ID
-   `success_url` (required): Redirect URL after successful payment
-   `cancel_url` (required): Redirect URL if payment canceled

**Behavior:**

1.  Authorizes the request (admin check)
2.  Finds or creates `StripeCustomer` record for the `base_owner_id`
3.  If first time, creates Stripe customer via API using `current_user.email`
4.  Creates Stripe Checkout Session with:
    -   Mode: `subscription`
    -   Promotion codes: Enabled
    -   Quantity: 1 (fixed)
    -   Payment method collection: Per configuration
5.  Stores `session.id` in `current_stripe_session_id` field
6.  Returns session ID for client redirect

**Response:**

```json
{
  "sessionId": "cs_test_xxxxx"
}
```

**Checkout Session Configuration:**

-   Mode: `"subscription"` (not one-time payment)
-   Promotion codes: Always allowed
-   Quantity: Fixed at 1 (not configurable per request)
-   Payment method collection: From `RhinoSubscriptions.payment_method_collection`

### POST `/api/subscription/cancel`

**Purpose:** Cancel all subscriptions for a base_owner

**Authentication:** Required

**Parameters:**

-   `base_owner_id` (required): Owner of subscriptions to cancel

**Behavior:**

1.  Finds `StripeCustomer` by `base_owner_id`
2.  Lists all subscriptions for that Stripe customer
3.  **Deletes each subscription** via `Stripe::Subscription.delete()`
4.  Returns empty JSON

**Important:** This is a **hard delete**, not a pause or soft-cancel. All subscriptions are immediately terminated.

**Response:**

```json
{}
```

### POST `/api/subscription/customer`

**Purpose:** Retrieve Stripe customer details

**Authentication:** Required

**Parameters:**

-   `base_owner_id` (required): Owner to fetch customer for

**Behavior:**

-   Finds local `StripeCustomer` record
-   Calls Stripe API to retrieve fresh customer data
-   Returns first customer from data array

**Response:**

```json
{
  "customer": {
    "id": "cus_xxxxx",
    "email": "user@example.com"
  }
}
```

If no customer exists, returns `{}`.

### GET `/api/subscription/subscriptions`

**Purpose:** List all active subscriptions for a base_owner

**Authentication:** Required

**Parameters:**

-   `base_owner_id` (required): Owner to fetch subscriptions for

**Behavior:**

-   Finds `StripeCustomer` by `base_owner_id`
-   Fetches subscriptions from Stripe API
-   Expands `data.plan.product` for full product details

**Response:**

```json
{
  "subscriptions": [
    {
      "id": "sub_xxxxx",
      "status": "active",
      "current_period_end": 1735689600,
      "plan": {
        "id": "plan_xxxxx",
        "product": {
          "id": "prod_xxxxx",
          "name": "Pro Plan"
        }
      }
    }
  ]
}
```

If no customer exists, returns `{}`.

### GET `/api/subscription/check_session_id`

**Purpose:** Verify that a checkout session completed successfully

**Authentication:** Required

**Parameters:**

-   `base_owner_id` (required): Owner of the session
-   `session_id` (required): Stripe checkout session ID from redirect

**Behavior:**

-   Compares provided `session_id` with stored `current_stripe_session_id`
-   Returns match status

**Response:**

```json
{
  "session_matched": true
}
```

**Use Case:** After Stripe redirects back to your app with `?session_id={CHECKOUT_SESSION_ID}`, call this endpoint to confirm the session belongs to the current user and completed successfully.

## Frontend Integration

The `@rhino-project/core` package includes pre-built React components:

### Components Included

**Component:** `<Subscription>`

**Location:** `packages/core/src/components/settings/Subscription.js`

**Features:**

-   Displays pricing plans as cards
-   "Checkout" button per plan (triggers Stripe redirect)
-   Shows active subscription with end date
-   Cancel subscription button
-   Success/error alerts after payment
-   Session validation after redirect

**Component:** `<SubscriptionTab>`

**Purpose:** Tab navigation element for settings pages

### React Hooks Provided

**Location:** `packages/core/src/queries/subscription.js`

-   `usePrices()` - Fetches available pricing plans
-   `useSubscription(baseOwnerId)` - Fetches active subscriptions
-   `useCheckSession(baseOwnerId, session_id)` - Validates session after redirect
-   `CreateCheckoutSession(price, base_owner_id)` - Initiates checkout flow
-   `createCancellation(base_owner_id)` - Cancels subscription

### Frontend Environment Variable

The frontend expects:

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

This is accessed via `env.STRIPE_PUBLISHABLE_KEY` in the subscription queries.

### Checkout Flow

1.  User clicks "Checkout" button on pricing plan
2.  `CreateCheckoutSession()` is called with price ID and base_owner_id
3.  Backend creates Stripe Checkout Session
4.  Frontend receives `sessionId` and redirects using Stripe.js
5.  User completes payment on Stripe's hosted page
6.  Stripe redirects back with `?status=success&session_id={CHECKOUT_SESSION_ID}`
7.  Frontend calls `useCheckSession()` to validate the session
8.  Success or error alert is displayed

## Important Implementation Notes

### Automatic Customer Creation

The `get_stripe_customer` method uses `find_or_create_by!`:

```ruby
Rhino::StripeCustomer.find_or_create_by!(base_owner_id: params["base_owner_id"]) do |stripe_customer|
  customer = ::Stripe::Customer.create(email: current_user.email)
  stripe_customer.customer_id = customer.id
end
```

This means:

-   First checkout automatically creates both local and Stripe customer records
-   Uses `current_user.email` for the Stripe customer
-   Subsequent requests reuse the same Stripe customer ID

### Subscription Pricing Limits

The `prices` endpoint limits results:

-   Maximum 5 prices per product
-   Active prices only
-   Product data is expanded in response

For applications with many products/prices, configure specific product IDs in the initializer.

### Module Registration

The module only registers if the environment variable is set:

```ruby
initializer "rhino_subscriptions.register_module" do
  config.after_initialize do
    if ENV["RHINO_STRIPE_SECRET_KEY"]
      Rhino.registered_modules[:rhino_subscriptions] = {
        version: RhinoSubscriptions::VERSION::STRING
      }
    end
  end
end
```

Without `RHINO_STRIPE_SECRET_KEY`, the module silently skips registration.

## Environment Variables Reference

### Backend (Rails)

```bash
RHINO_STRIPE_SECRET_KEY=sk_test_xxxxx
```

Required for:

-   Module registration
-   Stripe API authentication
-   All backend operations

### Frontend (React)

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

Required for:

-   Stripe.js initialization
-   Client-side checkout redirect

## Authorization Summary

| Action              | Endpoint                          | Required Role      | Enforced By          |
| ------------------- | --------------------------------- | ------------------ | -------------------- |
| View prices         | GET `/prices`                     | Authenticated user | `Rhino::Authenticated` |
| View subscriptions  | GET `/subscriptions`              | Authenticated user | `Rhino::Authenticated` |
| Get customer        | POST `/customer`                  | Authenticated user | `Rhino::Authenticated` |
| Create checkout     | POST `/create-checkout-session`   | **Admin**          | `StripePolicy`       |
| Cancel subscription | POST `/cancel`                    | Authenticated user | `Rhino::Authenticated` |
| Check session       | GET `/check_session_id`           | Authenticated user | `Rhino::Authenticated` |

**Key Point:** Only admin users can initiate new subscriptions. Regular users will receive 403 Forbidden errors when attempting checkout.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
