function watchSourceArray (sourceArray, { onAdd, onRemove }) {
  if (sourceArray[_itemAdd_]) {
    sourceArray[_itemAdd_].add(onAdd)
    sourceArray[_itemRemove_].add(onRemove)

    if (curAutorun) {
      curAutorun.children.push({
        stop () {
          sourceArray[_itemAdd_].delete(onAdd)
          sourceArray[_itemRemove_].delete(onRemove)
        }
      })
    }
  }
}
