let get = null

/*******************************************************************************
 *
 * Autorun
 *
 ******************************************************************************/

function autorun (fn) {
  let deps = []
  run()

  return {
    stop
  }

  function run () {
    stop()
    const parentGet = get
    get = handleGet
    fn()
    get = parentGet
  }

  function handleGet (change) {
    change.add(run)
    deps.push(change)
  }

  function stop () {
    for (const change of deps) {
      change.delete(run)
    }
    deps = []
  }
}

/*******************************************************************************
 *
 * Create source
 *
 ******************************************************************************/

function createSource (object) {
  const source = {}

  for (const key in object) {
    const value = object[key]
    const change = new Set()

    if (isObject(value)) {
      source[key] = createSource(value)
    } else {
      source[key] = value
    }

    Object.defineProperty(source, `${key}$`, {
      get () {
        if (get) {
          get(change)
        }
        return source[key]
      },

      set (newValue) {
        if (source[key] !== newValue) {
          source[key] = newValue
          for (const fn of Array.from(change)) {
            fn()
          }
        }
        return true
      }
    })

    // For debug
    Object.defineProperty(source, `${key}$changeHandlers`, {
      get () {
        return changeHandlers
      }
    })
  }

  return source
}

/*******************************************************************************
 *
 * Render
 *
 ******************************************************************************/

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
        if (isFunction(value)) {
          autorun(() => {
            setAttributeSafe(root, key, value())
          })
        } else {
          setAttributeSafe(root, key, value)
        }
      }
    }

    const children = alwaysArray(render(template.inner))
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  if (isFunction(template)) {
    // ???
  }

  return document.createTextNode('')
}

function setAttributeSafe (elem, attrName, attrValue) {
  if (isStringOrNumber(attrValue)) {
    elem.setAttribute(attrName, attrValue)
  } else {
    elem.removeAttribute(attrName)
  }
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

function isFunction (any) {
  return typeof any === 'function'
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
