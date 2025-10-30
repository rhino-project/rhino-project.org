---
title: "Guide on Rhino's Notifications Module"
description: The Rhino Notifications module (rhino_project_notifications) is a Rails engine that wraps and extends the activity_notification gem (v2.3.3) to provide a complete notification system for Rhino-based applications. It provides both backend (Rails API) and frontend (React) components for managing user notifications.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        notifications,
        activity-notification,
        react,
        api,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

The Rhino Notifications module (rhino_project_notifications) is a Rails engine that wraps and extends the activity_notification gem (v2.3.3) to provide a complete notification system for Rhino-based applications. It provides both backend (Rails API) and frontend (React) components for managing user notifications.

This guide will first explain the base activity_notification gem capabilities, then detail what Rhino adds on top, and finally walk through setup and usage.

<!-- truncate -->

## Part 1: The Base activity_notification Gem

Before understanding what Rhino adds, let's understand the underlying gem's capabilities.

### Core Concepts

The activity_notification gem provides a flexible notification system with these key features:

#### 1. Target (Receiver of Notifications)

Models that can receive notifications use `acts_as_target`:

```ruby
class User < ApplicationRecord
  acts_as_target email: :email
end
```

This makes User a notification recipient and provides methods like:

-   `user.notifications` - All notifications
-   `user.unopened_notification_count` - Count of unread
-   `user.notification_opened?(notification)` - Check if opened
-   `user.open_notification(notification)` - Mark as read

#### 2. Notifiable (Trigger of Notifications)

Models that trigger notifications use `acts_as_notifiable`:

```ruby
class Comment < ApplicationRecord
  belongs_to :user
  belongs_to :post

  acts_as_notifiable :users,
    targets: ->(comment, key) { [comment.post.user] },
    group: :post,
    printable_name: ->(comment) { comment.body.truncate(30) }
end
```

#### 3. Automatic Triggering

Notifications can be created automatically on model actions:

```ruby
acts_as_notifiable :users,
  tracked: { only: [:create] }  # Auto-notify on creation
```

Or manually triggered:

```ruby
comment.notify :users, key: "comment.create"
```

#### 4. Grouping & Keys

-   **Keys**: String identifiers for notification types (e.g., "comment.create")
-   **Grouping**: Consolidate related notifications to prevent spam

```ruby
acts_as_notifiable :users,
  group: :post,  # Group all comments on same post
  dependent_notifications: :update_group_and_destroy
```

Result: Multiple comments on the same post = 1 notification

#### 5. Multiple Delivery Channels

-   **Database (default)** - Store in DB
-   **Email** - Send email notifications
-   **Push** - Web push notifications
-   **ActionCable** - Real-time WebSocket updates

### Example: Rails App Without Rhino

Here's how you'd use activity_notification in a standard Rails app:

#### Step 1: Installation

```bash
bundle add activity_notification
rails generate activity_notification:install
rails db:migrate
```

#### Step 2: Configuration

```ruby
# config/initializers/activity_notification.rb
ActivityNotification.configure do |config|
  config.email_enabled = true
  config.mailer = "ActivityNotification::Mailer"
  config.action_cable_enabled = true
  config.group_expiry_threshold = 5.minutes
end
```

#### Step 3: Models

```ruby
# app/models/user.rb
class User < ApplicationRecord
  acts_as_target email: :email
  has_many :posts
  has_many :comments
end

# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :user
  belongs_to :post

  acts_as_notifiable :users,
    targets: ->(comment, key) { [comment.post.user] },
    notifier: :user,
    group: :post,
    printable_name: ->(comment) { comment.body.truncate(30) }
end
```

#### Step 4: Controller

```ruby
# app/controllers/comments_controller.rb
class CommentsController < ApplicationController
  def create
    @comment = @post.comments.build(comment_params.merge(user: current_user))

    if @comment.save
      @comment.notify :users, key: "comment.create"
      redirect_to @post, notice: "Comment added!"
    else
      render :new
    end
  end
end
```

#### Step 5: Views

```erb
<!-- app/views/layouts/application.html.erb -->
<% current_user.notifications.unopened.each do |notification| %>
  <%= render_notification notification %>
<% end %>

<!-- app/views/activity_notification/notifications/_comment_create.html.erb -->
<%= link_to notification.notifier.name, user_path(notification.notifier) %>
commented on your
<%= link_to "post", post_path(notification.group) %>:
"<%= notification.notifiable.body.truncate(20) %>"
```

### How Everything Connects

| Step | What Happens                                            |
| ---- | ------------------------------------------------------- |
| 1    | User adds a comment                                     |
| 2    | Comment triggers `notify :users, key: "comment.create"` |
| 3    | Gem finds targets (post author via lambda)              |
| 4    | Notification record created in DB                       |
| 5    | Delivery channels execute (email, ActionCable)          |
| 6    | Author sees it in their notifications list              |
| 7    | When viewed, `opened_at` timestamp is set               |

### Key Features Summary

| Feature              | Description                                  |
| -------------------- | -------------------------------------------- |
| Target (receiver)    | `acts_as_target` in User                     |
| Notifiable (trigger) | `acts_as_notifiable` in Comment              |
| Grouping             | `group: :post` consolidates notifications    |
| Key-based templates  | "comment.create" maps to view partial        |
| Channels             | DB, email, ActionCable configurable          |
| Persistence          | Stored in notifications table                |
| Read state           | Managed via `.open!`, `.unopened`, `.opened` |
| Deletion             | Manual (not automatic)                       |

## Part 2: What Rhino Adds to activity_notification

Rhino wraps activity_notification to provide a modern SPA architecture with these additions:

### 1. 🎯 RESTful JSON API Endpoints

**Base gem**: Provides HTML views and controllers for traditional Rails apps  
**Rhino adds**: Automatic JSON API endpoints

```ruby
# rhino/rhino-project/gems/rhino_project_notifications/config/routes.rb
Rails.application.routes.draw do
  scope Rhino.namespace do
    notify_to :users, api_mode: true, with_devise: :users
  end
end
```

Creates these endpoints:

-   `GET /api/users/:user_id/notifications` - List with filtering
-   `GET /api/users/:user_id/notifications/:id` - Show single
-   `PUT /api/users/:user_id/notifications/:id/open` - Mark as opened
-   `POST /api/users/:user_id/notifications/open_all` - Mark all opened
-   `DELETE /api/users/:user_id/notifications/:id` - Delete

**JSON Response Format:**

```json
{
	"data": {
		"count": 3,
		"notifications": [
			{
				"id": 1,
				"notifiable_type": "Comment",
				"notifiable_id": 42,
				"notifiable_path": "/articles/10/comments/42",
				"printable_notifiable_name": "Comments on Article Title",
				"key": "comment.create",
				"group_owner_id": 10,
				"opened_at": null,
				"created_at": "2025-10-17T10:30:00.000Z",
				"parameters": {
					"article_id": 10
				}
			}
		]
	}
}
```

**Query Parameters:**

-   `filter=unopened` - Only unopened notifications
-   `filter=opened` - Only opened notifications
-   `filter=all` - All notifications
-   `limit=10` - Limit results

### 2. 🎨 Complete Frontend React Integration

**Base gem**: No frontend - you build your own  
**Rhino provides**:

#### React Query Hooks

```javascript
// rhino/rhino-project/packages/core/src/queries/notifications.js
import { useQuery, useMutation } from "@tanstack/react-query";
import { networkApiCall } from "../lib/networking";
import { useUserId } from "../hooks/auth";

const basePath = (userId) => `/api/users/${userId}/notifications`;
const fullPath = (userId, queryPath) => `${basePath(userId)}/${queryPath}`;

// Fetch unopened notifications
export const useNotifications = () => {
	const userId = useUserId();

	return useQuery({
		queryKey: ["notifications-index"],
		queryFn: ({ signal }) =>
			networkApiCall(fullPath(userId, "?filter=unopened&limit=10"), {
				signal,
			}),
		enabled: !!userId,
	});
};

// Mark all as opened
export const useNotificationsOpenAll = () => {
	const userId = useUserId();

	return useMutation({
		mutationFn: () =>
			networkApiCall(fullPath(userId, "open_all"), { method: "post" }),
	});
};

// Mark single notification as opened
export const useNotificationsOpen = () => {
	const userId = useUserId();

	return useMutation({
		mutationFn: (notificationId) =>
			networkApiCall(fullPath(userId, `${notificationId}/open`), {
				method: "put",
			}),
	});
};
```

#### Pre-built NotificationMenu Component

```javascript
// rhino/rhino-project/packages/core/src/components/app/NotificationMenu.js
import { NavLink } from "react-router-dom";
import {
	Badge,
	DropdownItem,
	DropdownMenu,
	DropdownToggle,
	UncontrolledDropdown,
} from "reactstrap";
import { NavIcon } from "../icons";
import {
	useNotifications,
	useNotificationsOpen,
	useNotificationsOpenAll,
} from "../../queries/notifications";

export const NotificationMenu = () => {
	const { data: { data: notifications } = {}, refetch } = useNotifications();
	const { mutate: openAll } = useNotificationsOpenAll();
	const { mutate: openOne } = useNotificationsOpen();
	const hasNotifications = notifications?.count > 0;

	const handleItemClick = (notificationId) =>
		openOne(notificationId, {
			onSuccess: () => refetch(),
		});

	const handleClick = () => openAll({ onSuccess: () => refetch() });

	return (
		<UncontrolledDropdown nav direction="up">
			<DropdownToggle
				nav
				caret
				className="d-flex align-items-center text-light no-arrow"
			>
				<NavIcon icon="bell" extraClass="flex-shrink-0" />
				<span className="d-block ms-2 overflow-hidden flex-grow-1">
					Notifications
				</span>
				{hasNotifications && <Badge pill>{notifications?.count}</Badge>}
			</DropdownToggle>

			<DropdownMenu dark end>
				{notifications?.notifications?.map((n) => (
					<DropdownItem
						key={n.id}
						tag={NavLink}
						to={n.notifiable_path}
						onClick={() => handleItemClick(n.id)}
					>
						{n.printable_notifiable_name}
					</DropdownItem>
				))}

				{hasNotifications ? (
					<>
						<DropdownItem divider />
						<DropdownItem
							disabled={!hasNotifications}
							onClick={handleClick}
						>
							Mark All Opened
						</DropdownItem>
					</>
				) : (
					<DropdownItem disabled>
						<em>No unread notifications</em>
					</DropdownItem>
				)}
			</DropdownMenu>
		</UncontrolledDropdown>
	);
};
```

### 3. 🔗 Rhino Routing Integration

**Base gem**: You manually define `notifiable_path`  
**Rhino adds**: `route_frontend` helper that auto-generates hierarchical frontend paths

```ruby
class Comment < ApplicationRecord
  belongs_to :article
  belongs_to :user

  # Rhino ownership integration
  rhino_owner :article
  rhino_references %i[article user]

  acts_as_notifiable :users,
    targets: ->(comment, _key) { [comment.article.user] },
    notifiable_path: :comment_notifiable_path,
    printable_name: ->(comment) { "Comment on #{comment.article.title}" }

  # Uses Rhino's routing helper
  def comment_notifiable_path
    route_frontend  # Auto-generates: "/123/articles/456/comments/789"
  end
end
```

The `route_frontend` method integrates with Rhino's ownership model (`rhino_owner`) to build hierarchical URLs based on your base owner (e.g., Organization).

### 4. 🚀 Simplified Installation

**Base gem**: Multiple manual steps  
**Rhino provides**: One-command generator

```bash
rails generate rhino_notifications:install
```

This single command:

-   ✅ Runs `activity_notification:install` (creates initializer)
-   ✅ Runs `activity_notification:migration` (creates DB tables)
-   ✅ Adds `acts_as_target email: :email` to User model

### 5. ⚙️ API-Optimized Defaults

**Base gem defaults:**

-   Email enabled by default
-   Subscriptions enabled by default
-   ActionCable optional

**Rhino defaults (API-first):**

```ruby
# config/initializers/activity_notification.rb
config.email_enabled = false              # Disabled for API-only
config.subscription_enabled = false       # Disabled for simplicity
config.action_cable_enabled = false       # Disabled by default
config.action_cable_api_enabled = false   # Disabled by default
```

This creates a cleaner API-only setup without email/WebSocket complexity unless you explicitly enable them.

### 6. 🔐 Authorization Integration

The `notify_to :users, with_devise: :users` route configuration integrates with Rhino's authentication system to ensure users can only access their own notifications.

### Comparison: Base Gem vs. Rhino

| Feature             | Base activity_notification                | Rhino Addition                   |
| ------------------- | ----------------------------------------- | -------------------------------- |
| Model configuration | ✅ `acts_as_target`, `acts_as_notifiable` | ✅ Same (manual)                 |
| Grouping            | ✅ Yes                                    | ✅ Same                          |
| Notification keys   | ✅ Yes                                    | ✅ Same                          |
| Parameters          | ✅ Custom JSON data                       | ✅ Same                          |
| HTML Views          | ✅ Provided                               | ❌ Not used (API-only)           |
| JSON API            | ⚠️ Basic (optional)                       | ⭐️ Full RESTful API             |
| Frontend            | ❌ Build your own                         | ⭐️ React components + hooks     |
| Routing Helper      | ❌ Manual                                 | ⭐️ `route_frontend` integration |
| Ownership Model     | ❌ None                                   | ⭐️ Rhino owner hierarchy        |
| Installation        | ⚠️ Multiple steps                         | ⭐️ One-command generator        |
| Email Delivery      | ✅ Enabled by default                     | ⚠️ Disabled by default           |
| ActionCable         | ✅ Optional                               | ⚠️ Disabled by default           |
| Subscriptions       | ✅ Enabled by default                     | ⚠️ Disabled by default           |

## Part 3: Setup and Usage in a Rhino Project

### Installation

#### Step 1: Run the Generator

```bash
rails generate rhino_notifications:install
```

This creates:

**File 1: `config/initializers/activity_notification.rb`**

-   Configuration for the notification system
-   Contains ~100+ configuration options
-   Rhino sets sensible API-first defaults

**File 2: `db/migrate/TIMESTAMP_create_activity_notification_tables.rb`**

-   Creates notifications table (stores all notifications)
-   Creates subscriptions table (for subscription management if enabled)

**File 3: Modifies `app/models/user.rb`**

-   Adds `acts_as_target email: :email`

#### Step 2: Run Migrations

```bash
rails db:migrate
```

This creates the database tables.

### Database Schema

#### Notifications Table

```ruby
create_table :notifications do |t|
  t.belongs_to :target,     polymorphic: true, index: true, null: false  # Who receives it (User)
  t.belongs_to :notifiable, polymorphic: true, index: true, null: false  # What it's about (Comment, etc.)
  t.string     :key,                                        null: false  # Notification type identifier
  t.belongs_to :group,      polymorphic: true, index: true              # Groups related notifications
  t.integer    :group_owner_id,                index: true              # Owner of notification group
  t.belongs_to :notifier,   polymorphic: true, index: true              # Who triggered it
  t.text       :parameters                                              # Custom data (JSON)
  t.datetime   :opened_at                                               # Read/unread tracking
  t.timestamps null: false
end
```

**Key Fields:**

-   `target`: Who receives the notification (polymorphic, typically User)
-   `notifiable`: What the notification is about (polymorphic, can be any model)
-   `key`: String identifier (e.g., "comment.create")
-   `group`: Optional grouping to consolidate related notifications
-   `notifier`: Who/what caused the notification
-   `parameters`: JSON text field for custom data
-   `opened_at`: NULL = unread, NOT NULL = read

#### Subscriptions Table

```ruby
create_table :subscriptions do |t|
  t.belongs_to :target,     polymorphic: true, index: true, null: false
  t.string     :key,                           index: true, null: false
  t.boolean    :subscribing,                                null: false, default: true
  t.boolean    :subscribing_to_email,                       null: false, default: true
  t.datetime   :subscribed_at
  t.datetime   :unsubscribed_at
  t.datetime   :subscribed_to_email_at
  t.datetime   :unsubscribed_to_email_at
  t.text       :optional_targets
  t.timestamps null: false
end
add_index :subscriptions, [:target_type, :target_id, :key], unique: true
```

### Configuration

After installation, review and customize:

```ruby
# config/initializers/activity_notification.rb
ActivityNotification.configure do |config|
  config.enabled = true
  config.orm = :active_record
  config.notification_table_name = "notifications"
  config.subscription_table_name = "subscriptions"

  # Email notifications (disabled by default in Rhino)
  config.email_enabled = false

  # Subscription management (disabled by default in Rhino)
  config.subscription_enabled = false

  # ActionCable/WebSocket (disabled by default in Rhino)
  config.action_cable_enabled = false
  config.action_cable_api_enabled = false

  config.opened_index_limit = 10
end
```

**Note on `acts_as_target email: :email`:**
This parameter tells the gem where to find the email field (field mapping), NOT whether to send emails. The `config.email_enabled = false` is what actually disables email sending.

### Model Configuration

#### Target Model (User)

The generator already configured this:

```ruby
# app/models/user.rb
class User < Rhino::User
  acts_as_target email: :email

  # This provides methods:
  # - user.notifications
  # - user.notification_index(filter: 'unopened', limit: 10)
  # - user.unopened_notification_count
  # - user.notification_opened?(notification)
  # - user.open_notification(notification)
  # - user.open_all_notifications
end
```

#### Notifiable Models (Manual Configuration)

Configure any model that should trigger notifications:

```ruby
# app/models/comment.rb
class Comment < ApplicationRecord
  belongs_to :article
  belongs_to :user

  # Rhino ownership (if using organizations/multi-tenancy)
  rhino_owner :article
  rhino_references %i[article user]

  # Notification configuration
  acts_as_notifiable :users,
    # Who receives notifications (lambda returns array of Users)
    targets: ->(comment, _key) {
      ([comment.article.user] + comment.article.reload.commented_users.to_a).uniq
    },

    # Group notifications by article (prevents spam)
    group: :article,

    # Which actions trigger notifications
    tracked: { only: [:create] },  # or { except: [:update] }

    # How to handle deletion
    dependent_notifications: :update_group_and_destroy,
    # Options: :delete_all, :destroy, :restrict_with_error, :update_group_and_destroy

    # Frontend path (uses Rhino routing)
    notifiable_path: :comment_notifiable_path,

    # Display name
    printable_name: :comment_printable_name,

    # Enable real-time updates (if ActionCable enabled)
    action_cable_api_allowed: true,

    # Additional data to store
    parameters: { article_id: :article_id }

  # Method for frontend routing
  def comment_notifiable_path
    route_frontend  # Rhino helper
    # Returns: "/123/articles/456/comments/789"
  end

  # Method for display name
  def comment_printable_name
    "Comments on #{article.title}"
  end
end
```

#### Group Model (Optional)

If using grouping, mark the group model:

```ruby
# app/models/article.rb
class Article < ApplicationRecord
  belongs_to :user
  has_many :comments, dependent: :destroy
  has_many :commented_users, through: :comments, source: :user

  rhino_owner_base  # If Article is your base owner
  rhino_references [:user]

  acts_as_notification_group  # Marks as a group model
end
```

### Usage Patterns

#### 1. Automatic Notification Creation

With `tracked: { only: [:create] }`, notifications are created automatically:

```ruby
# In your controller - no explicit notification call needed!
def create
  @comment = @article.comments.build(comment_params.merge(user: current_user))

  if @comment.save
    # Notification automatically created via acts_as_notifiable
    redirect_to @article, notice: "Comment added!"
  else
    render :new
  end
end
```

#### 2. Manual Notification Creation

You can also trigger notifications manually:

```ruby
# Basic manual trigger
comment.notify_to(users)

# With options
comment.notify_to(
  users,
  key: 'custom.notification.key',
  parameters: { custom_field: 'value' }
)

# Notify single user
comment.notify_to(user)
```

#### 3. Dynamic Notification Targets

Complex target logic in the lambda:

```ruby
acts_as_notifiable :users,
  targets: ->(comment, key) {
    targets = []

    # Notify article author
    targets << comment.article.user

    # Notify other commenters
    targets += comment.article.comments.map(&:user)

    # Notify mentioned users (custom method)
    targets += comment.extract_mentions

    # Remove duplicates and commenter themselves
    (targets.uniq - [comment.user])
  }
```

#### 4. Custom Parameters

Store additional context with notifications:

```ruby
acts_as_notifiable :users,
  parameters: {
    article_id: :article_id,
    comment_count: ->(comment) { comment.article.comments.count },
    is_urgent: ->(comment) { comment.body.include?('URGENT') }
  }

# Access in frontend/API
notification.parameters['article_id']
notification.parameters['comment_count']
notification.parameters['is_urgent']
```

#### 5. Notification Grouping

Prevent notification spam by grouping:

```ruby
acts_as_notifiable :users,
  group: :article,
  dependent_notifications: :update_group_and_destroy

# Result: Multiple comments on same article = 1 notification
# The notification updates with latest comment info
```

### Frontend Integration

#### Using the Pre-built Component

```javascript
// In your Rhino app layout/navigation
import { NotificationMenu } from "@rhino-project/core";

function AppNavigation() {
	return (
		<nav>
			{/* Your other nav items */}
			<NotificationMenu />
		</nav>
	);
}
```

That's it! The component handles:

-   Fetching unopened notifications
-   Displaying count badge
-   Click-to-navigate to notification target
-   Mark as opened
-   Mark all as opened

#### Custom Frontend Implementation

If building your own frontend:

```javascript
import { useNotifications, useNotificationsOpen } from "@rhino-project/core";

function CustomNotifications() {
	const { data: { data: notifications } = {}, refetch } = useNotifications();
	const { mutate: openOne } = useNotificationsOpen();

	const handleClick = (notificationId, path) => {
		openOne(notificationId, {
			onSuccess: () => {
				refetch();
				navigate(path);
			},
		});
	};

	return (
		<div>
			<h2>Notifications ({notifications?.count || 0})</h2>
			{notifications?.notifications?.map((n) => (
				<div
					key={n.id}
					onClick={() => handleClick(n.id, n.notifiable_path)}
				>
					{n.printable_notifiable_name}
				</div>
			))}
		</div>
	);
}
```

### API Endpoints

The following endpoints are automatically available:

#### List Notifications

```http
GET /api/users/:user_id/notifications?filter=unopened&limit=10
```

**Response:**

```json
{
	"data": {
		"count": 3,
		"notifications": [
			{
				"id": 1,
				"notifiable_type": "Comment",
				"notifiable_id": 42,
				"notifiable_path": "/articles/10/comments/42",
				"printable_notifiable_name": "Comments on Article Title",
				"key": "comment.create",
				"opened_at": null,
				"parameters": { "article_id": 10 }
			}
		]
	}
}
```

**Query Parameters:**

-   `filter=unopened` (default) - Only unopened
-   `filter=opened` - Only opened
-   `filter=all` - All notifications
-   `limit=10` - Limit results

#### Show Single Notification

```http
GET /api/users/:user_id/notifications/:id
```

#### Mark as Opened

```http
PUT /api/users/:user_id/notifications/:id/open
```

#### Mark All as Opened

```http
POST /api/users/:user_id/notifications/open_all
```

#### Delete Notification

```http
DELETE /api/users/:user_id/notifications/:id
```

### Advanced Features (Optional)

These features are disabled by default but can be enabled:

#### Email Notifications

```ruby
# config/initializers/activity_notification.rb
config.email_enabled = true
config.mailer_sender = 'notifications@yourapp.com'

# app/models/user.rb
acts_as_target email: :email, email_allowed: true

# app/models/comment.rb
acts_as_notifiable :users,
  email_allowed: true,
  notifier: :user,
  email_subject: ->(notification) {
    "New comment on #{notification.notifiable.article.title}"
  }
```

#### ActionCable Real-time Updates

```ruby
# config/initializers/activity_notification.rb
config.action_cable_enabled = true
config.action_cable_api_enabled = true

# app/models/comment.rb
acts_as_notifiable :users,
  action_cable_api_allowed: true

# Frontend will receive real-time notification updates
```

#### Subscription Management

```ruby
# config/initializers/activity_notification.rb
config.subscription_enabled = true

# Users can manage subscriptions
user.create_subscription(key: 'comment.create')
user.subscribe_to_email('comment.create')
user.unsubscribe('comment.create')
```

### Testing

Example test for notification creation:

```ruby
# test/models/comment_test.rb
require 'test_helper'

class CommentTest < ActiveSupport::TestCase
  test "creates notification for article author" do
    article = articles(:one)
    author = article.user

    assert_difference 'author.notifications.count', 1 do
      Comment.create!(
        article: article,
        user: users(:commenter),
        body: "Great article!"
      )
    end

    notification = author.notifications.last
    assert_equal 'Comment', notification.notifiable_type
    assert_nil notification.opened_at  # Unopened
  end

  test "groups multiple comments on same article" do
    article = articles(:one)
    author = article.user

    # First comment creates notification
    Comment.create!(
      article: article,
      user: users(:commenter),
      body: "First comment"
    )

    initial_count = author.notifications.count

    # Second comment updates existing notification (grouped)
    Comment.create!(
      article: article,
      user: users(:another_commenter),
      body: "Second comment"
    )

    # Count should be same (grouped)
    assert_equal initial_count, author.notifications.count
  end
end
```

### Best Practices

-   Always define `printable_name` - Makes notifications readable in the UI
-   Always define `notifiable_path` - Enables click-through navigation
-   Use grouping for related notifications - Prevents notification spam
-   Be specific with targets lambda - Only notify relevant users
-   Use parameters for context - Store data needed for display/linking
-   Track only necessary actions - Don't over-notify users
-   Clean up old notifications - Archive or delete periodically
-   Test notification creation - Verify targets and data
-   Consider notification fatigue - Less is more
-   Use meaningful keys - Follow convention like "model.action"

### Troubleshooting

#### Notifications Not Creating

Check:

-   ✅ `config.enabled = true` in initializer
-   ✅ `acts_as_notifiable` configured correctly
-   ✅ targets lambda returns array of users
-   ✅ Action is in tracked list (or manually calling `notify_to`)
-   ✅ Database migration ran successfully

#### Frontend Not Showing Notifications

Check:

-   ✅ User is authenticated (`useUserId()` returns value)
-   ✅ API endpoint permissions correct
-   ✅ Network tab for API errors
-   ✅ NotificationMenu included in layout
-   ✅ React Query devtools for cache status

#### Too Many Notifications

Solutions:

-   Use `group` option to consolidate
-   Adjust `tracked` to limit actions
-   Implement filtering logic in targets lambda
-   Consider digest/summary notifications

#### Performance Issues

Solutions:

-   Add database indexes on `target_id`, `opened_at`, `notifiable_type`
-   Limit query results with `limit` parameter
-   Use `dependent_notifications: :delete_all` for bulk operations
-   Archive old notifications to separate table
-   Use database queries instead of loading all notifications

## Summary

The Rhino Notifications module provides:

✅ **Polymorphic notifications** (any model can notify any target)  
✅ **RESTful JSON API endpoints**  
✅ **React Query hooks and UI components**  
✅ **Notification grouping and consolidation**  
✅ **Read/unread tracking**  
✅ **Custom notification paths and display names**  
✅ **Optional email and real-time support**  
✅ **Subscription management (optional)**  
✅ **Flexible target and parameter configuration**  
✅ **Integration with Rhino's ownership model**  
✅ **One-command installation**

**What you configure manually (same as base gem):**

-   `acts_as_notifiable` on notifiable models
-   targets lambda defining who gets notified
-   group, tracked, parameters options
-   printable_name and notifiable_path methods
-   Notification keys and types

**What Rhino provides automatically:**

-   JSON API endpoints
-   Frontend components and hooks
-   Routing integration
-   Authentication/authorization
-   API-optimized defaults
-   Simplified installation

The system is production-ready and follows Rails/React best practices for maintainability and extensibility.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
