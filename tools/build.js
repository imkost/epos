const { readFileSync, writeFileSync } = require('fs')

;(function main () {
  build('browser', 'dist/epos.browser.js')
  build('node', 'dist/epos.node.js')
})()

function getFiles (env) {
  return [
    'src/vars.js',
    'src/utils.js',
    'src/source.js',
    'src/epos.js',
    env === 'browser' ? 'src/index.browser.js' : null,
    env === 'node' ? 'src/index.node.js' : null
  ].filter(Boolean)
}

function build (env, output) {
  const files = getFiles(env)
  const js = concat(files)
  writeFileSync(`dist/epos.${env}.js`, js)

  if (env === 'browser') {
    const jsMin = minify(js)
    writeFileSync(`dist/epos.${env}.min.js`, jsMin)
  }
}

function concat (paths) {
  return paths.map(p => readFileSync(p, 'utf-8')).join('\n')
}
