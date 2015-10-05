import DAOBase from './DAOBase';

export default class File extends DAOBase {
    getFiles(userId, next) {
        var query = 'SELECT id, name, versions, viewers, editors, created, modified ' +
            'FROM mindweb.file WHERE owner=:userId ALLOW FILTERING';
        this.execute(query, {userId: userId}, next);
    }

    getFile(fileId, next) {
        var query = 'SELECT id, name, owner, public, viewers, editors, versions FROM mindweb.file WHERE id=:fileId';
        this.execute(query, {fileId: fileId}, next);
    }

    createFile(fileId, fileName, userId, versions, next) {
        var query = 'INSERT INTO mindweb.file (id, name, owner, versions, created, modified)' +
            'VALUES (:fileId,:fileName,:userId,:versions,dateOf(now()),dateOf(now()))';
        this.execute(query, {fileId: fileId, fileName: fileName, userId: userId, versions: versions}, next);
    }

    updateFile(fileId, fileName, userId, versions, next) {
        var query = 'INSERT INTO mindweb.file (id, name, owner, versions, modified)' +
            'VALUES (:fileId,:fileName,:userId,:versions,dateOf(now()))';
        this.execute(query, {fileId: fileId, fileName: fileName, userId: userId, versions: versions}, next);
    }

    getFileByUserAndName(userId, fileName, next) {
        var query = 'SELECT id,versions FROM mindweb.file WHERE owner=:userId AND name=:fileName ALLOW FILTERING';
        this.execute(query, {userId: userId, fileName: fileName}, next);
    }

    deleteById(fileId, next) {
        var query = 'DELETE FROM mindweb.file WHERE id = :fileId';
        this.execute(query, {fileId: fileId}, next);
    }

    renameById(fileId, newName, next) {
        var query = 'UPDATE mindweb.file set name=:newName WHERE id = :fileId';
        this.execute(query, {fileId: fileId, newName: newName}, next);
    }

    shareFile(fileId, isPublic, editors, viewers, next) {
        var query = 'UPDATE mindweb.file set public=:isPublic, viewers=:viewers, editors=:editors WHERE id = :fileId';
        this.execute(query, {fileId: fileId, isPublic: isPublic, viewers: viewers, editors: editors}, next);
    }
}