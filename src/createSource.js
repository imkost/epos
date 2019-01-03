function createSource (any, parentChange) {
  if (isObject(any)) {
    return createSourceObject(any)
  }

  if (isArray(any)) {
    return createSourceArray(any, parentChange)
  }

  return any
}
