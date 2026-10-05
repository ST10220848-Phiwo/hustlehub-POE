import { mongoose } from '../connection.js';

// A user can hold more than one marketplace-facing role at once (e.g. post
// gigs as a client AND take bookings as a freelancer). Admin is treated as
// mutually exclusive with the other two roles (see the validator below) so
// platform-administration privileges can't silently ride along with an
// ordinary marketplace account. This is a POE-scoped assumption, not a
// requirement pulled from the brief - revisit if the addendum says
// otherwise.
export const ROLES = ['client', 'freelancer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    // Never store or return the plaintext password. select: false means
    // this field is excluded from query results by default - call
    // `.select('+passwordHash')` explicitly when a login use case needs it.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    // Array, not a single string: a user can be both a client and a
    // freelancer simultaneously. RBAC middleware should check
    // `roles.includes('freelancer')` etc. rather than assuming one role.
    roles: {
      type: [{ type: String, enum: ROLES }],
      required: true,
      default: ['client'],
      validate: [
        {
          validator: (roles) => Array.isArray(roles) && roles.length > 0,
          message: 'At least one role is required',
        },
        {
          validator: (roles) => !(roles.includes('admin') && roles.length > 1),
          message: 'admin cannot be combined with other roles',
        },
      ],
    },
    // Lets an admin disable an account without deleting it (audit trail,
    // reversible). The JWT auth middleware does NOT check this today - it
    // only verifies the token itself - so a disabled user's still-valid
    // token keeps working until it expires. Enforcing isActive requires a
    // DB-backed check layered on top of `authenticate`, not yet built.
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// unique: true above already creates this index; declared explicitly too
// so the intent isn't missed when scanning the schema.
userSchema.index({ email: 1 }, { unique: true });

// Small convenience so callers don't sprinkle `user.roles.includes(...)`
// everywhere - not a security boundary by itself, just readability.
userSchema.methods.hasRole = function hasRole(role) {
  return this.roles.includes(role);
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);