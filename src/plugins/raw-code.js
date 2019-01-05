function rawCode (code) {
  const div = render({})
  div.innerHTML = code
  return Array.from(div.childNodes)
}
