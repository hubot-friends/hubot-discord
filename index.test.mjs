import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import Robot from 'hubot/src/robot.js'
import Module from 'module'
import { EventEmitter } from 'node:events'
import { DiscordAdapter } from './src/DiscordAdapter.mjs'
import init from './index.mjs'
import { Embed, EmbedBuilder, AttachmentBuilder, MessagePayload } from 'discord.js'


let originalRequire = Module.prototype.require
const hookModuleToReturnMockFromRequire = (module, mock) => {
  Module.prototype.require = function() {
    if (arguments[0] === module) {
      return mock;
    }
    return originalRequire.apply(this, arguments)
  }
}
class GuildMemberManager {
    #cache = new Map()
    constructor(guild) {
        this.guild = guild
        this.#cache.set('test-user-id', {
            roles: {
                cache: [
                    {
                        name: 'allowed'
                    }
                ]
            }
        })
    }
    async fetch(options) {
        return this.#cache.get(options)
    }
}
class Guild {
    constructor(client) {
        this.client = client
        this.members = new GuildMemberManager(this)
    }
}
class GuildManager {
    constructor(client) {
        this.client = client
        this.cache = new Map()
    }
}
class DiscordClient extends EventEmitter {
    constructor() {
        super()
        this.user = {
            id: 'test-bot'
        }
        this.guilds = new GuildManager(this)
        this.guilds.cache.set('test-guild', new Guild(this))
    }
    async login(token){
        return token
    }
}

class DiscordClientFailsOnLogin extends EventEmitter {
    #errorMessage = null
    constructor(options) {
        super()
        this.user = {
            id: 'test-bot'
        }
        this.guilds = new GuildManager(this)
        this.guilds.cache.set('test-guild', new Guild(this))
        this.#errorMessage = options?.errorMessage ?? 'getaddrinfo EAI_AGAIN discord.com discord.com'
    }
    async login(token){
        throw new Error(this.#errorMessage)
    }
}
const createParagraphGreaterOfLength = length => {
  let paragraph = '';
  while (paragraph.length < length) {
    paragraph += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
  }
  return paragraph;
}

describe('Unit Tests', () => {
    it('Breaks up text into 2000 long chunks', (t, done) => {
        const text = 'a'.repeat(2000)
        const adapter = new DiscordAdapter()
        const actual = adapter.breakUpMessage(text)
        assert.equal(actual.length, 2)
        assert.equal(actual[0].length, 2000)
        assert.equal(actual[1].length, 1)
        done()
    })
})
describe('Initialize Adapter', () => {
    before(() => {
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            async use(robot) {
                return await init(robot)
            }
        })
    })
    it('Should initialize adapter but get an invalid token error', async () => {
        const robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.config = {
            DISCORD_TOKEN: 'test-token'
        }
        await robot.loadAdapter('./index.mjs')
        assert.ok(robot.adapter instanceof DiscordAdapter)
        let actual = ''
        try {
            await robot.run()
        } catch (error) {
            actual = error.message
        } finally {
            robot.shutdown()
        }
        assert.match(actual, /invalid token/ig)
    })
})

describe('Throws an error when logging in', () => {
    let robot = null
    let client = null
    before(async () => {
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            use(robot) {
                return new DiscordAdapter(robot, client)
            }
        })
        client = new DiscordClientFailsOnLogin()
        robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.config = {
            DISCORD_TOKEN: 'test-token'
        }
        await robot.loadAdapter()
    })
    after(() => {
        robot.shutdown()
    })
    it('Should throw an EAI_AGAIN error', async () => {
        let actual = ''
        try {
            await robot.run()
        } catch (error) {
            actual = error.message
        }
        assert.equal(actual, 'getaddrinfo EAI_AGAIN discord.com discord.com')
    })
})
describe('Discord Adapter', () => {
    let robot = null
    let client = null
    before(async () => {
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            use(robot) {
                return new DiscordAdapter(robot, client)
            }
        })
        client = new DiscordClient()
        robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.config = {
            DISCORD_TOKEN: 'test-token'
        }
        await robot.loadAdapter()
        await robot.run()
        client.emit('ready')
    })
    after(() => {
        robot.shutdown()
    })

    it('Respond to @test-bot Hello World', (t, done) => {
        robot.respond(/Hello World$/, (res) => {
            assert.equal(res.message.text, '@test-bot Hello World')
            done()
        })
        client.emit('messageCreate', {
            content: '@test-bot Hello World',
            channelId: 'test-room',
            author: {
                username: 'test-user'
            }
        })    
    })

    it('Responds to updating message', (t, done) => {
        robot.respond(/Hello World Update/, (res) => {
            assert.equal(res.message.text, '@test-bot Hello World Update')
            done()
        })
        client.emit('messageUpdate', {
            content: '@test-bot Hello world',
            channelId: 'test-room',
            author: {
                username: 'test-user'
            }
        },
        {
            content: '@test-bot Hello World Update',
            channelId: 'test-room',
            author: {
                username: 'test-user'
            }
        })
    })

    it('Breaks up messages longer than 2000 characters', (t, done) => {
        let message = null
        robot.respond(/Hello World Break Up/, async res => {
            message = createParagraphGreaterOfLength(2010)
            await res.reply(message)
        })
        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-1') return
            const expected = robot.adapter.breakUpMessage(message)
            assert.deepEqual(actual.map(m => m.content), expected)
            done()
        })
        client.emit('messageCreate', {
            content: '@test-bot Hello World Break Up',
            channelId: 'test-room-1',
            author: {
                username: 'test-user'
            },
            async reply(message) {
                return {
                    content: message,
                    toString() {
                        return message
                    }
                }
            }
        })
    })

    it('Replies with an Embed message', (t, done) => {
        const response = new Embed({
            title: 'Test Embed',
            description: 'Test Description',
            fields: [
                {
                    name: 'Test Field',
                    value: 'Test Value'
                }
            ],
            footer: {
                text: 'Test Footer'
            }
        })
        robot.respond(/Embed message$/, (res) => {
            res.reply(response)
        })
        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-2') return
            done()
        })
        client.emit('messageCreate', {
            content: '@test-bot Embed message',
            channelId: 'test-room-2',
            author: {
                username: 'test-user'
            },
            async reply(message) {
                assert.deepEqual(message.embeds[0], response)
            }
        })    
    })

    it('Replies with an EmbedBuilder message', (t, done) => {
        const response = new EmbedBuilder()
            .setTitle('Test Embed')
            .setDescription('Test Description')
            .addFields([
                {
                    name: 'Test Field',
                    value: 'Test Value'
                }
            ])

        robot.respond(/EmbedBuilder message$/, (res) => {
            res.reply(response)
        })

        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-2.5') return
            done()
        })

        client.emit('messageCreate', {
            content: '@test-bot EmbedBuilder message',
            channelId: 'test-room-2.5',
            author: {
                username: 'test-user'
            },
            async reply(message) {
                assert.ok(message.embeds[0] instanceof EmbedBuilder)
            }
        })
    })

    it("When you don't want to use a `discord.js` Class to just send files, you can send a payload with a files array instead.", (t, done) => {
        const message = {
            channelId: 'test-room-3',
            guildId: 'test-guild',
            id: 'test-id',
            content: '@test-bot Send a file',
            author: {
                username: 'test-user'
            },
            attachments: new Map(),
            async reply(message) {
                assert.ok(message.files[0] instanceof AttachmentBuilder)
            }
        }
        message.attachments.set('test-file.png', {
            '1140091176209363044': {
                url: 'https://cdn.discordapp.com/attachments/1023316778450964534/1140091176209363044/image.png'
            }
        })

        robot.respond(/Send a file$/, (res) => {
            const payload = {
                files: [{
                    file: Buffer.from('test', 'utf-8'),
                    name: 'test.ico',
                    description: `test.ico as an ICO file.`
                }]
            }
            res.reply(payload)
        })
        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-3') return
            done()
        })
        client.emit('messageCreate', message)    
    })

    it("If you want to use `discord.js`'s AttachmentBuilder to reply with files.", (t, done) => {
        const message = {
            channelId: 'test-room-4',
            guildId: 'test-guild',
            id: 'test-id',
            content: '@test-bot Reply with AttachmentBuilder',
            author: {
                username: 'test-user'
            },
            attachments: new Map(),
            async reply(message) {
                assert.ok(message.files[0] instanceof AttachmentBuilder)
            }
        }
        message.attachments.set('test-file.png', {
            '12341234123': {
                url: 'https://cdn.discordapp.com/attachments/12341234213/12431234213/image.png'
            }
        })

        robot.respond(/Reply with AttachmentBuilder$/, (res) => {
            const payload = {
                files: [{
                    file: Buffer.from('test', 'utf-8'),
                    name: 'test.ico',
                    description: `test.ico as an ICO file.`
                }]
            }
            res.reply(payload)
        })
        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-4') return
            done()
        })
        client.emit('messageCreate', message)    
    })

    it('Replying with an object that has a body property should result in a MessagePayload being sent to Discord', (t, done) => {
        const message = {
            channelId: 'test-room-5',
            guildId: 'test-guild',
            id: 'test-id',
            content: '@test-bot Reply with an object that has a body property',
            author: {
                username: 'test-user'
            },
            async reply(message) {
                assert.ok(message instanceof MessagePayload)
            }
        }
        robot.respond(/Reply with an object that has a body property$/, (res) => {
            res.reply({
                body: 'Helo worlds'
            })
        })
        robot.adapter.on('reply', (envelope, actual) => {
            if(envelope.room !== 'test-room-5') return
            done()
        })
        client.emit('messageCreate', message)    
    })
})

describe('Access Control', () => {
    let robot = null
    let client = null
    before(async () => {
        hookModuleToReturnMockFromRequire('@hubot-friends/hubot-discord', {
            use(robot) {
                return new DiscordAdapter(robot, client)
            }
        })
        client = new DiscordClient()
        robot = new Robot('@hubot-friends/hubot-discord', false, 'test-bot', null)
        robot.config = {
            DISCORD_TOKEN: 'test-token'
        }
        await robot.loadAdapter()
        await robot.run()
        client.emit('ready')
    })
    after(() => {
        robot.shutdown()
    })

    it('Check if user is in a particular role', (t, done) => {
        const message = {
            channelId: 'test-room-6',
            guildId: 'test-guild',
            id: 'test-id',
            content: '@test-bot allowed message',
            author: {
                username: 'test-user',
                id: 'test-user-id'
            },
            async reply(message) {
                assert.ok(message instanceof MessagePayload)
            }
        }
        robot.respond(/allowed message/, async res => {
            assert.ok(await res.robot.adapter.isInRole(res.message.user, ['allowed'], res.message.user.message.guildId))
            done()
        })
        client.emit('messageCreate', message)
    })
})