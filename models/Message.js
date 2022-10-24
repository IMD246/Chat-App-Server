class Message {

    constructor(idSender, content, type, time, state, isLast) {
        this.idSender = idSender;
        this.content = content;
        this.type = type;
        this.time = time;
        this.state = state ?? 'notView';
        this.isLast = isLast ?? false;
    }
}
module.exports = Message;