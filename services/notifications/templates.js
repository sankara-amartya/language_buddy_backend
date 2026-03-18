function renderNotificationMessage(input) {
  if (input && input.message) {
    return input.message;
  }

  return 'You have a new notification.';
}

module.exports = {
  renderNotificationMessage: renderNotificationMessage
};
