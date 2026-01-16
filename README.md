# Hubot Discord Adapter

This is a [Discord](https://discord.com/developers/applications) adapter for [Hubot](https://github.com/hubotio/hubot/), a popular chatbot framework. With this adapter, you can connect your Hubot instance to a Discord server and interact with users through chat.

## Installation

To use this adapter, you'll need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your system. Then, you can install `hubot-discord` using npm:

```sh
npm install @hubot-friends/hubot-discord
```

## Discord Setup

Before you can use this adapter, you need to create a Discord application and bot. Follow these steps:

### 1. Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click the 'New Application' button in the top right
3. Enter a name for your application and click 'Create'
4. You'll be taken to your new application's dashboard

### 2. Create a Bot

1. In your application's dashboard, click on 'Bot' in the left sidebar
2. Click the 'Add Bot' button and confirm by clicking 'Yes, do it!'
3. Your bot is now created. You can customize its username and avatar here
4. Under the 'Token' section, click 'Reset Token' to generate a new token
5. Copy this token - you'll need it for the `HUBOT_DISCORD_TOKEN` environment variable
   - **Important**: Never share this token publicly or commit it to version control

### 3. Configure Bot Permissions

1. Still in the 'Bot' section, scroll down to 'Privileged Gateway Intents'
2. Enable the following intents based on your needs:
   - **Message Content Intent**: Required if you want to use `robot.hear` to respond to messages
   - **Server Members Intent**: Enable if your bot needs access to member information
   - **Presence Intent**: Enable if your bot needs to track user presence

### 4. Create an Installation URL for a Private App

To add your bot to a Discord server, you need to create an OAuth2 authorization URL:

1. In your application's dashboard, click on 'OAuth2' in the left sidebar
2. Click on 'URL Generator' under OAuth2
3. Under 'Scopes', select:
   - `bot` - Required for bot functionality
   - `applications.commands` - Optional, if you plan to use slash commands
4. Under 'Bot Permissions', select the permissions your bot needs. At minimum:
   - `Read Messages/View Channels` - To see channels
   - `Send Messages` - To send messages
   - `Read Message History` - To read message context
   - `Add Reactions` - If your bot needs to add reactions
   - You may need additional permissions depending on your bot's functionality
5. Copy the generated URL at the bottom of the page
6. Open this URL in a browser while logged into Discord
7. Select the server you want to add the bot to from the dropdown
8. Click 'Authorize' and complete any additional verification steps

Your bot should now appear in your Discord server!

## Configuration

To configure `hubot-discord`, you'll need to set a few environment variables:

- `HUBOT_DISCORD_TOKEN`: Your Discord bot token. You can create a new bot and get a token from the [Discord Developer Portal](https://discord.com/developers/applications).

Don't forget to add your instance of Hubot to the channels with which you want to interact with it.

You can set these environment variables in a `.env` file in your Hubot project directory, or by exporting them in your shell.

## Usage

To start your Hubot instance with the Discord adapter, run (if `hubot` is in your `PATH`):

```sh
HUBOT_DISCORD_TOKEN=<your-bot-token> hubot -a @hubot-friends/hubot-discord -n jbot
```

Replace `<your-bot-token>` with your Discord bot token.

Once your Hubot instance is running, you can interact with it through chat in the Discord channel you've added Hubot to.

## robot.hear

If you want to implement `robot.hear`ing, you'll have to enable **Message Content Intent** in the [Discord Developer Portal](https://discord.com/developers) in your Application -> Bot section.

## Contributing

If you find a bug or have a feature request, please open an issue on the [GitHub repository](https://github.com/hubot-friends/hubot-discord). Pull requests are also welcome!

## License

`hubot-discord` is released under the [MIT License](https://opensource.org/licenses/MIT).