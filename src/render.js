function render (template) {
  if (template instanceof window.Node) {
    return template
  }

  if (isFunction(template)) {
    return renderFunction(template)
  }

  if (isArray(template)) {
    return renderArray(template)
  }

  if (isStream(template)) {
    return renderStream(template)
  }

  preprocess(template)

  let node
  if (isObject(template)) {
    node = renderObject(template)
  } else if (isStringOrNumber(template)) {
    node = document.createTextNode(template)
  } else {
    node = document.createTextNode('')
  }

  postprocess(template, node)

  return node
}

let stateByPlugin = null

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
