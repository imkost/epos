window.Epos = {
  // Reactivity
  createSource,
  createAutorun,
  createStandaloneAutorun,
  getComputed,
  makeTransaction,

  // Rendering
  render,
  createEventHandler,
  addRenderPlugin
}

let curGet = null
let curAutorun = null
let curTransaction = null
let globalNodeId = 0
const renderPlugins = []
const computedSources = new Map()
const _change_ = Symbol('change')
const _itemAdd_ = Symbol('itemAdd')
const _itemRemove_ = Symbol('itemRemove')
const _isEventHandler_ = Symbol('isEventHandler')
const _isStartNode_ = Symbol('isStartNode')
const _isEndNode_ = Symbol('isEndNode')
const _nodeId_ = Symbol('nodeId')
const _isStream_ = Symbol('isStream')

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
        const lastIndex = source.length - 1
        const lastItem = source[lastIndex]
        remove(lastIndex)
        return lastItem
      },
      push (item) {
        add(source.length, item)
        return source.length
      },
      shift () {
        const firstItem = source[0]
        remove(0)
        return firstItem
      },
      unshift (item) {
        add(0, item)
        return source.length
      },
      splice (start, removeCount, ...items) {
        const removedItems = []
        removeCount = Math.min(source.length - start, removeCount)

        for (let i = 0; i < removeCount; i++) {
          removedItems.push(source[start])
          remove(start)
        }

        for (let i = 0; i < items.length; i++) {
          add(Math.min(start + i, source.length), items[i])
        }

        return removedItems
      }
    }

    for (const name in methods) {
      const method = (...args) => {
        const result = methods[name](...args)
        if (parentChange) {
          callFns(parentChange)
        }
        return result
      }

      Object.defineProperty(source, `${name}$`, {
        get () {
          return method
        }
      })
    }

    const map$ = (fn) => {
      return createStream(source, fn)
    }

    Object.defineProperty(source, 'map$', {
      get () {
        return map$
      }
    })

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
  const stream = createSource(array.map(fn))
  stream[_isStream_] = true

  watchArray(array, {
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

let autorunsCount = 0

function createAutorun (fn) {
  autorunsCount += 1
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
    stop(false)
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

  function stop (isDestroy = true) {
    if (isDestroy) {
      autorunsCount -= 1
    }
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

  if (template && template[_isStream_]) {
    const stream = template
    // const startNode = document.createTextNode('')
    // const endNode = document.createTextNode('')
    // startNode[_isStartNode_] = true
    // endNode[_isEndNode_] = true
    // startNode[_nodeId_] = globalNodeId
    // endNode[_nodeId_] = globalNodeId
    // globalNodeId += 1
    const nodes = render(stream.slice())
    const startNode = nodes[0]
    const endNode = nodes[nodes.length - 1]

    watchArray(stream, {
      onAdd (index, item) {
        let i = 0
        let cursor = startNode.nextSibling
        const newNodes = toFlatArray(render(item))
        let indexElem = null

        while (cursor !== endNode) {
          if (cursor[_isStartNode_]) {
            if (i === index) {
              indexElem = cursor
              break
            }
            const nodeId = cursor[_nodeId_]
            while (true) {
              cursor = cursor.nextSibling
              if (cursor[_isEndNode_] && cursor[_nodeId_] === nodeId) {
                break
              }
            }
            cursor = cursor.nextSibling
            i += 1
          } else {
            if (i === index) {
              indexElem = cursor
              break
            }
            cursor = cursor.nextSibling
            i += 1
          }
        }

        if (!indexElem) {
          indexElem = endNode
        }

        for (const newNode of newNodes) {
          indexElem.parentNode.insertBefore(newNode, indexElem)
        }

        // while (true) {
        //   if (cursor[_isStartNode_]) {
        //     while (!cursor[_isEndNode_]) {
        //       cursor = cursor.nextSibling
        //     }
        //   }

        //   cursor = cursor.nextSibling

        //   if (i === index + 1) {
        //     break
        //   }

        //   i += 1
        // }

        // for (const newNode of newNodes) {
        //   cursor.parentNode.insertBefore(newNode, cursor)
        // }
      },

      onRemove (index) {
        let i = 0
        let cursor = startNode.nextSibling

        while (cursor !== endNode) {
          if (cursor[_isStartNode_]) {
            const nodes = [cursor]
            const nodeId = cursor[_nodeId_]
            while (true) {
              cursor = cursor.nextSibling
              nodes.push(cursor)
              if (cursor[_isEndNode_] && cursor[_nodeId_] === nodeId) {
                break
              }
            }
            cursor = cursor.nextSibling
            if (i === index) {
              for (const node of nodes) {
                removeNode(node)
              }
            }
            i += 1
          } else {
            if (i === index) {
              removeNode(cursor)
              break
            }
            cursor = cursor.nextSibling
            i += 1
          }
        }
      }
    })

    return nodes
  }

  if (isArray(template)) {
    const startNode = document.createTextNode('')
    const endNode = document.createTextNode('')
    startNode[_isStartNode_] = true
    endNode[_isEndNode_] = true
    startNode[_nodeId_] = globalNodeId
    endNode[_nodeId_] = globalNodeId
    globalNodeId += 1

    return [
      startNode,
      ...toFlatArray(template.map(render)),
      endNode
    ]
  }

  if (isFunction(template)) {
    const startNode = document.createTextNode('')
    const endNode = document.createTextNode('')
    startNode[_isStartNode_] = true
    endNode[_isEndNode_] = true
    startNode[_nodeId_] = globalNodeId
    endNode[_nodeId_] = globalNodeId
    globalNodeId += 1
    let nodes

    let isFirstRun = true
    let a = createAutorun(() => {
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
        if (value && value[_isEventHandler_]) {
          node.addEventListener(key, value)
        } else if (isFunction(value)) {
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
 * Event Handler
 *
 ******************************************************************************/

function createEventHandler (handler) {
  handler[_isEventHandler_] = true
  return handler
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

function watchArray (array, { onAdd, onRemove }) {
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

function removeNode (node) {
  if (node._autorun) {
    node._autorun.stop()
  }
  node.remove()
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
