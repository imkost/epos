const classArray = {
  preprocess ({ state, template }) {
    if (template.class) {
      state.class = template.class
      delete template.class
    }
  },
  postprocess ({ state, node }) {
    if (state.class) {
      autorun(() => {
        let cls = Epos.getOrCall(state.class)
        if (Array.isArray(cls)) {
          let result = ''
          cls.forEach(c => {
            if (c && typeof c === 'string') {
              const words = c.split(/\s+/)
              if (result) {
                result += ' ' + words.join(' ')
              } else {
                result += words.join(' ')
              }
            }
          })
          cls = result
        }

        if (cls && typeof cls === 'string') {
          node.setAttribute('class', cls)
        } else {
          node.removeAttribute('class', cls)
        }
      })
    }
  }
}

render.addPlugin(classArray)
