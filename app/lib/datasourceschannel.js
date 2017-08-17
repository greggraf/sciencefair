const getdatasource = require('../client/lib/getdatasource')
const {ipcMain} = require('electron')


ipcMain.on('datasource:add', (event, source) => {
  getdatasource.fetch(source.key, (err, ds) => {
    if (err) return event.sender.send('datasources:add:reply', err, {success: false})

    if (source.active) ds.setActive()    
    ds.on('connected', event.sender.send('datasources:add:connected', 'pong'))
    ds.on('progress', event.sender.send('datasources:add:progress', 'pong'))

    ds.connect()

    if (getdatasource.all().length > 1) {
      event.sender.send('datasources:add:reply', null, {success: true, name: ds.name})
    }
  })
})

ipcMain.on('datasource:toggleactive', (event, key) => {
  getdatasource.fetch(key, (err, ds) => {
    if (err) return event.sender.send('datasources:toggleactive:reply', err)
    
    ds.toggleActive()
    
    if (ds.stats.get('active').value()) {
      ds.maybeSyncMetadata(err => {
        if (err) return event.sender.send('datasources:toggleactive:reply', err)
      })
    }
    
    event.sender.send('datasources:toggleactive:reply')
  })
})

ipcMain.on('datasource:download', (event, source) => {
  getdatasource.fetch(key, (err, ds) => {
    if (err) return event.sender.send('datasources:download:reply', err)
    const download = ds.download(source)
    if (!download) return null // datasource not ready
    debug('downloading', source.key)
 
    download.on('progress', data => {
      event.sender.send('datasources:download:progress', data)
    })

    download.on('error', err => {
      event.sender.send('datasources:download:error', err)
    })

    download.on('end', () => {
      event.sender.send('datasources:download:end')
    })

    event.sender.send('datasources:download:reply')
  })
})

ipcMain.on('datasource:articlestats', (event, source) => {
  getdatasource.fetch(source.key, (err, ds) => {
    if (err) return event.sender.send('datasources:articlestats:reply', err)
    
    if (!(ds && ds.articles && ds.articles.content)) {
      return event.sender.send('datasources:articlestats:reply', undefined, false)
    }

    ds.articlestats(source.files, (err, stats) => {
      if (err) return event.sender.send('datasources:articlestats:reply', err)
      event.sender.send('datasources:articlestats:reply', undefined, true, stats)
    })

    
    event.sender.send('datasources:articlestats:reply')
  })
})

ipcMain.on('datasource:clear', (event, key, files) => {
  getdatasource.fetch(key, (err, ds) => {
    if (err) return event.sender.send('datasources:clear:reply', err)
    
    ds.clear(files)
    
    event.sender.send('datasources:clear:reply')
  })
})

ipcMain.on('datasource:ready', (event, key) => {
  getdatasource.fetch(key, (err, ds) => {    
    event.returnValue = ds.ready()
  })
})

ipcMain.on('datasources:getalldata', (event) => {
  event.returnValue = getdatasource.all().map(ds => ds.data())
})

ipcMain.on('datasources:updatespeeds', (event) => {
  event.returnValue = getdatasource.all().map(ds => ds.speed())
})