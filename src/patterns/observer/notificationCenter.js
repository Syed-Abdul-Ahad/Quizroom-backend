class NotificationCenter {
  constructor() {
    if (NotificationCenter.instance) {
      return NotificationCenter.instance;
    }

    this.observersByEvent = new Map();
    NotificationCenter.instance = this;
  }

  subscribe(eventName, observer) {
    const observers = this.observersByEvent.get(eventName) || [];
    observers.push(observer);
    this.observersByEvent.set(eventName, observers);
  }

  async notify(eventName, payload) {
    const observers = this.observersByEvent.get(eventName) || [];

    for (const observer of observers) {
      await observer.update(eventName, payload);
    }
  }
}

module.exports = new NotificationCenter();
