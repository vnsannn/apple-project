// Overdue bookkeeping helper.
//
// The schema persists an `overdue` boolean on a Transaction, but nothing ever
// computed it. Callers (the transaction list, a borrower's history) call
// refreshOverdue() before reading so the flag is accurate as soon as a
// dashboard needs it. Idempotent and cheap: only touches currently-open loans
// (returnedAt IS NULL) that are past their due date.

const prisma = require("../config/prisma");

async function refreshOverdue() {
  await prisma.transaction.updateMany({
    where: {
      returnedAt: null,
      dueDate: { lt: new Date() },
      overdue: false,
    },
    data: { overdue: true },
  });
}

module.exports = { refreshOverdue };
