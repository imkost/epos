function renderFunction (template) {
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
