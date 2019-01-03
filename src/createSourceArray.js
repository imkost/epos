function createSourceArray (array, parentChange) {
  const source = array.map(i => createSource(i, parentChange))
  source[_splice_] = new Set()
  // source[_itemAdd_] = new Set()
  // source[_itemRemove_] = new Set()

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
    splice$(source.length, item)
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

function sourceArrayAdd (source, index, item) {
  item = createSource(item)
  source.splice(index, 0, item)
  callFns(source[_itemAdd_], index, item)
}

function sourceArrayRemove (source, index) {
  if (index in source) {
    source.splice(index, 1)
    callFns(source[_itemRemove_], index)
  }
}





// if (start < 0) {
//   start = source.length - start
// } else if (start >= source.length) {
//   start = source.length
// }

// removeCount = Math.min(source.length - start, removeCount)
