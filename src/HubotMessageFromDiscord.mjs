import Message from 'hubot/src/message.js'
const { TextMessage } = Message

class HubotMessageFromDiscord extends TextMessage {
    constructor(message) {
        super(Object.assign({
            room: message.channelId,
            name: message.author.username,
            message: message
        }, message.author), message.content, message.channel)
    }
}

export default HubotMessageFromDiscord
