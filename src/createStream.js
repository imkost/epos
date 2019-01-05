function createStream (sourceArray, fn) {
  const stream = createSource(sourceArray.map(fn))
  stream[_isStream_] = true

  watchSourceArray(sourceArray, {
    onSplice (start, removeCount, ...items) {
      items = items.map(i => createSource(fn(i)))
      stream.splice$(start, removeCount, ...items)
    }
  })

  return stream
}
