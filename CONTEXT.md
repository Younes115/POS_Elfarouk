# POS System — Offline Footwear & Bags Store

The domain covering the sale, return, and inventory management of footwear and bag products at a single physical retail location operating offline-first.

## Language

### Sales

**Order**:
A completed sales or return transaction recorded at the point of sale. A single Order groups all items sold or returned in one session.
_Avoid_: Transaction, Sale, Receipt, Bill

**OrderItem**:
A single line on an Order representing one Product at a frozen price and cost. Negative quantities indicate a return of that item.
_Avoid_: Line item, CartItem, Product line

**Receipt Number**:
The human-readable, unique identifier printed on a customer's receipt and assigned to each Order.
_Avoid_: Invoice number, Order number

**Sale**:
An Order of type `SALE`. The normal case: the customer pays for goods.
_Avoid_: Purchase

**Return**:
An Order of type `RETURN`. A complete reversal of a prior Sale where all items are given back. Handled via the `Order.type` flag and negative quantities in `OrderItem`, not a separate model.
_Avoid_: Refund, Cancellation, Exchange

**Discount**:
A fixed monetary amount subtracted from an Order's sub-total. Always a flat value, never a percentage.
_Avoid_: Coupon, Voucher, Promo code

**Offer**:
An optional human-readable label describing why a Discount was applied (e.g., "End of season sale", "Staff discount").
_Avoid_: Promotion, Campaign

### Inventory

**Product**:
A physical item stocked and sold in the store, identified by a unique SKU.
_Avoid_: Item, Goods, Article, SKU (as a synonym for Product)

**SKU**:
The unique machine-readable code that identifies a specific Product variant (e.g., size, color). Not synonymous with Product.
_Avoid_: Barcode (unless it literally is a barcode value), Product code

**Category**:
The broad product classification a Product belongs to (e.g., "SNEAKERS", "HEELS", "BAGS"). Every Product has exactly one Category.
_Avoid_: Type, Kind, Group

**Color**:
An optional visual variant attribute of a Product (e.g., "Black", "Red"). Nullable.
_Avoid_: Shade, Hue

**Size**:
An optional dimensional variant attribute of a Product (e.g., "42", "M"). Nullable because certain categories (Bags) have no meaningful size.
_Avoid_: Dimension, Fit

**Cost Price**:
What the store paid a supplier to acquire one unit of a Product. Used for profit calculation.
_Avoid_: Purchase price, Buy price

**Selling Price**:
The standard retail price at which one unit of a Product is offered to a customer.
_Avoid_: Retail price, Sale price, RRP

**Price at Sale** (`priceAtSale`):
The Selling Price actually charged to the customer for one unit, frozen at the time the OrderItem was created. May differ from the current Selling Price if prices change over time.
_Avoid_: Historical price, Snapshot price

**Cost at Sale** (`costAtSale`):
The Cost Price of one unit, frozen at the time the OrderItem was created. Used to calculate profit on the Order without being affected by future cost changes.
_Avoid_: Historical cost, Snapshot cost

### Finance

**Expense**:
An operational cost incurred by the store that is not a product purchase (e.g., rent, electricity, staff wages). Tracked for daily profitability reporting.
_Avoid_: Cost, Overhead, Bill
