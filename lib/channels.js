const frida = require('frida')
const IO = require('koa-socket')

const {
  serializeDevice,
  serializeApp,
  FridaUtil
} = require('./utils')

const deviceMgr = frida.getDeviceManager()
const channels = {}

for (let channel of ['devices', 'session', 'shell']) {
  channels[channel] = new IO({ namespace: '/' + channel, ioOptions: { path: '/msg' } })
}

deviceMgr.events.listen('added', async device => {
  channels.devices.broadcast('deviceAdd', serializeDevice(device))
})

deviceMgr.events.listen('removed', async device => {
  channels.devices.broadcast('deviceRemove', serializeDevice(device))
})

channels.session.on('attach', async(ctx, { device, bundle }) => {
  console.log('connect to', device, bundle)

  let { socket, acknowledge } = ctx
  let dev, session, app

  if (!device || !bundle)
    return socket.disconnect('connection_error: invalid parameters')

  try {
    dev = await frida.getDevice(device)
    if (dev.type != 'tether')
      throw new Error('device not found')

    socket.emit('device', serializeDevice(dev))
    let apps = await dev.enumerateApplications()
    app = apps.find(app => app.identifier == bundle)
    if (!app)
      throw new Error('app not installed')

    socket.emit('app', serializeApp(app))
    session = await dev.attach(app.name)
    acknowledge({
      status: 'ok',
      pid: session.pid
    })
  } catch(ex) {
    acknowledge({status: 'error', msg: ex})
    console.error(ex)
    return socket.disconnect(ex)
  }

  session.events.listen('detached', reason => {
    socket.emit('detached', reason)
    socket.disconnect('session detached')
  })

  // todo: remove koa-socket
  // totally a crap
  socket.socket.on('modules', async data => {
    let modules = await session.enumerateModules()
    socket.emit('modules', modules)
  }).on('detach', async data => {
    socket.disconnect()
  }).on('checksec', async data => {

  }).on('ranges', async ({ protection }) => {
    let ranges = await session.enumerateRanges(protection)
    socket.emit('ranges', ranges)
  }).on('exports', async ({ module }) => {
    let symbols = session.enumerateExports(module)
    socket.emit('exports', symbols)
  }).on('classes', async () => {
    // todo: agent.exports
  }).on('methods', async ({ clz }) => {
    // todo: agent.exports.classes
  }).on('addHook', async ({ clz, method }) => {

  }).on('unhook', async ({ id }) => {
    // todo:
  }).on('disconnect', async() => {
    await session.detach()
  })

  console.log('?')
})

exports.attach = app => {
  for (let namespace of Object.values(channels)) {
    namespace.attach(app)
  }
}