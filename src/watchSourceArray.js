function watchSourceArray (sourceArray, { onSplice }) {
  if (sourceArray[_splice_]) {
    sourceArray[_splice_].add(onSplice)

    if (curComputation) {
      curComputation.children.push({
        stop () {
          sourceArray[_splice_].delete(onSplice)
        }
      })
    }
  }
}
