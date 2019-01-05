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
        const className = [].concat(dynamic(state.class))
          .filter(c => c && typeof c === 'string')
          .join(' ')
          .split(/\s+/)
          .join(' ')
        node.setAttribute('class', className)
      })
    }
  }
}
