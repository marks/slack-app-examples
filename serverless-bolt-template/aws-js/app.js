'use strict';

// ------------------------------------------------------
// Bot app
// https://slack.dev/bolt/
const { App, ExpressReceiver } = require('@slack/bolt');
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver
});
module.exports.expressApp = expressReceiver.app;

// ------------------------------------------------------
// If you need to use API methods that are not listed on https://api.slack.com/bot-users#methods
// you need to use user api token instead like this:
const { WebClient } = require('@slack/web-api');
app.client = new WebClient(process.env.SLACK_API_TOKEN);

// ------------------------------------------------------

// React to "app_mention" events
app.event('app_mention', ({ event, say }) => {
  app.client.users.info({ user: event.user })
    .then(res => {
      if (res.ok) {
        say({
          text: `Hi! <@${res.user.name}>`
        });
      } else {
        console.error(`Failed because of ${res.error}`)
      }
    }).catch(reason => {
      console.error(`Failed because ${reason}`)
    })
});

// React to message.channels event
app.message('hello', ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hey there <@${message.user}>!`
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Click Me"
          },
          "action_id": "button_click"
        }
      }
    ]
  });
});

// Handle the click event (action_id: button_click) on a message posted by the above hello handler
app.action('button_click', ({ body, ack, say }) => {
  // Acknowledge the action
  ack();
  say(`<@${body.user.id}> clicked the button`);
});

// Handle `/echo` command invocations
app.command('/echo', async ({ command, ack, say }) => {
  // Acknowledge command request
  ack();
  say(`You said "${command.text}"`);
});

// A simple example to use WebApi client
app.message('42', ({ message }) => {
  // use chat.postMessage over say method
  app.client.chat.postMessage({
    channel: message.channel,
    text: 'The answer to life, the universe and everything',
    thread_ts: message.ts
  })
    .then(res => {
      if (res.ok) {
        console.log(`Succeeded ${JSON.stringify(res.message)}`)
      } else {
        console.error(`Failed because of ${res.error}`)
      }
    }).catch(reason => {
      console.error(`Failed because ${reason}`)
    })
})

// A simple example to use Webhook internally
app.message('webhook', ({ message }) => {
  const { IncomingWebhook } = require('@slack/webhook');
  const url = process.env.SLACK_WEBHOOK_URL;
  const webhook = new IncomingWebhook(url);
  webhook.send({
    text: message.text.split("webhook")[1],
    unfurl_links: true
  })
    .then((res) => {
      console.log(`Succeeded ${JSON.stringify(res)}`)
    }).catch(reason => {
      console.error(`Failed because ${reason}`)
    })
})

// Check the details of the error to handle cases where you should retry sending a message or stop the app
app.error((error) => {
  console.error(error);
});

// As long as you run this app as a "Serverless Framework" app, you don't need to have the following code
// (async () => {
//   // Start your app
//   await app.start(process.env.PORT || 3000);
//   console.log('⚡️ Bolt app is running!');
// })();

// ------------------------------------------------------
// OAuth flow
expressApp.get('/slack/installation', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const scopesCsv = 'commands,users:read,users:read.email,team:read'; // TODO: modify
  const state = 'randomly-generated-string'; // TODO: implement the logic
  const url = `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopesCsv}&state=${state}`;
  res.redirect(url);
});

expressApp.get('/slack/oauth', (req, res) => {
  // TODO: make sure if req.query.state is valid
  app.client.oauth.access({
    code: req.query.code,
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: process.env.SLACK_REDIRECT_URI
  })
    .then(apiRes => {
      if (apiRes.ok) {
        console.log(`Succeeded! ${JSON.stringify(apiRes)}`)
        // TODO: show a complete webpage here
        res.status(200).send(`Thanks!`);
      } else {
        console.error(`Failed because of ${apiRes.error}`)
        // TODO: show a complete webpage here
        res.status(500).send(`Something went wrong! error: ${apiRes.error}`);
      }
    }).catch(reason => {
      console.error(`Failed because ${reason}`)
      // TODO: show a complete webpage here
      res.status(500).send(`Something went wrong! reason: ${reason}`);
    });
});
