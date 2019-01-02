window.Epos = {
  // Reactivity
  createSource,
  createStream,
  createAutorun,
  createStandaloneAutorun,
  getComputed,
  makeTransaction,

  // Rendering
  render,
  renderStream,
  createEventHandler,
  addRenderPlugin
}

let curGet = null
let curAutorun = null
let curTransaction = null
const renderPlugins = []
const computedSources = new Map()
const _change_ = Symbol('change')
const _itemAdd_ = Symbol('itemAdd')
const _itemRemove_ = Symbol('itemRemove')

/*******************************************************************************
 *
 * Source
 *
 ******************************************************************************/

function createSource (initial, parentChange) {
  if (isObject(initial)) {
    const source = {}
    source[_change_] = {}

    for (const key in initial) {
      const value = initial[key]
      const change = new Set()
      source[key] = createSource(value, change)
      source[_change_][key] = change

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

  if (isArray(initial)) {
    const source = initial.map(createSource)
    source[_itemAdd_] = new Set()
    source[_itemRemove_] = new Set()

    const add = (index, item) => {
      item = createSource(item)
      source.splice(index, 0, item)
      callFns(source[_itemAdd_], index, item)
    }

    const remove = (index) => {
      if (index in source) {
        source.splice(index, 1)
        callFns(source[_itemRemove_], index)
      }
    }

    const methods = {
      pop () {
        remove(source.length - 1)
      },
      push (item) {
        add(source.length, item)
      },
      shift () {
        remove(0)
      },
      unshift (item) {
        add(0, item)
      },
      splice (start, removeCount, ...items) {
        for (let i = 0; i < removeCount; i++) {
          remove(start)
        }
        for (let i = 0; i < items.length; i++) {
          add(Math.min(start + i, source.length), items[i])
        }
      }
    }

    for (const name in methods) {
      const method = (...args) => {
        methods[name](...args)
        if (parentChange) {
          callFns(parentChange)
        }
      }

      Object.defineProperty(source, `${name}$`, {
        get () {
          return method
        }
      })
    }

    return source
  }

  return initial
}

/*******************************************************************************
 *
 * Stream
 *
 ******************************************************************************/

function createStream (array, fn) {
  if (!fn) {
    fn = (i) => i
  }

  const stream = createSource(array.map(fn))

  watchStream(array, {
    onAdd (index, item) {
      stream.splice$(index, 0, createSource(fn(item)))
    },

    onRemove (index) {
      stream.splice$(index, 1)
    }
  })

  return stream
}

/*******************************************************************************
 *
 * Autorun
 *
 ******************************************************************************/

function createAutorun (fn) {
  let deps = []
  const autorun = {
    stop,
    children: []
  }

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

/*******************************************************************************
 *
 * Standalone Autorun
 *
 ******************************************************************************/

function createStandaloneAutorun (fn) {
  const parentAutorun = curAutorun
  curAutorun = null
  createAutorun(fn)
  curAutorun = parentAutorun
}

/*******************************************************************************
 *
 * Computed
 *
 ******************************************************************************/

function getComputed (any) {
  if (!isFunction(any)) {
    return any
  }

  const fn = any

  for (const [key, source] of computedSources) {
    if (source[_change_].value.size === 0) {
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
 * Transaction
 *
 ******************************************************************************/

function makeTransaction (fn) {
  const parentTransaction = curTransaction
  curTransaction = { afterEnd: [] }
  fn()
  for (const callback of curTransaction.afterEnd) {
    callback()
  }
  curTransaction = parentTransaction
}

/*******************************************************************************
 *
 * Render
 *
 ******************************************************************************/

function render (template) {
  if (template instanceof window.Node) {
    return template
  }

  if (isArray(template)) {
    return toFlatArray(template.map(render))
  }

  if (isFunction(template)) {
    const startNode = document.createTextNode('')
    const endNode = document.createTextNode('')
    let nodes

    let isFirstRun = true
    createAutorun(() => {
      const newNodes = toFlatArray(render(template()))

      if (isFirstRun) {
        nodes = newNodes
        isFirstRun = false
      } else {
        const fragment = document.createDocumentFragment()
        for (const newNode of newNodes) {
          fragment.appendChild(newNode)
        }

        while (startNode.nextSibling !== endNode) {
          startNode.nextSibling.remove()
        }

        endNode.parentNode.insertBefore(fragment, endNode)
      }
    })

    return [
      startNode,
      ...nodes,
      endNode
    ]
  }

  let node
  const setNode = (value) => {
    node = value
  }
  const stateByPlugin = new Map()

  for (const plugin of renderPlugins) {
    if (plugin.preprocess) {
      const state = {}
      stateByPlugin.set(plugin, state)
      plugin.preprocess({ state, template, setNode })
    }
  }

  if (node) {
    return node
  }

  if (isStringOrNumber(template)) {
    node = document.createTextNode(template)
  } else if (isObject(template)) {
    const tag = template.tag || 'div'

    if (template.xmlns) {
      node = document.createElementNS(template.xmlns, tag)
    } else {
      node = document.createElement(tag)
    }

    for (const key in template) {
      if (key !== 'tag' && key !== 'inner') {
        const value = template[key]
        if (isFunction(value)) {
          createAutorun(() => {
            setAttributeSafe(node, key, value())
          })
        } else {
          setAttributeSafe(node, key, value)
        }
      }
    }

    const children = toFlatArray(render(template.inner))
    for (const child of children) {
      node.appendChild(child)
    }
  } else {
    node = document.createTextNode('')
  }

  for (const plugin of renderPlugins) {
    if (plugin.postprocess) {
      const state = stateByPlugin.get(plugin)
      plugin.postprocess({ state, template, node })
    }
  }

  return node
}

function setAttributeSafe (elem, key, value) {
  if (value instanceof EventHandler) {
    elem.addEventListener(key, value.handler)
  } else if (isStringOrNumber(value)) {
    elem.setAttribute(key, value)
  } else {
    elem.removeAttribute(key)
  }
}

/*******************************************************************************
 *
 * Render Stream
 *
 ******************************************************************************/

function renderStream (array, fn) {
  if (!fn) {
    fn = (i) => i
  }

  const startNode = document.createTextNode('')
  const endNode = document.createTextNode('')
  const nodes = render(array.map(fn))

  watchStream(array, {
    onAdd (index, item) {
      const node = render(fn(item))
      let cursor = startNode.nextSibling
      for (let i = 0; i < index; i++) {
        cursor = cursor.nextSibling
      }
      cursor.parentNode.insertBefore(node, cursor)
    },

    onRemove (index) {
      let cursor = startNode.nextSibling
      for (let i = 0; i < index; i++) {
        cursor = cursor.nextSibling
      }
      cursor.remove()
    }
  })

  return [
    startNode,
    ...nodes,
    endNode
  ]
}

/*******************************************************************************
 *
 * Event Handler
 *
 ******************************************************************************/

function createEventHandler (handler) {
  return new EventHandler(handler)
}

function EventHandler (handler) {
  this.handler = handler
}

/*******************************************************************************
 *
 * Render Plugin
 *
 ******************************************************************************/

function addRenderPlugin (plugin) {
  renderPlugins.push(plugin)
}

/*******************************************************************************
 *
 * Helpers
 *
 ******************************************************************************/

function watchStream (array, { onAdd, onRemove }) {
  if (array[_itemAdd_]) {
    array[_itemAdd_].add(onAdd)
    array[_itemRemove_].add(onRemove)

    if (curAutorun) {
      curAutorun.children.push({
        stop () {
          array[_itemAdd_].delete(onAdd)
          array[_itemRemove_].delete(onRemove)
        }
      })
    }
  }
}

function callFns (fns, ...args) {
  if (curTransaction) {
    curTransaction.afterEnd.push(call)
  } else {
    call()
  }

  function call () {
    for (const fn of Array.from(fns)) {
      fn(...args)
    }
  }
}

/*******************************************************************************
 *
 * Utils
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
