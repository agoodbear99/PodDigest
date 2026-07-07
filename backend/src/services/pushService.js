const { Expo } = require('expo-server-sdk');
const { removeTokenEverywhere } = require('./subscriptionStore');

const expo = new Expo();

/**
 * Sends the same notification to a batch of Expo push tokens, pruning any
 * token the Expo push service reports as no longer registered (e.g. the app
 * was uninstalled).
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object }} message
 */
async function sendPushNotifications(tokens, { title, body, data }) {
  const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
  const messages = validTokens.map((token) => ({ to: token, sound: 'default', title, body, data }));
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          removeTokenEverywhere(chunk[index].to).catch(() => {});
        }
      });
    } catch (err) {
      console.error('Failed to send a push notification batch:', err.message);
    }
  }
}

module.exports = { sendPushNotifications };
