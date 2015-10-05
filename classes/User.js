export default class User {
    constructor(id, name, authId, avatarUrl, created, modified) {
        this.id = id;
        this.name = name;
        this.authId = authId;
        this.avatarUrl = avatarUrl;
        this.created = created;
        this.modified = modified;
    }
}