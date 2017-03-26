const cloneDeep = require('lodash/cloneDeep')

module.exports = (data, state, send, done) => {
  const tags = cloneDeep(state.tags.tags) || {}

  tags[data.tag] = data.paper.map(p => p.key)
  send('tags_replace', tags, done)
}
