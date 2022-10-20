class Message {

    constructor(idSender, content, type, time, state) {
        this.idSender = idSender;
        this.content = content;
        this.type = type;
        this.time = time;
        this.state = state ?? 'notView';
    }
}
module.exports = Message;