const store = createSource({
  title: 'hello'
})

const app = render({
  class: 'app',
  inner: [
    {
      tag: 'input',
      keydown: createEventHandler(e => {
        setTimeout(() => {
          store.title$ = e.target.value
        })
      }),
      value () {
        return store.title$
      }
    },
    {
      tag: 'input',
      keydown: createEventHandler(e => {
        setTimeout(() => {
          store.title$ = e.target.value
        })
      }),
      value () {
        return store.title$
      }
    },
    {
      inner () {
        return store.title$
      }
    }
  ]
})

document.body.appendChild(app)
