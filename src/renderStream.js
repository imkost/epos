

function renderStream (stream) {
  // const startNode = document.createTextNode('')
  // const endNode = document.createTextNode('')
  // startNode[_isStartNode_] = true
  // endNode[_isEndNode_] = true
  // startNode[_nodeId_] = globalNodeId
  // endNode[_nodeId_] = globalNodeId
  // globalNodeId += 1
  const nodes = renderArray(stream)
  const startNode = nodes[0]
  const endNode = nodes[nodes.length - 1]

  watchSourceArray(stream, {
    onSplice (start, removeCount, ...items) {
      // removeCount = Math.min(stream.length - start, removeCount)
      // start = Math.min(stream.length - 1, start)
      // Prepare args
      if (start < 0) {
         // ...
      }
      if (start + removeCount > stream.length) {

      }

      let i = 0
      let cursor = startNode.nextSibling

      if (!cursor) {
        console.log('strange')
        return
      }

      const children = []

      while (cursor !== endNode) {
        if (cursor[_isStartNode_]) {
          const nodes = []
          const nodeId = cursor[_nodeId_]
          while (true) {
            nodes.push(cursor)
            if (cursor[_isEndNode_] && cursor[_nodeId_] === nodeId) {
              break
            }
            cursor = cursor.nextSibling
          }
          children.push(nodes)
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

      return


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
    },

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

      if (!cursor) {
        console.log('strange')
        return
      }

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
