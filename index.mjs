import { DiscordAdapter } from './src/DiscordAdapter.mjs'
import { Client, GatewayIntentBits } from 'discord.js'
export default {
    async use(robot) {
        robot.config = {
            DISCORD_TOKEN: process.env.DISCORD_TOKEN ?? null
        }
        const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions]})
        const adapter = new DiscordAdapter(robot, client)
        return adapter
    }
}