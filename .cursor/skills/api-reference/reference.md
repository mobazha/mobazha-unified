# Mobazha API Complete Reference

## API Endpoints

### Orders (`/v1/order/*`, `/v1/ob/*`)

| Endpoint                 | Method | Description           |
| ------------------------ | ------ | --------------------- |
| `/v1/order/purchase`     | POST   | Create order          |
| `/v1/order/payment`      | POST   | Submit payment        |
| `/v1/order/confirm`      | POST   | Seller confirm order  |
| `/v1/order/fulfill`      | POST   | Seller ship order     |
| `/v1/order/complete`     | POST   | Buyer confirm receipt |
| `/v1/order/cancel`       | POST   | Cancel order          |
| `/v1/order/refund`       | POST   | Refund                |
| `/v1/ob/order/{orderID}` | GET    | Get order detail      |
| `/v1/ob/purchases`       | GET    | Get purchase list     |
| `/v1/ob/sales`           | GET    | Get sales list        |
| `/v1/ob/estimatetotal`   | POST   | Estimate order total  |

### Products (`/v1/ob/*`)

| Endpoint                         | Method | Description                |
| -------------------------------- | ------ | -------------------------- |
| `/v1/ob/listing/{slug}`          | GET    | Get own product detail     |
| `/v1/ob/listing/{peerID}/{slug}` | GET    | Get other's product detail |
| `/v1/ob/listingindex`            | GET    | Get own product index      |
| `/v1/ob/listingindex/{peerID}`   | GET    | Get other's product index  |
| `/v1/ob/listing`                 | POST   | Create/update product      |
| `/v1/ob/listing/{slug}`          | DELETE | Delete product             |

### User/Profile (`/v1/ob/*`)

| Endpoint                  | Method | Description         |
| ------------------------- | ------ | ------------------- |
| `/v1/ob/profile`          | GET    | Get own profile     |
| `/v1/ob/profile`          | POST   | Update profile      |
| `/v1/ob/profile/{peerID}` | GET    | Get other's profile |
| `/v1/ob/avatar`           | POST   | Upload avatar       |
| `/v1/ob/images`           | POST   | Upload images       |

### Cart (`/v1/ob/carts/*`)

| Endpoint                       | Method | Description      |
| ------------------------------ | ------ | ---------------- |
| `/v1/ob/carts`                 | GET    | Get cart         |
| `/v1/ob/carts/{peerID}/add`    | POST   | Add to cart      |
| `/v1/ob/carts/{peerID}/remove` | POST   | Remove from cart |
| `/v1/ob/carts`                 | DELETE | Clear cart       |

### Wallet (`/v1/wallet/*`)

| Endpoint                          | Method | Description            |
| --------------------------------- | ------ | ---------------------- |
| `/v1/wallet/mnemonic`             | GET    | Get mnemonic           |
| `/v1/wallet/spend`                | POST   | Send transaction       |
| `/v1/wallet/receivingaccountlist` | GET    | Get receiving accounts |

## Key Data Structures

### Create Order Request (POST `/v1/order/purchase`)

```go
type Purchase struct {
    ShipTo       string         `json:"shipTo"`
    Address      string         `json:"address"`
    City         string         `json:"city"`
    State        string         `json:"state"`
    PostalCode   string         `json:"postalCode"`
    CountryCode  string         `json:"countryCode"`
    AddressNotes string         `json:"addressNotes"`
    Items        []PurchaseItem `json:"items"`
    PricingCoin  string         `json:"pricingCoin"`
    Moderator    string         `json:"moderator"`
    // Note: no vendorId field! Backend resolves from listingHash
}

type PurchaseItem struct {
    ListingHash      string   `json:"listingHash"`  // CID, not slug!
    Quantity         string   `json:"quantity"`     // String type!
    Options          []Option `json:"options"`
    Shipping         Shipping `json:"shipping"`
    Memo             string   `json:"memo"`
    Coupons          []string `json:"coupons"`
    PaymentAddress   string   `json:"paymentAddress"`
    OptionalFeatures []string `json:"optionalFeatures"`
}
```

### Product Index (GET `/v1/ob/listingindex/{peerID}`)

```go
type ListingMetadata struct {
    CID          string `json:"cid"`          // IPFS CID
    Slug         string `json:"slug"`
    Title        string `json:"title"`
    ContractType string `json:"contractType"` // PHYSICAL_GOOD, DIGITAL_GOOD, SERVICE, RWA_TOKEN
}
```

### Contract Types

```go
PHYSICAL_GOOD  // Physical product — requires shipping address
DIGITAL_GOOD   // Digital product
SERVICE        // Service
RWA_TOKEN      // RWA token
```

## Request Examples

### Create Order (non-physical)

```typescript
const request = {
  items: [
    {
      listingHash: 'QmbB81CKbTqe779Rax7hXXh8HEHQ9BSfxvSSHPDQZLLJYw',
      quantity: '1',
      memo: 'order note',
    },
  ],
  pricingCoin: 'USD',
};
```

### Create Order (physical)

```typescript
const request = {
  items: [
    {
      listingHash: 'QmXxxxx...',
      quantity: '2',
      shipping: { name: 'Standard', service: 'USPS' },
    },
  ],
  shipTo: 'John Doe',
  address: '123 Main Street',
  city: 'San Francisco',
  state: 'CA',
  postalCode: '94102',
  countryCode: 'US',
  pricingCoin: 'USD',
};
```

## Debugging Tips

1. **Check backend expected structure**: Look at `mobazha3.0/pkg/models/*.go` type definitions
2. **API error `json: cannot unmarshal...`**: Type mismatch — check if field should be string/number/object
3. **Get listing CID**: Call `/v1/ob/listingindex/{peerID}`, match by slug to find `cid`
