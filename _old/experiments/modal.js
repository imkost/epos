var Modal = {
  lastId: 0,
  states: {},
  props: {},

  render (props) {
    var id = Modal.lastId++
    Modal.props[id] = props

    return {
      class: 'modal',
      onclick: `Modal.onTriggerClick(${id})`,
      'data-open': () => {
        if (props.open) {
          Modal.create(id)
        } else {
          Modal.destroy(id)
        }

        return props.open ? 'yes' : 'no'
      },
      inner: props.triggerText
    }
  },

  onTriggerClick (id) {
    Modal.props[id].setOpen(true)
  },

  onCloseClick (id) {
    Modal.props[id].setOpen(false)
  },

  create (id) {
    var props = Modal.props[id]
    if (Modal.$modal) return
    var view = {
      class: 'modal-window',
      inner: [
        props.content,
        {
          class: 'modal-window-close',
          onClick: `Modal.onCloseClick(${id})`,
          inner: '[close]'
        }
      ]
    }
    Modal.$modal = Epos.element(view)
    document.body.appendChild(Modal.$modal)
  },

  destroy (id) {
    if (!Modal.$modal) return
    var props = Modal.props[id]
    Modal.$modal.outerHTML = ''
    delete Modal.$modal
  }
}

var store = Epos.object({
  open: false,
  open2: false
})

var $app = Epos.element({
  class: 'app',
  inner: [
    Modal.render(Epos.object({
      triggerText: 'open modal',
      content: 'hello, this is modal',
      open: () => store.open,
      setOpen: () => (v) => store.open = v
    })),

    Modal.render(Epos.object({
      triggerText: 'open modal 2',
      content: 'hello, this is modal 2',
      open: () => store.open2,
      setOpen: () => (v) => store.open2 = v
    }))
  ]
})

document.body.appendChild($app)
