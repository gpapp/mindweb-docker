export default class File {
    id;
    name;
    owner;
    viewers;
    editors;
    isPublic;
    versions;

    constructor(id, name, owner, viewers, editors, isPublic, versions) {
        this.id = id;
        this.name = name;
        this.owner = owner;
        this.viewers = viewers;
        this.editors = editors;
        this.isPublic = isPublic;
        this.versions = versions;
    }


    canView(user) {
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

    canEdit(user) {
        if (this.owner === user.id) return true;
        if (this.editors != null) {
            if (user.id in this.editors) {
                return true;
            }
        }
        return false;
    }
}