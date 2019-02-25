# Epos. Dynamic UI library for performance hunters.

```
const store = Epos.dynamic({
  text: 'welcome'
})

const app = Epos.render({
  class: 'app'
  inner: () => store.text$
})

document.body.appendChild(app)
store.text$ = 'it works'
```
