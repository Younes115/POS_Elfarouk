# Returns are modelled as inverted Orders, not a separate entity

The system must support product returns. Two common approaches exist: a dedicated `Return` model linked back to the original `Order`, or re-using the `Order` model with a `type` discriminator and negative `OrderItem.quantity` values.

We chose the second approach. A Return is an `Order` of type `RETURN` where each `OrderItem` carries a negative quantity (e.g., quantity `-2` means two units are being returned). The same `priceAtSale` and `costAtSale` fields on the line item allow the same profit-reporting queries to work identically for both directions.

**Rejected alternative:** A separate `Return` model with a `returnedOrderId` foreign key. This was rejected because it doubles the query surface for reports (every profit/loss query would need a UNION or JOIN across two tables), complicates the schema for a single-location offline store where full-order returns dominate, and adds a referential integrity constraint that breaks when the original Order is deleted.

**Consequence:** Any query filtering for sales only must include `WHERE type = 'SALE'`. This is non-obvious and must be documented at the query layer.
