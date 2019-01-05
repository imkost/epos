function renderObject (template) {
  preprocess(template)

  const tag = template.tag || 'div'

  let node
  if (template.xmlns) {
    node = document.createElementNS(template.xmlns, tag)
  } else {
    node = document.createElement(tag)
  }

  for (const key in template) {
    if (key !== 'tag' && key !== 'inner') {
      const value = template[key]
      if (value && events.includes(key)) {
        node.addEventListener(key.slice(2), value)
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

  postprocess(template, node)

  return node
}


// TODO: state for template + plugin!
let stateByPlugin
function preprocess (template) {
  stateByPlugin = new Map()

  for (const plugin of renderPlugins) {
    if (plugin.preprocess) {
      const state = {}
      stateByPlugin.set(plugin, state)
      plugin.preprocess({ state, template })
    }
  }
}

function postprocess (template, node) {
  for (const plugin of renderPlugins) {
    if (plugin.postprocess) {
      const state = stateByPlugin.get(plugin)
      plugin.postprocess({ state, template, node })
    }
  }
}

const events = []
for (const key in document) {
  if (
    key.substring(0, 2) === 'on' &&
    (document[key] === null || isFunction(document[key]))
  ) {
    events.push(key)
  }
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
