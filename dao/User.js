import DAOBase from './DAOBase';

export default class User extends DAOBase {
    getUser(authId, next) {
        var query = 'SELECT id, name, authId, avatarUrl, created, modified FROM mindweb.user WHERE authId=:authId ALLOW FILTERING';
        this.execute(query, {authId: authId}, next);
    }

    createUser(userId, authId, name, avatarUrl, next) {
        var query = 'INSERT INTO mindweb.user (id, name, authId, avatarUrl, created, modified) ' +
            'VALUES (:userId, :name, :authId, :avatarUrl, dateOf(now()), dateOf(now()))';
        this.execute(query, {userId: userId, name: name, authId: authId, avatarUrl: avatarUrl}, next);
    }

    deleteUser(userId, next) {
        var query = 'DELETE FROM mindweb.user WHERE id=:userId';
        this.execute(query, {userId: userId}, next);
    }
}