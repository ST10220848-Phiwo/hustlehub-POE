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
// enforces it as a last line of defence even if a service-layer bug skips
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
    // Denormalized from gig.freelancer at creation time (in the application
    // service, not here) so ownership/authorization checks on a booking
    // ("is this user the freelancer for this booking?") don't require a
    // populate() of gig on every request, and so the record stays
    // meaningful even if the gig is later archived or edited.
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

// Enforces the state machine at the model layer as a defence-in-depth
// measure (per project convention: invariants live close to the domain
// model, not only in controllers/services). `changedBy` should be set by
// the calling service via `doc.$locals.changedBy = userId` before save so
// it lands in statusHistory; it is optional to keep this hook framework-
// agnostic.
bookingSchema.pre('validate', async function enforceStatusTransition() {
  if (this.isNew) {
    this.statusHistory = [{ status: this.status, changedAt: new Date(), changedBy: this.$locals?.changedBy }];
    return;
  }

  if (this.isModified('status')) {
    // Mongoose does not expose the pre-mutation value of a field inside a
    // pre-save/pre-validate hook, so the calling service is responsible for
    // recording the status it loaded the document with before mutating it,
    // e.g.: `booking.$locals.previousStatus = booking.status; booking.status = next;`
    // If the caller omits this, the transition check is skipped here and
    // MUST still be performed explicitly in the application service before
    // save() is called - do not rely on this hook alone in that case.
    const previous = this.$locals?.previousStatus;
    if (previous && !Booking.isValidTransition(previous, this.status)) {
      throw new Error(`Invalid booking status transition: ${previous} -> ${this.status}`);
    }
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: this.$locals?.changedBy,
    });
  }
});

export const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);