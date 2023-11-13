import EventEmitter from 'node:events'
import { Events, ShardEvents, Embed, EmbedBuilder, AttachmentBuilder, MessagePayload } from 'discord.js'
import { TextMessage, Adapter } from 'hubot'
const CONTENT_LENGTH_LIMIT = 2_000

const mapToTextMessage = (message, botName, client) => {
    const content = message.content.replace(`<@${client?.user?.id}> `, `@${botName} `)
    const user = Object.assign({
        room: message.channelId,
        name: message.author.username,
        message: message
    }, message.author)
    return new TextMessage(user, content, message.id, message)
}

class DiscordAdapter extends Adapter {
    constructor(robot, client = new EventEmitter()) {
        super(robot)
        this.client = client
        this.client.on(Events.Error, this.errorHasOccurred.bind(this))
        this.client.on(Events.MessageUpdate, this.messageWasUpdated.bind(this))
        this.client.on(Events.MessageCreate, this.messageWasReceived.bind(this))
        this.client.on(ShardEvents.Message, this.messageWasReceived.bind(this))
        this.client.once(Events.ClientReady, () => {
            this.emit('connected')
        })
    }
    #wasToBot(message, botId) {
        return message.mentions && !message.mentions.users.find(u => u.id == botId)
    }
    messageWasUpdated(oldMessage, newMessage) {
        if(newMessage.author.bot) return
        if(this.#wasToBot(newMessage, this.client.user.id)) return
        this.robot.receive(mapToTextMessage(newMessage, this.robot.name || this.robot.alias, this.client))
    }
    messageWasReceived(message) {
        if(message.author.bot) return
        if(!message.guildId && message.content.indexOf(this.client.user.id) == -1) {
            message.content = `<@${this.client.user.id}> ${message.content}`
            message.mentions.users.set(this.client.user.id, this.client.user)
        }

        if(this.#wasToBot(message, this.client.user.id)) return
        const textMessage = mapToTextMessage(message, this.robot.name || this.robot.alias, this.client)
        this.robot.receive(textMessage)
    }
    async send(envelope, ...strings) {
        const channel = this.client.channels.cache.get(envelope.room)
        const responses = await this.sendWithDelegate(channel.send.bind(channel), envelope, ...strings)
        this.emit('send', envelope, responses)
        return responses
    }
    async reply(envelope, ...strings) {
        const responses = await this.sendWithDelegate(envelope.user.message.reply.bind(envelope.user.message), envelope, ...strings)
        this.emit('reply', envelope, responses)
        return responses
    }
    async sendWithDelegate(delegate, envelope, ...strings) {
        const tasks = []
        for (let message of strings) {
            if(message instanceof Embed || message instanceof EmbedBuilder) {
                tasks.push(delegate({embeds: [message]}))
                continue
            }

            if(message instanceof AttachmentBuilder) {
                resp.push(delegate({ files: [message] }))
                continue
            }

            if(typeof message == 'object') {   
                if(message.files){
                    let files = message.files.map(f => {
                        let a = new AttachmentBuilder(f.file)
                        a.setName(f.name)
                        a.setDescription(f.description)
                        return a
                    })
                    tasks.push(delegate({files: files}))
                } else {
                    let payload = new MessagePayload(envelope.user.message, message)
                    payload = Object.assign(payload, message)
                    tasks.push(delegate(payload))
                }
                continue
            }

            for (let part of this.breakUpMessage(message)) {
                tasks.push(delegate(part))
            }
        }
        const responses = await Promise.all(tasks)
        return responses
    }

    errorHasOccurred(error) {
        console.error(error)
    }
    update(key, old, value) {
        console.log('hi', key, old, value)
    }
    async run() {
        try {
            await this.client.login(this.robot.config.HUBOT_DISCORD_TOKEN)
            this.robot.logger.info('Successfully logged in')
        } catch (error) {
            this.robot.logger.error(error, 'Failed to log in')
            throw error
        }
    }
    async close () {
        await this.client.destroy()
    }
    breakUpMessage(text) {
        const message = []
        while (text.length > 0) {
            message.push(text.slice(0, CONTENT_LENGTH_LIMIT))
            text = text.slice(CONTENT_LENGTH_LIMIT - 1)
        }
        return message
    }
    async isInRole(user, roles, guildId) {
        const guild = this.client.guilds.cache.get(guildId)
        const member = await guild.members.fetch(user.id)
        return member.roles.cache.some(role => roles.some(r => r.toLowerCase() == role.name.toLowerCase()))
    }
}
export {
    DiscordAdapter
}  