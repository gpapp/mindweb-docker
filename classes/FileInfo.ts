import User = require('./User');
class FileInfo {
    id:string;
    name:string;
    owner:string;
    isPublic:boolean;
    versions:Array<string>;
    viewers:Array<string>;
    editors:Array<string>;

    error:string;

    constructor(o:Object) {
        this.id = o.id;
        this.name = o.name;
        this.owner = o.owner;
        this.isPublic = o.isPublic;
        this.versions = o.versions;
        this.viewers = o.viewers;
        this.editors = o.editors;
        this.error = o.error;
    }

    public canView(user:User):boolean {
        if (this.owner === user.id) return true;
        if (this.isPublic) return true;
        if (this.viewers != null) {
            if (user.id in this.viewers) {
                return true;
            }
        }
        if (this.editors != null) {
            if (user.id in this.editors) {
                return true;
            }
        }
        return false;
    }
    public canEdit(user:User):boolean {
        if (this.owner === user.id) return true;
        if (this.editors != null) {
            if (user.id in this.editors) {
                return true;
            }
        }
        return false;
    }


}
export = FileInfo;