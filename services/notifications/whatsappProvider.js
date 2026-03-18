var axios = require('axios');

function createWhatsAppProvider(config) {
  async function sendWhatsAppText(recipientPhoneE164, textMessage) {
    var endpoint = 'https://graph.facebook.com/' +
      config.whatsapp.apiVersion +
      '/' +
      config.whatsapp.phoneNumberId +
      '/messages';

    try {
      var response = await axios.post(
        endpoint,
        {
          messaging_product: 'whatsapp',
          to: recipientPhoneE164,
          type: 'text',
          text: {
            body: textMessage
          }
        },
        {
          headers: {
            Authorization: 'Bearer ' + config.whatsapp.token,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      var messageId = response.data &&
        response.data.messages &&
        response.data.messages[0] &&
        response.data.messages[0].id
        ? response.data.messages[0].id
        : null;

      return {
        ok: true,
        status: 'accepted',
        messageId: messageId,
        providerPayload: response.data
      };
    } catch (error) {
      var statusCode = error.response ? error.response.status : 0;
      var classification = 'permanent';

      if (statusCode === 401 || statusCode === 403) {
        classification = 'auth';
      } else if (statusCode === 429) {
        classification = 'rate_limit';
      } else if (statusCode >= 500 || statusCode === 0) {
        classification = 'transient';
      }

      return {
        ok: false,
        status: 'failed',
        errorType: classification,
        statusCode: statusCode,
        providerPayload: error.response ? error.response.data : null,
        message: error.message
      };
    }
  }

  return {
    sendWhatsAppText: sendWhatsAppText
  };
}

module.exports = {
  createWhatsAppProvider: createWhatsAppProvider
};
