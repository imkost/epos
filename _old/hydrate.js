let cursor

function hydrate (node, template) {
  if (isStringOrNumber(template)) {
    if (cursor) {
      cursor = cursor.nextSibling
    }
    return
  }

  if (isObject(template)) {
    hydrateObject(node, template)
    return
  }

  if (isArray(template)) {
    hydrateArray(node, template)
    return
  }

  if (isFunction(template)) {
    hydrateFunction(node, template)
    return
  }

  if (isStream(template)) {
    hydrateStream(node, template)
    return
  }
}

function hydrateObject (node, template) {
  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - */

  // Preprocess with plugins
  const stateByPlugin = new Map()
  for (const plugin of plugins) {
    if (plugin.preprocess) {
      const state = {}
      stateByPlugin.set(plugin, state)
      plugin.preprocess({ state, template })
    }
  }

  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - */

  // Set attributes and add event listeners
  for (const key in template) {
    if (key !== 'tag' && key !== 'inner' && key !== 'xmlns') {
      const value = template[key]
      if (events.includes(key.toLowerCase()) && isFunction(value)) {
        node.addEventListener(key.toLowerCase().slice(2), value)
      } else {
        autorun(() => {
          setAttributeSafe(node, key, isFunction(value) ? value() : value)
        })
      }
    }
  }

  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - */

  // Hydrate children
  hydrate(node.childNodes, template.inner)

  /* - - - - - - - - - - - - - - - - - - - - - - - - - - - */

  return node
}

function hydrateArray (nodes, template) {
  const [startNode, endNode] = createBoundaryNodes()
  const firstNode = nodes[0]
  const lastNode = nodes[nodes.length - 1]

  // Add boundaries to DOM
  firstNode.parentNode.insertBefore(startNode, firstNode)
  if (lastNode.nextSibling) {
    lastNode.parentNode.insertBefore(lastNode.nextSibling, endNode)
  } else {
    lastNode.parentNode.appendChild(endNode)
  }

  template.forEach((item, i) => {
    hydrate()
  })

  return [
    startNode,
    ...toFlatArray(template.map(render)),
    endNode
  ]
}

function hydrateFunction () {

}

function hydrateStream () {

}
