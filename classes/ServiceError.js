var statusCode;
var message;
export default class ServiceError extends Error {
    constructor(statusCode, message, name) {
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.name = name;
    }
}
