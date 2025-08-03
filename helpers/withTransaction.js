const mongoose = require('mongoose');

function withTransaction(handler) {
  return mongoose.startSession()
    .then(async (session) => {
      let result;

      try {
        await session.withTransaction(async () => {
          result = await handler(session);  // pass session to the handler
        });

        return result;
      } catch (err) {
        console.error('Transaction failed:', err);
        throw err;
      } finally {
        session.endSession();
      }
    });
}

module.exports = withTransaction;