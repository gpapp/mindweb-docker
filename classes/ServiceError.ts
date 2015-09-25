
class ServiceError implements Error {
    name:string;
    message:string;
    statusCode:number;


    constructor(statusCode:number, message:string, name:string="ServiceError") {
        this.statusCode = statusCode;
        this.message = message;
        this.name = name;
    }

}
export = ServiceError;
