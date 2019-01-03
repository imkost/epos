function createStream (sourceArray, fn) {
  const stream = createSource(sourceArray.map(fn))
  stream[_isStream_] = true

  watchSourceArray(sourceArray, {
    onAdd (index, item) {
      stream.splice$(index, 0, createSource(fn(item)))
    },

    onRemove (index) {
      stream.splice$(index, 1)
    }
  })

  return stream
}
