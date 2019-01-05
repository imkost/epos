function isStringOrNumber (any) {
  return typeof any === 'string' || typeof any === 'number'
}

function isFunction (any) {
  return typeof any === 'function'
}

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function isArray (any) {
  return Array.isArray(any) && !any[_isStream_]
}

function isStream (any) {
  return any && any[_isStream_]
}

function toFlatArray (any) {
  return isArray(any) ? flatten(any) : [any]
}

function flatten (array) {
  let flat = []
  for (const item of array) {
    if (isArray(item)) {
      flat = flat.concat(flatten(item))
    } else {
      flat.push(item)
    }
  }
  return flat
}
