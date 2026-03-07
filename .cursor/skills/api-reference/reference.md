# Mobazha API Complete Reference

## API Endpoints

### Orders (`/v1/orders/*`)

| Endpoint                        | Method | Description           |
| ------------------------------- | ------ | --------------------- |
| `/v1/orders/{orderID}/purchase` | POST   | Create order          |
| `/v1/orders/{orderID}/payment`  | POST   | Submit payment        |
| `/v1/orders/{orderID}/confirm`  | POST   | Seller confirm order  |
| `/v1/orders/{orderID}/fulfill`  | POST   | Seller ship order     |
| `/v1/orders/{orderID}/complete` | POST   | Buyer confirm receipt |
| `/v1/orders/{orderID}/cancel`   | POST   | Cancel order          |
| `/v1/orders/{orderID}/refund`   | POST   | Refund                |
| `/v1/orders/{orderID}`          | GET    | Get order detail      |
| `/v1/purchases`                 | GET    | Get purchase list     |
| `/v1/sales`                     | GET    | Get sales list        |
| `/v1/orders/estimate`           | POST   | Estimate order total  |
| `/v1/orders/checkout-breakdown` | POST   | Checkout breakdown    |

### Products (`/v1/listings/*`)

| Endpoint                        | Method | Description                |
| ------------------------------- | ------ | -------------------------- |
| `/v1/listings/{listingID}`      | GET    | Get product detail         |
| `/v1/listings/{peerID}/{slug}`  | GET    | Get other's product detail |
| `/v1/listings/mine/{slugOrCID}` | GET    | Get own product detail     |
| `/v1/listings/index`            | GET    | Get own product index      |
| `/v1/listings/index/{peerID}`   | GET    | Get other's product index  |
| `/v1/listings`                  | POST   | Create product             |
| `/v1/listings`                  | PUT    | Update product             |
| `/v1/listings/{slug}`           | DELETE | Delete product             |
| `/v1/listings/template`         | GET    | Get listing template       |
| `/v1/listings/import`           | POST   | Import listings            |

### User/Profile (`/v1/profiles/*`)

| Endpoint                              | Method | Description           |
| ------------------------------------- | ------ | --------------------- |
| `/v1/profiles`                        | GET    | Get own profile       |
| `/v1/profiles`                        | POST   | Create profile        |
| `/v1/profiles`                        | PUT    | Update profile        |
| `/v1/profiles/{peerID}`               | GET    | Get other's profile   |
| `/v1/profiles/batch`                  | POST   | Batch fetch profiles  |
| `/v1/profiles/{peerID}/avatar/{size}` | GET    | Get avatar            |
| `/v1/profiles/{peerID}/header/{size}` | GET    | Get header image      |
| `/v1/media/avatar`                    | POST   | Upload avatar         |
| `/v1/media/images`                    | POST   | Upload images         |
| `/v1/media/product-images`            | POST   | Upload product images |
| `/v1/media/images/{imageID}`          | GET    | Get image             |

### Cart (`/v1/carts/*`)

| Endpoint                   | Method | Description      |
| -------------------------- | ------ | ---------------- |
| `/v1/carts`                | GET    | Get cart         |
| `/v1/carts/{peerID}/items` | POST   | Add to cart      |
| `/v1/carts/{peerID}/items` | PUT    | Update cart item |
| `/v1/carts/{peerID}/items` | DELETE | Remove from cart |
| `/v1/carts`                | DELETE | Clear cart       |
| `/v1/carts/count`          | GET    | Get items count  |

### Wallet (`/v1/wallet/*`)

| Endpoint                        | Method | Description            |
| ------------------------------- | ------ | ---------------------- |
| `/v1/wallet/mnemonic`           | GET    | Get mnemonic           |
| `/v1/wallet/spend`              | POST   | Send transaction       |
| `/v1/wallet/receiving-accounts` | GET    | Get receiving accounts |

### Ratings (`/v1/ratings/*`)

| Endpoint                           | Method | Description          |
| ---------------------------------- | ------ | -------------------- |
| `/v1/ratings/index`                | GET    | Get own rating index |
| `/v1/ratings/index/{peerIDOrSlug}` | GET    | Get rating index     |
| `/v1/ratings/{ratingID}`           | GET    | Get single rating    |
| `/v1/ratings/batch`                | POST   | Batch fetch ratings  |

## Key Data Structures

### Create Order Request (POST `/v1/orders/{orderID}/purchase`)

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

### Product Index (GET `/v1/listings/index/{peerID}`)

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
3. **Get listing CID**: Call `/v1/listings/index/{peerID}`, match by slug to find `cid`
