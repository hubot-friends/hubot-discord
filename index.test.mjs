import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Robot from 'hubot/src/robot.js'
import Adapter from 'hubot/src/adapter.js'
import Message from 'hubot/src/message.js'
import Module from 'module'
import { EventEmitter } from 'node:events'

const { TextMessage } = Message

const hookModuleToReturnMockFromRequire = (module, mock) => {
  const originalRequire = Module.prototype.require
  Module.prototype.require = function() {
    if (arguments[0] === module) {
      return mock;
    }
    return originalRequire.apply(this, arguments)
  }
}

class DiscordClient extends EventEmitter {
    constructor() {
        super()
    }
}

class HubotMessageFromDiscord extends TextMessage {
    constructor(message) {
        super(Object.assign({
            room: message.channelId,
            name: message.author.username,
            message: message
        }, message.author), message.content, message.channel)
    }
}

class DiscordAdapter extends Adapter {
    constructor(robot, client = new DiscordClient()) {
        super(robot)
        this.client = client
        this.client.on('error', this.errorHasOccurred.bind(this))
        this.client.on('messageUpdate', this.messageWasUpdated.bind(this))
        this.client.on('messageCreate', this.messageWasReceived.bind(this))
    }
    messageWasUpdated(oldMessage, newMessage) {
        this.robot.receive(new HubotMessageFromDiscord(newMessage))
    }
    messageWasReceived(message) {
        this.robot.receive(new HubotMessageFromDiscord(message))
    }
    send(envelope, ...strings) {
        this.emit('send', envelope, ...strings)
    }
    errorHasOccurred(error) {
        console.error(error)
    }
    update(key, old, value) {
        console.log('hi', key, old, value)
    }
    run() {
        this.client.once('ready', () => {
            this.emit('connected')
        })

    }
    breakUpMessage(text) {
        const message = []
        while (text.length > 0) {
            message.push(text.slice(0, 2000))
            text = text.slice(1999)
        }
        return message
    }
}

describe('Content', () => {
    it('Limits content to 2000 characters', (t, done) => {
        const text = 'a'.repeat(2000)
        const adapter = new DiscordAdapter()
        const actual = adapter.breakUpMessage(text)
        assert.equal(actual.length, 2)
        assert.equal(actual[0].length, 2000)
        assert.equal(actual[1].length, 1)
        done()
    })
})
describe('Discord Adapter', () => {
    it('Respond to @test-bot Hello World', (t, done) => {
        const client = new DiscordClient()
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            use(robot) {
                return new DiscordAdapter(robot, client)
            }
        })
        const robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.loadAdapter().then(() => {
            robot.run()
            robot.respond(/Hello World/, (res) => {
                assert.equal(res.message.text, '@test-bot Hello World')
                robot.shutdown()
                done()
            })
            client.emit('ready')
            client.emit('messageCreate', {
                content: '@test-bot Hello World',
                channelId: 'test-room',
                author: {
                    username: 'test-user'
                }
            })    
        })
    })

    it('Responds to updating message', (t, done) => {
        const client = new DiscordClient()
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            use(robot) {
                return new DiscordAdapter(robot, client)
            }
        })
        const robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.loadAdapter().then(() => {
            robot.run()
            robot.respond(/Hello World/, (res) => {
                assert.equal(res.message.text, '@test-bot Hello World')
                robot.shutdown()
                done()
            })
            client.emit('ready')
            client.emit('messageUpdate', {
                content: '@test-bot Hello world',
                channelId: 'test-room',
                author: {
                    username: 'test-user'
                }
            },
            {
                content: '@test-bot Hello World',
                channelId: 'test-room',
                author: {
                    username: 'test-user'
                }
            })    
        })
    })
})