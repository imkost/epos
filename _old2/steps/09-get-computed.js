window.Epos = {
  getComputed,
  createSource,
  createAutorun,
  createStandaloneAutorun,
  createEventListener,
  render
}

let curGet = null
let curAutorun = null
const computedSources = new Map()

function EposSource (fields) {
  Object.assign(this, fields)
}

function EposAutorun (fields) {
  Object.assign(this, fields)
}

function EposEventListener (fields) {
  Object.assign(this, fields)
}

function createAutorun (fn) {
  let deps = []
  const autorun = new EposAutorun({
    stop,
    children: []
  })

  if (curAutorun) {
    curAutorun.children.push(autorun)
  }

  run()

  return autorun

  function run () {
    stop()

    const parentGet = curGet
    const parentAutorun = curAutorun
    curGet = get
    curAutorun = autorun
    fn()
    curGet = parentGet
    curAutorun = parentAutorun
  }

  function get (change) {
    change.add(run)
    deps.push(change)
  }

  function stop () {
    for (const child of autorun.children) {
      child.stop()
    }
    autorun.children = []

    for (const change of deps) {
      change.delete(run)
    }
    deps = []
  }
}

function createStandaloneAutorun (fn) {
  const parentAutorun = curAutorun
  curAutorun = null
  createAutorun(fn)
  curAutorun = parentAutorun
}

function createSource (object) {
  const source = new EposSource({})

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
        if (curGet) {
          curGet(change)
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
    Object.defineProperty(source, `${key}$change`, {
      get () {
        return change
      }
    })
  }

  return source
}

function render (template) {
  if (isStringOrNumber(template)) {
    return document.createTextNode(template)
  }

  if (isArray(template)) {
    return toFlatArray(template.map(render))
  }

  if (isObject(template)) {
    const tag = template.tag || 'div'
    const root = document.createElement(tag)

    for (const key in template) {
      if (key !== 'tag' && key !== 'inner') {
        const value = template[key]
        if (isFunction(value)) {
          createAutorun(() => {
            setAttributeSafe(root, key, value())
          })
        } else {
          setAttributeSafe(root, key, value)
        }
      }
    }

    const children = toFlatArray(render(template.inner))
    for (const child of children) {
      root.appendChild(child)
    }

    return root
  }

  if (isFunction(template)) {
    let prevNodes = []

    createAutorun(() => {
      const fragment = document.createDocumentFragment()
      const newNodes = toFlatArray(render(template()))
      for (const newNode of newNodes) {
        fragment.appendChild(newNode)
      }

      if (prevNodes.length) {
        prevNodes[0].parentNode.insertBefore(fragment, prevNodes[0])
      }

      for (const prevNode of prevNodes) {
        prevNode.remove()
      }

      prevNodes = newNodes
    })

    return prevNodes
  }

  return document.createTextNode('')
}

function setAttributeSafe (elem, attrName, attrValue) {
  if (attrValue instanceof EposEventListener) {
    elem.addEventListener(attrName, attrValue.handler)
  } else if (isStringOrNumber(attrValue)) {
    elem.setAttribute(attrName, attrValue)
  } else {
    elem.removeAttribute(attrName)
  }
}

function createEventListener (handler) {
  return new EposEventListener({
    handler
  })
}

function getComputed (any) {
  if (!isFunction(any)) {
    return any
  }

  const fn = any

  for (const [key, source] of computedSources) {
    if (source.value$change.size === 0) {
      computedSources.delete(key)
    }
  }

  if (!computedSources.has(fn)) {
    const source = createSource({
      value: undefined
    })

    createStandaloneAutorun(() => {
      source.value$ = fn()
    })

    computedSources.set(fn, source)
  }

  return computedSources.get(fn).value$
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
