import Adapter from 'hubot/src/adapter.js'
import HubotMessageFromDiscord from './HubotMessageFromDiscord.mjs'
import EventEmitter from 'node:events'
const CONTENT_LENGTH_LIMIT = 2_000

class DiscordAdapter extends Adapter {
    constructor(robot, client = new EventEmitter()) {
        super(robot)
        this.client = client
        this.client.on('error', this.errorHasOccurred.bind(this))
        this.client.on('messageUpdate', this.messageWasUpdated.bind(this))
        this.client.on('messageCreate', this.messageWasReceived.bind(this))
        this.client.once('ready', () => {
            this.emit('connected')
        })
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
    async reply(envelope, ...strings) {
        const tasks = []
        for await (let message of strings) {
            for (let part of this.breakUpMessage(message)) {
                tasks.push(envelope.user.message.reply(part))
            }
        }
        const responses = await Promise.all(tasks)
        this.emit('reply', responses)
        return responses
    }
    errorHasOccurred(error) {
        console.error(error)
    }
    update(key, old, value) {
        console.log('hi', key, old, value)
    }
    run() {
        return this.client.login(this.robot.config.DISCORD_TOKEN)
            .then(() => this.robot.logger.info('Successfully logged in'))
            .catch(e => this.robot.logger.error(e, 'Failed to log in'))
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
}
export {
    DiscordAdapter
}  