import { DiscordAdapter } from './src/DiscordAdapter.mjs'
import { Client, GatewayIntentBits, Partials } from 'discord.js'
export default {
    async use(robot) {
        if (!robot.config) {
            robot.config = {}
        }
        robot.config = Object.assign(robot.config, {
            HUBOT_DISCORD_TOKEN: process.env.HUBOT_DISCORD_TOKEN ?? null
        })
        const client = new Client({intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions
        ], partials: [Partials.Channel, Partials.Message, Partials.User, Partials.Reaction]})
        const adapter = new DiscordAdapter(robot, client)
        return adapter
    }
}