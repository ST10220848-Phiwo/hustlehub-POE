import { mongoose } from '../connection.js';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES, isPositiveDecimal } from '../config/money.js';

export const BOOKING_STATUSES = [
  'requested',
  'accepted',
  'declined',
  'in_progress',
  'completed',
  'cancelled',
];

// Explicit allow-list of status transitions, keyed by current status. This
// is the single source of truth for what state changes are legal - the
// booking application service should call Booking.isValidTransition(...)
// rather than re-implementing this map, and the pre-validate hook below
// enforces it as a last line of defense even if a service-layer bug skips
// the check. Anything not listed here is rejected.

const BOOKING_TRANSITIONS = {
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // terminal
  declined: [], // terminal
  cancelled: [], // terminal
};

const bookingSchema = new mongoose.Schema(
  {
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: [true, 'A booking must reference a gig'],
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A booking must reference the requesting client'],
      index: true,
    },
   
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A booking must reference the owning freelancer'],
      index: true,
    },
    // Snapshot of Gig.price at the moment of booking. Gigs can change price
    // after a booking exists; the booking (and any transaction derived from
    // it) must keep charging the price the client agreed to, not whatever
    // the gig currently lists. Never recompute this from the live gig.
    priceAtBooking: {
      type: mongoose.Schema.Types.Decimal128,
      required: [true, 'priceAtBooking is required'],
      validate: {
        validator: isPositiveDecimal,
        message: 'priceAtBooking must be a positive amount',
      },
      immutable: true,
    },
    currency: {
      type: String,
      enum: { values: SUPPORTED_CURRENCIES, message: '{VALUE} is not a supported currency' },
      required: true,
      default: DEFAULT_CURRENCY,
      immutable: true,
    },
    status: {
      type: String,
      enum: { values: BOOKING_STATUSES, message: '{VALUE} is not a valid booking status' },
      required: true,
      default: 'requested',
    },
    // Append-only audit trail of status changes. Populated by the pre-save
    // hook below, not by callers, so it can't be spoofed or skipped.
    statusHistory: {
      type: [
        {
          status: { type: String, enum: BOOKING_STATUSES, required: true },
          changedAt: { type: Date, required: true, default: Date.now },
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      default: [],
    },
    requirements: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    scheduledStart: { type: Date },
    scheduledEnd: { type: Date },
    
    // Set by the application service from a client-supplied idempotency
    // token (e.g. an Idempotency-Key header) to make double-submit of the
    // same booking request (double-click, retry after timeout) safe. Sparse
    // so bookings created without one don't collide on `null`.
    idempotencyKey: {
      type: String,
      trim: true,
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

bookingSchema.index({ client: 1, status: 1 });
bookingSchema.index({ freelancer: 1, status: 1 });
bookingSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

bookingSchema.statics.isValidTransition = function isValidTransition(fromStatus, toStatus) {
  return Array.isArray(BOOKING_TRANSITIONS[fromStatus]) && BOOKING_TRANSITIONS[fromStatus].includes(toStatus);
};

//Runs whenever a booking is loaded from MongoDb
bookingSchema.post('init', function rememberLoadedStatus() {
  this.$locals.loadedStatus = this.status;
});

bookingSchema.pre('validate', function enforceStatusTransition() {
  if (this.isNew) {
    this.statusHistory = [
      {
        status: this.status,
        changedAt: new Date(),
        changedBy: this.$locals.changedBy ?? null,
      },
    ];
    return;
  }

  if (!this.isModified('status')) return;

  const previous = this.$locals.loadedStatus;
  if (!previous || !this.constructor.isValidTransition(previous, this.status)) {
    this.invalidate(
      'status',
      `Cannot change booking status from "${previous ?? 'unknown'}" to "${this.status}".`
    );
    return;
  }

  this.statusHistory.push({
    status: this.status,
    changedAt: new Date(),
    changedBy: this.$locals.changedBy ?? null,
  });
  this.$locals.loadedStatus = this.status; // allows a further valid transition on the same document
});

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);