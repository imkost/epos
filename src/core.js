window.Epos = {
  dynamic,
  autorun,
  transaction,
  render,
  useRenderPlugin
}

// TODO: if autorun has zero deps => destroy

// window.Epos = {
//   render,
//   dynamic,
//   autorun,
//   transaction,
//   useRenderPlugin
// }

/*******************************************************************************
 *
 * VARS
 *
 ******************************************************************************/

let curGet = null
let curComputation = null
let curStack = null
let globalNodeId = 1
let boundaryIndex = 1
const events = getAllEvents()
const plugins = [] // render plugins
const computed = new Map() // fn => source
const _change_ = Symbol('change')
const _splice_ = Symbol('splice')
const _isStream_ = Symbol('isStream')
const _boundaryId_ = Symbol('boundaryId')

/*******************************************************************************
 *
 * DYNAMIC
 *
 ******************************************************************************/

function dynamic (any) {
  if (isFunction(any)) {
    return getComputed(any)
  }

  return createSource(any)
}

/*******************************************************************************
 *
 * CREATE SOURCE
 *
 ******************************************************************************/

function createSource (any, parentChange) {
  if (isObject(any)) {
    return createSourceObject(any)
  }

  if (isArray(any)) {
    return createSourceArray(any, parentChange)
  }

  return any
}

/*******************************************************************************
 *
 * CREATE SOURCE OBJECT
 *
 ******************************************************************************/

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

/*******************************************************************************
 *
 * CREATE SOURCE ARRAY
 *
 ******************************************************************************/

function createSourceArray (array, parentChange) {
  const source = array.map(i => createSource(i))
  source[_splice_] = new Set()

  Object.defineProperties(source, {
    pop$: { get: () => pop$ },
    push$: { get: () => push$ },
    shift$: { get: () => shift$ },
    unshift$: { get: () => unshift$ },
    splice$: { get: () => splice$ },
    map$: { get: () => map$ }
  })

  return source

  function pop$ () {
    const removed = splice$(source.length - 1, 1)
    return removed[0]
  }

  function push$ (item) {
    splice$(source.length, 0, item)
    return source.length
  }

  function shift$ () {
    const removed = splice$(0, 1)
    return removed[0]
  }

  function unshift$ (item) {
    splice$(0, 0, item)
    return source.length
  }

  function splice$ (start, removeCount, ...items) {
    if (start < 0) {
      start = Math.max(0, source.length + start)
    } else if (start > source.length - 1) {
      start = source.length
    }
    removeCount = Math.max(0, Math.min(source.length - start, removeCount))

    items = items.map(i => createSource(i))

    const removed = source.splice(start, removeCount, ...items)
    callFns(source[_splice_], start, removeCount, ...items)
    return removed
  }

  function map$ (fn) {
    return createStream(source, fn)
  }
}

/*******************************************************************************
 *
 * GET COMPUTED
 *
 ******************************************************************************/

function getComputed (fn) {
  for (const [key, source] of computed) {
    if (source[_change_].value.size === 0) {
      computed.delete(key)
    }
  }

  if (!computed.has(fn)) {
    const source = createSource({
      value: void 0
    })

    autorun(() => {
      source.value$ = fn()
    }, true)

    computed.set(fn, source)
  }

  return computed.get(fn).value$
}

/*******************************************************************************
 *
 * TRANSACTION
 *
 ******************************************************************************/

function transaction (fn) {
  const parentStack = curStack
  curStack = []
  fn()
  for (const callback of curStack) {
    callback()
  }
  curStack = parentStack
}

/*******************************************************************************
 *
 * CREATE STREAM
 *
 ******************************************************************************/

function createStream (sourceArray, fn) {
  const stream = createSource(sourceArray.map(fn))
  stream[_isStream_] = true

  onSplice(sourceArray, (start, removeCount, ...items) => {
    items = items.map(i => fn(i))
    stream.splice$(start, removeCount, ...items)
  })

  return stream
}

/*******************************************************************************
 *
 * AUTORUN
 *
 ******************************************************************************/

function autorun (fn, isStandalone = false) {
  let deps = []
  const computation = {
    stop,
    children: []
  }

  if (curComputation && !isStandalone) {
    curComputation.children.push(computation)
  }

  run()

  return computation

  function run () {
    stop()
    const parentGet = curGet
    const parentComputation = curComputation
    curGet = get
    curComputation = computation
    fn()
    curGet = parentGet
    curComputation = parentComputation
  }

  function get (change) {
    change.add(run)
    deps.push(change)
  }

  function stop () {
    for (const child of computation.children) {
      child.stop()
    }
    computation.children = []

    for (const change of deps) {
      change.delete(run)
    }
    deps = []
  }
}

/*******************************************************************************
 *
 * RENDER
 *
 ******************************************************************************/

function render (template) {
  if (template instanceof window.Node) {
    return template
  }

  if (isStringOrNumber(template)) {
    return document.createTextNode(template)
  }

  if (isObject(template)) {
    return renderObject(template)
  }

  if (isArray(template)) {
    return renderArray(template)
  }

  if (isFunction(template)) {
    return renderFunction(template)
  }

  if (isStream(template)) {
    return renderStream(template)
  }

  return document.createTextNode('')
}

/*******************************************************************************
 *
 * RENDER OBJECT
 *
 ******************************************************************************/

function renderObject (template) {
  // Preprocess with plugins
  const stateByPlugin = new Map()
  for (const plugin of plugins) {
    if (plugin.preprocess) {
      const state = {}
      stateByPlugin.set(plugin, state)
      plugin.preprocess({ state, template })
    }
  }

  // Create node
  let node
  const tag = template.tag || 'div'
  if (template.xmlns) {
    node = document.createElementNS(template.xmlns, tag)
  } else {
    node = document.createElement(tag)
  }

  // Set attributes, add event listeners
  for (const key in template) {
    if (key !== 'tag' && key !== 'inner') {
      const value = template[key]
      if (events.includes(key) && isFunction(value)) {
        node.addEventListener(key.slice(2), value)
      } else {
        autorun(() => {
          setAttributeSafe(node, key, dynamic(value))
        })
      }
    }
  }

  // Render children
  const children = toFlatArray(render(template.inner))
  for (const child of children) {
    node.appendChild(child)
  }

  // Postprocess with plugins
  for (const plugin of plugins) {
    if (plugin.postprocess) {
      const state = stateByPlugin.get(plugin)
      plugin.postprocess({ state, template, node })
    }
  }

  return node
}

function setAttributeSafe (elem, key, value) {
  if (isStringOrNumber(value) || typeof value === 'boolean') {
    if (key in elem) {
      elem[key] = value
    } else {
      elem.setAttribute(key, value)
    }
  } else {
    elem.removeAttribute(key)
  }
}

/*******************************************************************************
 *
 * RENDER ARRAY
 *
 ******************************************************************************/

function renderArray (template) {
  const [startNode, endNode] = createBoundaryNodes()
  return [
    startNode,
    ...toFlatArray(template.map(render)),
    endNode
  ]
}

/*******************************************************************************
 *
 * RENDER FUNCTION
 *
 ******************************************************************************/

function renderFunction (template) {
  const [startNode, endNode] = createBoundaryNodes()
  let nodes

  let isFirstRun = true
  let a = autorun(() => {
    const newNodes = toFlatArray(render(template()))

    if (isFirstRun) {
      nodes = newNodes
      isFirstRun = false
    } else {
      const fragment = document.createDocumentFragment()
      for (const newNode of newNodes) {
        fragment.appendChild(newNode)
      }

      if (!startNode.parentNode) {
        a.stop()
        return
      }

      while (startNode.nextSibling !== endNode) {
        removeNode(startNode.nextSibling)
      }

      endNode.parentNode.insertBefore(fragment, endNode)
    }
  })

  startNode._autorun = a

  return [
    startNode,
    ...nodes,
    endNode
  ]
}

/*******************************************************************************
 *
 * RENDER STREAM
 *
 ******************************************************************************/

function renderStream (stream) {
  const nodes = renderArray(stream)
  const startNode = nodes[0]
  const endNode = nodes[nodes.length - 1]

  onSplice(stream, (start, removeCount, ...items) => {
    let i = 0
    let cursor = startNode.nextSibling
    let bid = startNode[_boundaryId_]

    if (!cursor) {
      console.log('strange')
      return
    }

    const children = []

    while (cursor !== endNode) {
      if (cursor[_boundaryId_]) {
        const nodes2 = []
        const boundaryId = cursor[_boundaryId_]
        while (true) {
          nodes2.push(cursor)
          cursor = cursor.nextSibling
          if (cursor[_boundaryId_] === boundaryId) {
            nodes2.push(cursor)
            break
          }
        }
        children.push(nodes2)
      } else {
        children.push(cursor)
      }

      cursor = cursor.nextSibling
    }

    const nodesToRemove = []
    const bef = toFlatArray(children[start] || endNode)[0]

    for (i = 0; i < removeCount; i++) {
      const cc = toFlatArray(children[start + i])
      for (const c of cc) {
        nodesToRemove.push(c)
      }
    }

    for (const item of items) {
      const ii = toFlatArray(render(item))
      for (const i of ii) {
        bef.parentNode.insertBefore(i, bef)
      }
    }

    for (const n of nodesToRemove) {
      removeNode(n)
    }
  })

  return nodes
}

/*******************************************************************************
 *
 * USE RENDER PLUGIN
 *
 ******************************************************************************/

function useRenderPlugin (plugin) {
  plugins.push(plugin)
}

/*******************************************************************************
 *
 * UTILS
 *
 ******************************************************************************/

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

/*******************************************************************************
 *
 * UNCATEGORIZED
 *
 ******************************************************************************/

function removeNode (node) {
  if (node._autorun) {
    node._autorun.stop()
  }
  node.remove()
}

function onSplice (sourceArray, fn) {
  if (sourceArray[_splice_]) {
    sourceArray[_splice_].add(fn)

    if (curComputation) {
      curComputation.children.push({
        stop () {
          sourceArray[_splice_].delete(fn)
        }
      })
    }
  }
}

function callFns (fns, ...args) {
  if (!fns) {
    return
  }

  if (curStack) {
    curStack.push(call)
  } else {
    call()
  }

  function call () {
    for (const fn of Array.from(fns)) {
      fn(...args)
    }
  }
}

function getAllEvents () {
  const events = []
  for (const key in document) {
    const value = events[key]
    if (key.startsWith('on') && (value === null || isFunction(value))) {
      events.push(key)
    }
  }

  return events
}

function createBoundaryNodes () {
  const startNode = document.createTextNode('')
  const endNode = document.createTextNode('')
  startNode[_boundaryId_] = boundaryIndex
  endNode[_boundaryId_] = boundaryIndex
  boundaryIndex += 1
  return [startNode, endNode]
}
