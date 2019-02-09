// TODO:
// если вручную удалить элемент elem.remove() или elem.outerHTML = '',
// то он удалится из дома, в памяти он все еще будет жить, если до него есть ссылка.
// поэтому правильно, чтобы на нем вся динамичность продолжала выполняться.
// если мы хотим убить всю динамичность, то нужно вызвать какой-то метод

// TODO:
// всюду где используются `.remove()` надо кажется останавливать реактивности внутри
// или все уже останавливается?

window.Epos = {
  dynamic,
  autorun,
  transaction,
  render,
  raw,
  discontinue
}

render.addPlugin = addRenderPlugin

/*******************************************************************************
 *
 * VARS
 *
 ******************************************************************************/

let curGet = null
let curComp = null
let curStack = null
let boundaryId = 1
const events = getAllEvents()
const plugins = []
const fnsToCheckAfterAutorun = new Set()
const _splice_ = Symbol('splice')
const _children_ = Symbol('children')
const _isStream_ = Symbol('isStream')
const _boundaryId_ = Symbol('boundaryId')
const _usages_ = Symbol('usages')
const _source_ = Symbol('source')
const _comp_ = Symbol('comp')

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

  for (const key in object) {
    const value = object[key]
    const change = new Set()
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
  if (!isFunction(fn)) {
    return fn
  }

  if (!fn[_source_]) {
    fn[_usages_] = 0
    fn[_source_] = createSource({
      value: void 0
    })

    fn[_comp_] = autorun(() => {
      fn[_source_].value$ = fn()
    }, true)
  }

  if (curComp) {
    fn[_usages_] += 1
    curComp[_children_].push({
      stop () {
        fnsToCheckAfterAutorun.add(fn)
        fn[_usages_] -= 1
      }
    })
  }

  return fn[_source_].value$
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

// TODO: check if implementation via class can give some performance boost
function autorun (fn, isStandalone = false) {
  let deps = []
  const comp = {
    stop,
    [_children_]: []
  }

  if (curComp && !isStandalone) {
    curComp[_children_].push(comp)
  }

  run()

  return comp

  function run () {
    stop()
    const parentGet = curGet
    const parentComp = curComp
    curGet = get
    curComp = comp
    fn()
    curGet = parentGet
    curComp = parentComp

    if (curComp === null) {
      // afterAutorun()

      fnsToCheckAfterAutorun.forEach(fn => {
        if (fn[_usages_] === 0) {
          fn[_comp_].stop()
          fn[_source_] = null
        }
      })
    }
  }

  function get (change) {
    change.add(run)
    deps.push(change)
  }

  function stop () {
    for (const child of comp[_children_]) {
      child.stop()
    }
    comp[_children_] = []

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
    if (key !== 'tag' && key !== 'inner' && key !== 'xmlns') {
      const value = template[key]
      if (events.includes(key) && isFunction(value)) {
        node.addEventListener(key.slice(2), value)
      } else {
        autorun(() => {
          setAttributeSafe(node, key, getComputed(value))
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
  autorun(() => {
    const newNodes = toFlatArray(render(template()))

    if (isFirstRun) {
      nodes = newNodes
      isFirstRun = false
    } else {
      // Create fragment with all new nodes
      const fragment = document.createDocumentFragment()
      for (const newNode of newNodes) {
        fragment.appendChild(newNode)
      }

      // Remove all nodes between `start` and `end`
      while (startNode.nextSibling !== endNode) {
        startNode.nextSibling.remove()
      }

      // Insert fragment between `start` and `end`
      endNode.parentNode.insertBefore(fragment, endNode)
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

    if (!cursor) {
      // probably rerun of already removed elements
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
      n.remove()
    }
  })

  return nodes
}

/*******************************************************************************
 *
 * ADD RENDER PLUGIN
 *
 ******************************************************************************/

function addRenderPlugin (plugin) {
  plugins.push(plugin)
}

/*******************************************************************************
 *
 * RAW
 *
 ******************************************************************************/

function raw (string) {
  const div = render({})
  div.innerHTML = string
  return Array.from(div.childNodes)
}

/*******************************************************************************
 *
 * DISCONTINUE
 *
 ******************************************************************************/

// stops all dynamic computation for the given element
function discontinue (node) {
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
  return isArray(any) ? any.flat() : [any]
}

/*******************************************************************************
 *
 * UNCATEGORIZED
 *
 ******************************************************************************/

function removeNode (node) {
  // node.remove()
  // discontinue(node)
}

function onSplice (sourceArray, fn) {
  if (sourceArray[_splice_]) {
    sourceArray[_splice_].add(fn)

    if (curComp) {
      curComp[_children_].push({
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
    const value = document[key]
    if (key.startsWith('on') && (value === null || isFunction(value))) {
      events.push(key)
    }
  }

  return events
}

function createBoundaryNodes () {
  const startNode = document.createTextNode('')
  const endNode = document.createTextNode('')
  startNode[_boundaryId_] = boundaryId
  endNode[_boundaryId_] = boundaryId
  boundaryId += 1
  return [startNode, endNode]
}
