---
title: "Synthetic Attributes in Rhino"
description: Synthetic attributes are one of Rhino's most powerful yet underutilized features, allowing you to create computed properties that enhance your API responses without cluttering your database. This comprehensive guide explores how to implement synthetic attributes in a real-world blog application, demonstrating their practical benefits and advanced usage patterns.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        api,
        attributes,
        computed-properties,
        optimization,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Synthetic attributes are one of Rhino's most powerful yet underutilized features, allowing you to create computed properties that enhance your API responses without cluttering your database. In this comprehensive guide, we'll explore how to implement synthetic attributes in a real-world blog application, demonstrating their practical benefits and advanced usage patterns.

<!-- truncate -->

## What Are Synthetic Attributes?

Synthetic attributes are computed properties that don't exist in your database but are calculated on-the-fly and included in your API responses. They're perfect for derived data, analytics, and computed fields that would be expensive to store or frequently change.

Unlike regular database columns, synthetic attributes are:

-   **Computed dynamically** - calculated each time they're accessed
-   **Read-only** - cannot be set directly through the API
-   **Context-aware** - can access related models and associations
-   **Type-safe** - declared with specific data types for proper serialization

## Building Our Blog Application

Let's start by setting up a complete blog application with three core models: Category, Blog, and BlogPost. This will give us a rich foundation to demonstrate various synthetic attribute patterns.

### The Data Model

Our blog application follows a straightforward hierarchy:

```ruby
# Category Model
class Category < ApplicationRecord
  has_many :blogs, dependent: :destroy

  rhino_owner_global

  validates :name, presence: true
end

# Blog Model
class Blog < ApplicationRecord
  belongs_to :user
  belongs_to :category
  has_many :blog_posts, dependent: :destroy

  rhino_owner_base
  rhino_references [:user, :category]

  validates :title, presence: true
end

# BlogPost Model
class BlogPost < ApplicationRecord
  belongs_to :blog

  rhino_owner :blog
  rhino_references [:blog]

  validates :title, presence: true
  validates :body, presence: true
end
```

## Implementing Synthetic Attributes

Now let's add synthetic attributes to each model, demonstrating different use cases and patterns.

### Blog Model: Analytics and Metrics

The Blog model is perfect for demonstrating analytics-focused synthetic attributes:

```ruby
class Blog < ApplicationRecord
  belongs_to :user
  belongs_to :category
  has_many :blog_posts, dependent: :destroy

  rhino_owner_base
  rhino_references [:user, :category]

  validates :title, presence: true

  # Synthetic attributes
  attribute :word_count, :integer
  attribute :reading_time_minutes, :integer
  attribute :is_recent, :boolean

  # Calculate total word count across all blog posts
  def word_count
    blog_posts.sum { |post| post.body.split(/\s+/).count }
  end

  # Calculate estimated reading time (average 200 words per minute)
  def reading_time_minutes
    (word_count / 200.0).ceil
  end

  # Check if blog was published recently (within last 30 days)
  def is_recent
    return false unless published_at

    published_at > 30.days.ago
  end

  # Property restrictions for synthetic attributes
  rhino_properties_create except: [:word_count, :reading_time_minutes, :is_recent]
  rhino_properties_update except: [:word_count, :reading_time_minutes, :is_recent]
end
```

### BlogPost Model: Content Analysis

Individual blog posts benefit from content-focused synthetic attributes:

```ruby
class BlogPost < ApplicationRecord
  belongs_to :blog

  rhino_owner :blog
  rhino_references [:blog]

  validates :title, presence: true
  validates :body, presence: true

  # Synthetic attributes
  attribute :word_count, :integer
  attribute :reading_time_minutes, :integer
  attribute :excerpt, :string
  attribute :is_long_post, :boolean

  # Calculate word count for this post
  def word_count
    body.split(/\s+/).count
  end

  # Calculate estimated reading time (average 200 words per minute)
  def reading_time_minutes
    (word_count / 200.0).ceil
  end

  # Generate excerpt (first 150 characters)
  def excerpt
    body.truncate(150, separator: ' ')
  end

  # Check if post is considered "long" (over 1000 words)
  def is_long_post
    word_count > 1000
  end

  # Property restrictions for synthetic attributes
  rhino_properties_create except: [:word_count, :reading_time_minutes, :excerpt, :is_long_post]
  rhino_properties_update except: [:word_count, :reading_time_minutes, :excerpt, :is_long_post]
end
```

### Category Model: Statistical Insights

Categories can provide valuable statistical information:

```ruby
class Category < ApplicationRecord
  has_many :blogs, dependent: :destroy

  rhino_owner_global

  validates :name, presence: true

  # Synthetic attributes
  attribute :blog_count, :integer
  attribute :total_posts, :integer
  attribute :is_popular, :boolean

  # Count blogs in this category
  def blog_count
    blogs.count
  end

  # Count total blog posts across all blogs in this category
  def total_posts
    blogs.joins(:blog_posts).count
  end

  # Check if category is popular (has more than 5 blogs)
  def is_popular
    blog_count > 5
  end

  # Property restrictions for synthetic attributes
  rhino_properties_create except: [:blog_count, :total_posts, :is_popular]
  rhino_properties_update except: [:blog_count, :total_posts, :is_popular]
end
```

## API Response in Action

With these synthetic attributes implemented, our API responses become incredibly rich. Here's what a blog response looks like:

```json
{
	"id": 1,
	"title": "My Amazing Blog",
	"published_at": "2025-01-13T04:00:00.000Z",
	"created_at": "2025-01-13T17:44:49.893Z",
	"updated_at": "2025-01-13T17:44:49.893Z",
	"word_count": 1250,
	"reading_time_minutes": 7,
	"is_recent": true,
	"user": {
		"id": 1,
		"name": "John Doe",
		"email": "john@example.com",
		"display_name": "John Doe"
	},
	"category": {
		"id": 1,
		"name": "Technology",
		"blog_count": 3,
		"total_posts": 15,
		"is_popular": true,
		"display_name": "Technology"
	},
	"display_name": "My Amazing Blog",
	"can_current_user_edit": true,
	"can_current_user_destroy": true
}
```

## Advanced Patterns and Best Practices

### 1. Performance Optimization

For expensive calculations, consider caching:

```ruby
class Blog < ApplicationRecord
  attribute :expensive_calculation, :integer

  def expensive_calculation
    Rails.cache.fetch("blog_#{id}_expensive_calc", expires_in: 1.hour) do
      # Your expensive calculation here
      perform_heavy_computation
    end
  end
end
```

### 2. Conditional Attributes

You can make synthetic attributes conditional based on user permissions or other factors:

```ruby
class BlogPost < ApplicationRecord
  attribute :analytics_data, :json

  def analytics_data
    return nil unless current_user&.admin?

    {
      views: view_count,
      engagement: engagement_score,
      trending: trending_score
    }
  end
end
```

### 3. Type Safety and Validation

Always declare your attribute types for proper serialization:

```ruby
class Blog < ApplicationRecord
  # Good: explicit type declaration
  attribute :word_count, :integer
  attribute :reading_time_minutes, :integer
  attribute :is_recent, :boolean
  attribute :metadata, :json
end
```

## Property Restrictions: Keeping Synthetic Attributes Read-Only

One of the most important aspects of synthetic attributes is ensuring they remain read-only. Rhino provides powerful property restriction methods:

```ruby
# Exclude from create and update operations
rhino_properties_create except: [:word_count, :reading_time_minutes, :is_recent]
rhino_properties_update except: [:word_count, :reading_time_minutes, :is_recent]

# Or be more specific about what's allowed
rhino_properties_create only: [:title, :body, :published]
rhino_properties_update only: [:title, :body, :published]
```

## Real-World Use Cases

Synthetic attributes shine in several scenarios:

### 1. **Analytics and Metrics**

-   User engagement scores
-   Content performance metrics
-   Reading time estimates
-   Popularity indicators

### 2. **Content Processing**

-   Word counts and readability scores
-   Auto-generated excerpts
-   Content summaries
-   Tag suggestions

### 3. **Business Logic**

-   Status calculations
-   Permission checks
-   Workflow states
-   Conditional data display

### 4. **User Experience**

-   Display names and labels
-   Formatted data (currency, dates)
-   Progress indicators
-   Status messages

## Conclusion

Synthetic attributes in Rhino provide a powerful way to enhance your API responses with computed data without cluttering your database schema. By following the patterns demonstrated in this guide, you can create rich, dynamic APIs that provide valuable insights to your frontend applications.

The key is to remember that synthetic attributes should be:

-   **Computed efficiently** - avoid expensive operations
-   **Properly typed** - declare attribute types
-   **Read-only** - use property restrictions
-   **Meaningful** - provide real value to your API consumers

With these principles in mind, synthetic attributes can transform your Rhino applications from simple CRUD APIs into intelligent, data-rich interfaces that delight your users.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities._
