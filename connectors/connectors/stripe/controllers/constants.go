package stripecontrollers

import "time"

// defaultValidationTimeout caps the live round-trip to Stripe from the
// configuration-validation endpoint. Short because the validate call
// is synchronous from the console — users shouldn't wait minutes for
// "is this key valid?".
const defaultValidationTimeout = 15 * time.Second
