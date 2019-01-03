function callFns (fns, ...args) {
  if (!fns) {
    return
  }

  if (curTransaction) {
    curTransaction.afterEnd.push(call)
  } else {
    call()
  }

  function call () {
    for (const fn of Array.from(fns)) {
      fn(...args)
    }
  }
}
