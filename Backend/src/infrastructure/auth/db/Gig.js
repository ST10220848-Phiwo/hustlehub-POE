import { mongoose } from '../connection.js';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, isPositiveDecimal } from '../config/money.js';

// Centralized so RBAC/authorization checks, gig-status transitions, and any
// UI filter/badge component import the same source of truth instead of
// hard-coding strings, mirroring the pattern used for ROLES in User.js.
export const GIG_STATUSES = ['draft', 'published', 'archived'];
export const PRICING_TYPES = ['fixed', 'hourly'];

const gigSchema = new mongoose.Schema(
  {
    // Owning freelancer. Every mutation use case (edit, publish, archive,
    // delete) MUST verify req.user.id === gig.freelancer (or admin role)
    // server-side before applying changes - this field is the ownership
    // check anchor, not just a display reference.
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A gig must belong to a freelancer'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: 120,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxLength: 4000,
    },
    // Free-text skill tags for search/filter. Kept as a bounded array of
    // short strings rather than a free-text blob so client-side filtering
    // (browsing use case) can match on exact tags.
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20 && arr.every((s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 40),
        message: 'skills must be at most 20 non-empty tags of 40 characters or fewer',
      },
    },
    pricingType: {
      type: String,
      enum: { values: PRICING_TYPES, message: '{VALUE} is not a valid pricing type' },
      required: true,
      default: 'fixed',
    },
    // Decimal128, not Number: floating point IEEE-754 numbers are not exact
    // for currency (0.1 + 0.2 !== 0.3), and this value is what bookings
    // snapshot into Booking.priceAtBooking, so it must round-trip exactly.
    price: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'Price is required'],
      validate: {
        validator: isPositiveDecimal,
        message: 'price must be a positive amount',
      },
    },
    currency: {
      type: String,
      enum: { values: SUPPORTED_CURRENCIES, message: '{VALUE} is not a supported currency' },
      required: true,
      default: DEFAULT_CURRENCY,
    },
    status: {
      type: String,
      enum: { values: GIG_STATUSES, message: '{VALUE} is not a valid gig status' },
      required: true,
      default: 'draft',
    },
    // Separate from `status` on purpose: a freelancer may want to keep a
    // gig publicly listed (status: 'published', visible in search/history)
    // while temporarily not accepting new bookings, without losing the
    // listing's reviews/history the way archiving would imply.
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

gigSchema.index({ freelancer: 1, status: 1 });
// Supports the client-facing "browse gigs" use case filtering to bookable
// listings without a collection scan.
gigSchema.index({ status: 1, isAvailable: 1 });

// Single source of truth for "can this gig currently accept a booking" so
// the booking-creation use case and any UI "Book now" button gating agree.
gigSchema.methods.isBookable = function isBookable() {
  return this.status === 'published' && this.isAvailable === true;
};

export const Gig = mongoose.models.Gig || mongoose.model('Gig', gigSchema);