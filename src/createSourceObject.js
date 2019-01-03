function createSourceObject (object) {
  const source = {}
  source[_change_] = {}

  for (const key in object) {
    const value = object[key]
    const change = new Set()
    source[_change_][key] = change

    source[key] = createSource(value, change)

    Object.defineProperty(source, `${key}$`, {
      get () {
        if (curGet) {
          curGet(change)
        }
        return source[key]
      },

      set (newValue) {
        if (source[key] !== newValue) {
          source[key] = createSource(newValue, change)
          callFns(change)
        }
        return true
      }
    })
  }

  return source
}
