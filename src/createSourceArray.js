function createSourceArray (array, parentChange) {
  const source = array.map(i => createSource(i))
  source[_splice_] = new Set()

  Object.defineProperties(source, {
    pop$: { get: () => pop$ },
    push$: { get: () => push$ },
    shift$: { get: () => shift$ },
    unshift$: { get: () => unshift$ },
    splice$: { get: () => splice$ },
    map$: { get: () => map$ }
  })

  return source

  function pop$ () {
    const removed = splice$(source.length - 1, 1)
    return removed[0]
  }

  function push$ (item) {
    splice$(source.length, 0, item)
    return source.length
  }

  function shift$ () {
    const removed = splice$(0, 1)
    return removed[0]
  }

  function unshift$ (item) {
    splice$(0, 0, item)
    return source.length
  }

  function splice$ (...args) {
    const removedItems = source.splice(...args)
    callFns(source[_splice_], ...args)
    return removedItems
  }

  function map$ (fn) {
    return createStream(source, fn)
  }
}
