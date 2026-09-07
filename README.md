# hustlehub-POE
A repository hosting the various versions of the HustleHub+ project for the INSY7314 POE submission. 

# Application layer

Use cases / services that orchestrate domain objects and infrastructure
(repositories, hashing, token issuance) behind interfaces, so they can be
unit-tested with fakes instead of a real database.

Convention: one file per use case (e.g. `registerUser.js`,
`createBooking.js`, `computeEstimatedTax.js`), each exporting a function
that takes its dependencies as arguments (dependency injection) rather than
importing infrastructure singletons directly.