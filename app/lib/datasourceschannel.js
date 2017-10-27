const {ipcMain} = require('electron')
const getdatasource = require('../client/lib/getdatasource')

ipcMain.on('datasource:add', (event, source) => {
  getdatasource.fetch(source.key, (err, ds) => {
    if (err) return event.sender.send('datasource:add', source.key, err)

    if (source.active) ds.setActive()
    ds.on('connected', () => event.sender.send('datasource:add:connected', source.key))
    ds.on('progress', () => event.sender.send('datasource:add:progress', source.key))

    ds.connect()

    if (getdatasource.all().length > 1) {
      event.sender.send('datasource:add', source.key, null, ds.name)
    }
  })
})

ipcMain.on('datasource:clear', (event, dskey, files, paperkey) => {
  getdatasource.fetch(dskey, (err, ds) => {
    if (err) return event.sender.send('datasource:clear', paperkey, err)

    ds.clear(files, () => {
      event.sender.send('datasource:clear', paperkey)
    })
  })
})

ipcMain.on('datasource:remove', (event, dskey) => {
  getdatasource.fetch(dskey, (err, ds) => {
    if (err) return event.sender.send('datasource:remove', dskey, err)

    ds.del(dskey)
    event.sender.send('datasource:remove', dskey, err, ds.name)
  })
})

ipcMain.on('datasource:ready', (event, dskey) => {
  getdatasource.fetch(dskey, (err, ds) => {
    if (err) event.returnValue = false
    event.returnValue = ds.ready()
  })
})

ipcMain.on('datasource:toggleactive', (event, dskey) => {
  getdatasource.fetch(dskey, (err, ds) => {
    if (err) return event.sender.send('datasource:toggleactive', dskey, err)

    ds.toggleActive()

    if (ds.stats.get('active').value()) {
      ds.maybeSyncMetadata(err => {
        if (err) return event.sender.send('datasource:toggleactive', dskey, err)
      })
    }

    event.sender.send('datasource:toggleactive', dskey)
  })
})

ipcMain.on('datasource:getpaper', (event, paper) => {
  getdatasource.fetch(paper.source, (err, ds) => {
    if (err) {
      return event.sender.send('datasource:getpaper', paper.key, err)
    }

    const download = ds.download(paper)
    if (!download) {
      return event.sender.send('datasource:getpaper', paper.key, 'datastore not ready')
    }

    download.on('progress', data => {
      event.sender.send('datasource:getpaper:progress', paper.key, data)
    })

    download.on('error', err => {
      event.sender.send('datasource:getpaper', paper.key, err)
    })

    download.on('end', () => {
      event.sender.send('datasource:getpaper:end', paper.key)
    })

    event.sender.send('datasource:getpaper', paper.key)
  })
})

ipcMain.on('datasource:articlestats', (event, paper) => {
  getdatasource.fetch(paper.source, (err, ds) => {
    if (err) return event.sender.send('datasource:articlestats', paper.key, err)

    if (!(ds && ds.articles && ds.articles.content)) {
      return event.sender.send('datasource:articlestats', paper.key, err, false)
    }

    ds.articlestats(paper.files, (err, stats) => {
      if (err) return event.sender.send('datasource:articlestats', paper.key, err)
      event.sender.send('datasource:articlestats', paper.key, err, true, stats)
    })
  })
})

ipcMain.on('datasource:getalldata', (event) => {
  event.returnValue = getdatasource.all().map(ds => ds.data())
})

ipcMain.on('datasource:getallspeeds', (event) => {
  event.returnValue = getdatasource.all().map(ds => ds.speed())
})

let activesearches = []

ipcMain.on('datasource:search', (event, active, query) => {
  const batchify = require('byte-stream')
  const pumpify = require('pumpify')
  const through = require('through2')

  const resultify = ds => {
    let count = 0

    const write = (hits, _, cb) => {
      count += hits.length

      hits.forEach(r => {
        r.source = ds.key
      })
      event.sender.send('datasource:search:receive', { hits: hits })
      cb()
    }

    const flush = cb => {
      if (count === 0) event.sender.send('datasource:search:receive', { hits: [] })
      event.sender.send('datasource:search:results', { count: count, source: ds.name })
      cb()
    }

    return through.obj(write, flush)
  }

  const cancelsearch = () => {
    if (activesearches.length > 0) {
      activesearches.forEach(resultstream => resultstream.destroy())
      activesearches = []
    }
  }

  ipcMain.on('datasource:search:cancel', (event) => {
    cancelsearch()
  })

  cancelsearch()

  active.forEach(ds => {
    getdatasource.fetch(ds.key, (err, source) => {
      if (err) return event.sender.send('datasource:search:error', err)

      const resultstream = pumpify(
          source.db.search(query),
          batchify(30),
          resultify(source)
        )

      activesearches.push(resultstream)
    })
  })
})
