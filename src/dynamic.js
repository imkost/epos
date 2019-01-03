function dynamic (any) {
  if (isFunction(any)) {
    return getComputed(any)
  }

  return createSource(any)
}
