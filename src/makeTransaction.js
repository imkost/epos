function makeTransaction (fn) {
  const parentTransaction = curTransaction
  curTransaction = { afterEnd: [] }
  fn()
  for (const callback of curTransaction.afterEnd) {
    callback()
  }
  curTransaction = parentTransaction
}
