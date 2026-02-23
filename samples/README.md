# ClawScript Sample Scripts

A collection of example ClawScript programs demonstrating various features and use cases.

## Samples Overview

| File | Description | Features Demonstrated |
|------|-------------|---------------------|
| `social-network.claw` | Social networking data model | Objects, arrays, CRUD, filtering, sorting |
| `task-manager.claw` | Project/Task management | Kanban boards, tagging, comments, stats |
| `ecommerce.claw` | Shopping cart system | Products, cart, coupons, orders, checkout |
| `data-processing.claw` | Data analytics engine | Statistics, aggregation, correlation, reporting |
| `chat-messaging.claw` | Chat/Messaging system | Real-time messaging, threads, reactions, notifications |
| `api-client.claw` | REST API client library | HTTP requests, CRUD, pagination (requires `http` addon) |
| `adventure-game.claw` | Text adventure game | Game engine, combat, inventory, quests, leveling |

## Quick Start

### Running Samples

```bash
# Start ClawShell
clawshell

# Load and run a sample
clawshell> run samples/social-network.claw

# Or execute directly
clawshell> load var x = 5; print(x * 2)
```

### Using Addons

Some samples require addons. Enable in your config:

```json
{
  "clawscript": {
    "addons": ["http", "crypto", "regex", "uuid", "base64", "time", "validation", "collection"],
    "allowNetwork": true
  }
}
```

## Sample Details

### Social Network (`social-network.claw`)

A complete social networking system with:
- User profiles and relationships
- Posts, comments, likes
- Feed generation and trending
- Search functionality

**Key Functions:**
- `createUser()`, `createPost()`, `createComment()`
- `follow()`, `unfollow()`
- `likePost()`, `addComment()`
- `getFeed()`, `getTrendingPosts()`, `searchUsers()`

### Task Manager (`task-manager.claw`)

Project management with kanban-style boards:
- Tasks with priorities, assignees, due dates
- Subtasks and completion tracking
- Team statistics
- Filtering and sorting

**Key Functions:**
- `createTask()`, `updateStatus()`, `assignTask()`
- `addTag()`, `addSubtask()`, `getCompletion()`
- `filterByStatus()`, `filterByPriority()`, `filterOverdue()`
- `getBoardView()`, `getTeamStats()`

### E-Commerce (`ecommerce.claw`)

Shopping cart and order management:
- Product catalog
- Cart operations
- Coupon codes
- Order processing

**Key Functions:**
- `createProduct()`, `createCart()`, `addToCart()`
- `applyCoupon()`, `calculateDiscount()`, `calculateTotal()`
- `createOrder()`, `formatOrder()`

### Data Processing (`data-processing.claw`)

Analytics and statistical analysis:
- Data transformation (map, filter, reduce)
- Grouping and sorting
- Statistical functions
- Reporting

**Key Functions:**
- `groupBy()`, `sortBy()`, `unique()`
- `sum()`, `avg()`, `median()`, `stdDev()`
- `percentile()`, `quartiles()`
- `correlation()`, `movingAverage()`

### Chat/Messaging (`chat-messaging.claw`)

Real-time messaging simulation:
- Chat rooms and direct messages
- Threads and replies
- Reactions
- Notifications
- Unread counts

**Key Functions:**
- `createRoom()`, `sendMessage()`, `replyToMessage()`
- `addReaction()`, `pinMessage()`
- `searchMessages()`, `getThread()`

### API Client (`api-client.claw`)

REST API client library:
- HTTP methods (GET, POST, PUT, PATCH, DELETE)
- CRUD operations
- Pagination
- Error handling

**Note:** Requires `http` addon and `allowNetwork: true`

**Key Functions:**
- `createClient()`, `get()`, `post()`, `put()`, `patch()`, `del()`
- `createCrud()` - Generic CRUD for any resource

### Adventure Game (`adventure-game.claw`)

Text-based RPG game engine:
- Player creation and leveling
- Combat system
- Inventory and equipment
- Quests
- Exploration

**Key Functions:**
- `createPlayer()`, `createItem()`, `createEnemy()`, `createLocation()`
- `equipItem()`, `usePotion()`, `startCombat()`
- `gainExperience()`, `acceptQuest()`, `checkQuestCompletion()`
- `movePlayer()`

## Creating Your Own Scripts

### Basic Structure

```clawscript
// Define functions
function greet(name) {
  return "Hello, " + name;
}

// Use built-ins
var message = greet("World");
print(message);

// Work with data
var numbers = [1, 2, 3, 4, 5];
var sum = 0;
for (var i = 0; i < len(numbers); i = i + 1) {
  sum = sum + numbers[i];
}
print("Sum: " + sum);
```

### Using Objects

```clawscript
var user = {
  name: "John",
  age: 30,
  email: "john@example.com"
};

print(user.name);
user.age = 31;
```

### Error Handling

```clawscript
try {
  var result = riskyOperation();
} catch (e) {
  print("Error: " + e);
} finally {
  print("Done");
}
```

## Addon Examples

### Using Crypto

```clawscript
// Requires addons: ["crypto"]
var hash = Crypto.sha256("password");
var uuid = UUID.v4();
```

### Using HTTP

```clawscript
// Requires addons: ["http"], allowNetwork: true
var response = Http.get("https://api.example.com/data");
print(response.body);
```

### Using Validation

```clawscript
// Requires addons: ["validation"]
var isEmail = Validate.email("test@example.com");
var isUrl = Validate.url("https://example.com");
```

## Performance Tips

1. **Avoid deep recursion** - Use loops instead
2. **Limit array operations** - Use built-in methods when possible
3. **Set timeouts** - Default is 5 seconds for long operations
4. **Use indices** - For repeated lookups, cache array indices

## Contributing Samples

To contribute new samples:
1. Create a `.claw` file in this directory
2. Include comments explaining features
3. Add entry to this README
4. Test with `clawshell> run samples/your-file.claw`
