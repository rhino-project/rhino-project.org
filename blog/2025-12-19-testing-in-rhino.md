---
title: "Testing in Rhino: A Comprehensive Guide"
description: Testing is a critical part of the development process, and Rhino provides a robust testing infrastructure out of the box. This guide covers unit testing, integration testing, and end-to-end testing in Rhino, combining practical insights from real-world development with the framework's built-in testing capabilities.
authors: Ehsan
tags:
    [
        rhino-project,
        webdev,
        ruby,
        rails,
        opensource,
        testing,
        minitest,
        vitest,
        cypress,
        quality-assurance,
    ]
image: https://www.rhino-project.org/img/rhino-red.svg
hide_table_of_contents: false
---

Testing is a critical part of the development process, and Rhino provides a robust testing infrastructure out of the box. This comprehensive guide covers unit testing, integration testing, and end-to-end testing in Rhino, combining practical insights from real-world development with the framework's built-in testing capabilities.

<!-- truncate -->

## Overview of Testing Approaches

Before diving into Rhino-specific testing tools, it's important to understand the different levels of testing and how they work together:

-   **Unit Testing** - Tests individual components in isolation, ensuring each piece works correctly on its own
-   **Integration Testing** - Tests how different parts of the system work together, such as API controllers communicating with business logic
-   **End-to-End (E2E) Testing** - Tests complete user flows from the user's perspective, validating the entire application functionality

The key principle is to test in an isolated, incremental manner during development. Start with unit tests for individual components, then move to integration tests for component interactions, and finally use E2E tests for critical user journeys.

## Backend Testing with Minitest

Rhino uses **Minitest** for all backend testing, which is Rails' default testing framework. Tests are located in the `test` directory and run with parallel workers by default for faster execution.

### Running Tests

All tests can be run with:

```bash
rails test
```

Run a single test file:

```bash
rails test test/models/user_test.rb
```

Run a single test (the number indicates the line number where the test starts):

```bash
rails test test/models/user_test.rb:5
```

By default, tests run with parallel workers. Set the `PARALLEL_WORKERS` environment variable to 1 to run tests serially, which is useful when debugging:

```bash
PARALLEL_WORKERS=1 rails test test/models/user_test.rb
```

### Debugging Tests

The `debugger` gem is included in Rhino. To use it, add a `debugger` statement in your test:

```ruby
require "test_helper"

class CurrencyTest < ActiveSupport::TestCase
  test "currency should be created" do
    debugger
    assert Currency.new(name: "currency", code: "code").valid?
  end
end
```

Then run the tests serially (not in parallel) so the debugger can attach:

```bash
PARALLEL_WORKERS=1 rails test test/models/user_test.rb
```

### Test Data

Rhino supports multiple approaches for generating test data:

#### Rails Fixtures

Rails fixtures are the traditional way to define test data. They're defined in `test/fixtures` and provide a simple way to create baseline data for your tests.

#### FactoryBot and FFaker

Rhino also provides **FactoryBot** in combination with **FFaker** for generating test data. FactoryBot is configured to use the `test/factories` directory.

FactoryBot allows you to define factories that create test objects with realistic data:

```ruby
# test/factories/products.rb
FactoryBot.define do
  factory :product do
    name { FFaker::Product.product_name }
    price { FFaker::Number.decimal }
    description { FFaker::Lorem.paragraph }
  end
end
```

**Tip**: Often models require unique data for attributes. FFaker provides a `unique` method to ensure that the data is unique:

```ruby
name { FFaker::Name.unique.name }
```

This is particularly useful for attributes that have uniqueness constraints.

### Unit Testing with Rhino

Rhino can be used to set up unit testing scaffolding, allowing developers to quickly create mock data and write test cases without needing to set up external resources like databases. This makes it easier to write focused, isolated unit tests.

Here's an example of unit tests for a Product model:

```ruby
require "test_helper"

class ProductTest < ActiveSupport::TestCase
  test "should be valid with valid attributes" do
    product = Product.new(
      name: "Test Product",
      price: 99.99,
      description: "A test product"
    )
    assert product.valid?
  end

  test "should require a name" do
    product = Product.new(price: 99.99)
    assert_not product.valid?
    assert_includes product.errors[:name], "can't be blank"
  end

  test "should require a positive price" do
    product = Product.new(name: "Test", price: -10)
    assert_not product.valid?
    assert_includes product.errors[:price], "must be greater than 0"
  end
end
```

**Best practices for unit tests:**

-   Use descriptive test names that clearly state what is being tested
-   Break down complex tests into smaller, more focused assertions
-   Test one thing at a time
-   Use factories or fixtures to create test data consistently

### Mocking Third-Party APIs

The `webmock` gem is included in Rhino for mocking third-party API calls. This is essential for integration tests that need to test API interactions without making actual HTTP requests.

Here's how to use webmock in your tests:

```ruby
require "test_helper"
require "webmock/minitest"

class CurrencyTest < ActiveSupport::TestCase
  test "should fetch currency data from API" do
    stub_request(:get, "https://api.example.com/customer-id/")
      .to_return(
        status: 200,
        body: { id: 1 }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    uri = URI("https://api.example.com/customer-id/")
    response = Net::HTTP.get_response(uri)
    data = JSON.parse(response.body)

    assert_equal data["id"], 1
  end
end
```

This approach allows you to test API integration logic without depending on external services, making your tests faster and more reliable.

### Integration Testing Examples

Integration tests verify that different parts of your application work together correctly. For example, you might test the communication between API controllers and the underlying business logic.

Here's an example of an integration test:

```ruby
require "test_helper"

class ProductsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @product = products(:one)
    sign_in @user
  end

  test "should get index" do
    get products_url
    assert_response :success
    assert_select "h1", "Products"
  end

  test "should create product" do
    assert_difference("Product.count") do
      post products_url, params: {
        product: {
          name: "New Product",
          price: 49.99,
          description: "A new product"
        }
      }
    end

    assert_redirected_to product_url(Product.last)
  end
end
```

**Key points for integration testing:**

-   Create a test environment that mirrors the production setup
-   Test the interaction between components, not just individual components
-   Use factories or fixtures to set up realistic test scenarios
-   Rhino can help manage this process by providing consistent test infrastructure

## Frontend Testing

### Unit and Component Testing

Rhino uses **Vitest** and **React Testing Library** for unit and component testing on the frontend. This combination follows modern testing best practices that focus on testing behavior rather than implementation details.

The philosophy behind this approach is:

-   **Test behavior, not implementation** - Tests should verify what users see and do, not internal component structure
-   **Resilient to change** - Tests should survive refactoring as long as behavior remains the same
-   **User-centric** - Tests should mirror how users interact with your application

Tests are located in the `app/frontend/__tests__` directory.

#### Running Frontend Tests

All frontend tests can be run with:

```bash
npm test
```

#### Example Component Test

Here's an example of testing a React component with React Testing Library:

```javascript
// app/frontend/__tests__/ProductCard.test.jsx
import { render, screen } from "@testing-library/react";
import { ProductCard } from "../components/ProductCard";

describe("ProductCard", () => {
	it("renders product information", () => {
		const product = {
			id: 1,
			name: "Test Product",
			price: 99.99,
			description: "A test product",
		};

		render(<ProductCard product={product} />);

		expect(screen.getByText("Test Product")).toBeInTheDocument();
		expect(screen.getByText("$99.99")).toBeInTheDocument();
		expect(screen.getByText("A test product")).toBeInTheDocument();
	});

	it("calls onAddToCart when button is clicked", () => {
		const product = { id: 1, name: "Test Product", price: 99.99 };
		const onAddToCart = vi.fn();

		render(<ProductCard product={product} onAddToCart={onAddToCart} />);

		const button = screen.getByRole("button", { name: /add to cart/i });
		button.click();

		expect(onAddToCart).toHaveBeenCalledWith(product);
	});
});
```

**Best practices for component testing:**

-   Use queries that mirror how users find elements (by role, label, text)
-   Test user interactions, not component internals
-   Keep tests focused on a single behavior
-   Use descriptive test descriptions

## End-to-End Testing with Cypress

Rhino uses **Cypress** for end-to-end testing, focusing on critical user flows like login, logout, and sign-up. E2E tests validate the application's functionality from the user's perspective, ensuring that all components work together correctly in a real browser environment.

Tests are located in the `cypress/integration` directory.

### Running Cypress Tests

Cypress can be opened in interactive mode with:

```bash
npm run cypress:open
```

Or all tests can be executed on the command line with:

```bash
npm run cypress:run
```

### Example E2E Test

Here's an example of a Cypress test for a critical user flow:

```javascript
// cypress/integration/auth.spec.js
describe("Authentication", () => {
	it("should allow user to sign up", () => {
		cy.visit("/sign-up");

		cy.get('input[name="email"]').type("test@example.com");
		cy.get('input[name="password"]').type("password123");
		cy.get('input[name="password_confirmation"]').type("password123");
		cy.get('button[type="submit"]').click();

		cy.url().should("include", "/dashboard");
		cy.contains("Welcome").should("be.visible");
	});

	it("should allow user to log in", () => {
		cy.visit("/login");

		cy.get('input[name="email"]').type("user@example.com");
		cy.get('input[name="password"]').type("password123");
		cy.get('button[type="submit"]').click();

		cy.url().should("include", "/dashboard");
		cy.contains("Dashboard").should("be.visible");
	});

	it("should allow user to log out", () => {
		cy.login("user@example.com", "password123");
		cy.visit("/dashboard");

		cy.get('button[aria-label="User menu"]').click();
		cy.contains("Log out").click();

		cy.url().should("include", "/login");
	});
});
```

**Key points for E2E testing:**

-   Focus on critical user flows that must work correctly
-   Test from the user's perspective, not the developer's
-   Keep tests maintainable and avoid brittle selectors
-   Use custom commands for common actions (like `cy.login()`)

### Recording CI Runs

Cypress can be configured to record runs on Cypress Cloud for better visibility into test execution. To enable this:

1.  Set the `CYPRESS_RECORD_KEY` environment variable in your CI environment
2.  Set the `CYPRESS_PROJECT_ID` environment variable
3.  Configure these in your CI platform (e.g., CircleCI → Environment Variables → Project Settings)

This allows you to see test results, screenshots, and videos of test runs directly in Cypress Cloud.

## Testing Best Practices

Based on both the Rhino documentation and real-world development experience, here are some key best practices:

### 1. Test in Isolation

-   Unit tests should test individual components without dependencies
-   Use mocks and stubs to isolate the code under test
-   Avoid testing implementation details

### 2. Use Descriptive Test Names

Test names should clearly describe what is being tested:

```ruby
# Good
test "should require email when creating user"

# Bad
test "user creation"
```

### 3. Follow the Testing Pyramid

-   Many unit tests (fast, isolated)
-   Some integration tests (moderate speed, test interactions)
-   Few E2E tests (slower, test critical flows)

### 4. Keep Tests Fast

-   Use parallel execution when possible
-   Mock external dependencies
-   Avoid unnecessary database operations in unit tests

### 5. Maintain Test Data

-   Use factories for consistent test data
-   Clean up test data between tests
-   Use unique data generators (like FFaker's `unique` method) when needed

### 6. Test Critical Paths

Focus E2E tests on critical user journeys:

-   Authentication flows
-   Core business processes
-   Payment processing
-   Data submission and retrieval

## Next Steps

As you continue to develop your testing strategy in Rhino:

1.  **Explore Rhino's testing capabilities** - Take time to understand the full range of testing tools available in Rhino
2.  **Document your testing approach** - Share your testing patterns and best practices with your team
3.  **Iterate on your test suite** - Regularly review and improve your tests as your application grows

## Conclusion

Rhino provides a comprehensive testing infrastructure that supports the full spectrum of testing needs—from fast unit tests to comprehensive E2E tests. By combining Rhino's built-in tools with best practices and real-world insights, you can build a robust test suite that gives you confidence in your application's quality and reliability.

The key is to start with the fundamentals: write clear, focused tests that verify behavior, use the right tool for each level of testing, and maintain your test suite as your application evolves. With Rhino's testing infrastructure, you have everything you need to build and maintain high-quality applications.

---

_This blog post is part of our ongoing series exploring the Rhino framework's architecture and capabilities. For more information, see the [Rhino Testing Documentation](https://www.rhino-project.org/docs/guides/testing)._
