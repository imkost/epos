function render (template) {
  if (isStringOrNumber(template)) {
    return document.createTextNode(template)
  }

  if (isArray(template)) {
    return flatten(template).map(render)
  }

  if (isObject(template)) {
    const tag = template.tag || 'div'
    const root = document.createElement(tag)

    for (const key in template) {
      if (key !== 'tag' && key !== 'inner') {
        const value = template[key]
        if (isStringOrNumber(value)) {
          root.setAttribute(key, value)
        }
      }
    }

    const children = alwaysArray(render(template.inner))
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  return document.createTextNode('')
}

/*******************************************************************************
 *
 * Helpers
 *
 ******************************************************************************/

function isObject (any) {
  return Object.prototype.toString.call(any) === '[object Object]'
}

function isArray (any) {
  return Array.isArray(any)
}

function isStringOrNumber (any) {
  return typeof any === 'string' || typeof any === 'number'
}

function alwaysArray (any) {
  return isArray(any) ? any : [any]
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
