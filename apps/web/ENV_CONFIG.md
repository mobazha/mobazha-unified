# Environment Configuration

## Data Source Switch

The application supports switching between **Mock Data** and **Real API** mode.

### Methods to Switch

#### 1. Environment Variable (Build-time)

Create a `.env.local` file:

```bash
# Use mock data (default for development)
NEXT_PUBLIC_USE_MOCK_DATA=true

# Use real API
NEXT_PUBLIC_USE_MOCK_DATA=false
```

#### 2. DevTools Panel (Runtime)

In development mode, a floating button appears in the bottom-right corner:

- 🎭 = Mock Mode (amber color)
- 🔗 = API Mode (green color)

Click to expand the panel and toggle between modes.

#### 3. Programmatic Control

```typescript
import { enableMockData, disableMockData, toggleMockData, useMockData } from '@mobazha/core';

// Check current mode
if (useMockData()) {
  console.log('Using mock data');
}

// Switch modes
enableMockData(); // Use mock data
disableMockData(); // Use real API
toggleMockData(); // Toggle current mode
```

#### 4. React Hook

```typescript
import { useConfig } from '@mobazha/core';

function MyComponent() {
  const { isMockMode, toggleMock } = useConfig();

  return (
    <button onClick={toggleMock}>
      {isMockMode ? 'Switch to API' : 'Switch to Mock'}
    </button>
  );
}
```

## Environment Variables

| Variable                        | Description                       | Default                 |
| ------------------------------- | --------------------------------- | ----------------------- |
| `NEXT_PUBLIC_USE_MOCK_DATA`     | Use mock data instead of real API | `true`                  |
| `NEXT_PUBLIC_API_URL`           | Backend API URL                   | `http://localhost:5000` |
| `NEXT_PUBLIC_MATRIX_HOMESERVER` | Matrix server for chat            | `https://matrix.org`    |
| `NEXT_PUBLIC_ETHERSCAN_API_KEY` | Optional public Etherscan key     | unset                   |

`NEXT_PUBLIC_ETHERSCAN_API_KEY` is embedded in browser assets. Treat it as a
rate-limited public identifier, not as a secret credential. Prefer a backend
proxy for deployments that require a private explorer credential.

## Using the Unified Data Service

Instead of importing mock data directly, use the unified data service:

```typescript
import {
  productDataService,
  orderDataService,
  profileDataService,
  walletDataService,
  searchDataService,
} from '@mobazha/core';

// These automatically use mock or real API based on config
const products = await productDataService.getProducts();
const orders = await orderDataService.getOrders();
const profile = await profileDataService.getCurrentUser();
```
