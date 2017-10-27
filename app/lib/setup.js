const C = require('../constants')
const mkdirp = require('mkdirp').sync
const fs = require('fs-extra')
const path = require('path')
const {ipcMain} = require('electron')

mkdirp(C.DATAROOT)
mkdirp(C.COLLECTION_PATH)
mkdirp(C.DATASOURCES_PATH)

ipcMain.on('datasources:updateKeys', (event, arg) => {
  const keys = fs.readdirSync(
    C.DATASOURCES_PATH
  ).filter(
    file => fs.statSync(path.join(C.DATASOURCES_PATH, file)).isDirectory()
  )

  event.sender.send('datasources:keysUpdated', keys)
})

require('./defaultsources')
require('./contentserver')

if (process.env.FEATURE === 'ipc') {
  require('./datasourceschannel')
}
