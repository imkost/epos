# Epos

Dynamic UI library

```js
import { dynamic, render } from 'epos'

const store = dynamic({
  text: 'welcome'
})

const app = render({
  class: 'app'
  inner: () => store.text$
})

document.body.appendChild(app)
store.text$ = 'it works'
```
