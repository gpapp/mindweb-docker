import DAOBase from './DAOBase';

export default class FileVersion extends DAOBase {
    createNewVersion(id, version, content, next) {
        var query = 'INSERT INTO mindweb.fileVersion (id, version, created, modified, content) ' +
            'VALUES (:id,:version,dateOf(now()),dateOf(now()), textAsBlob(:content))';
        this.execute(query, { id: id, version: version, content: content }, next);
    }
    updateVersion(id, content, next) {
        var query = 'INSERT INTO mindweb.fileVersion (id, modified, content) ' +
            'VALUES (:id, dateOf( now() ), textAsBlob(:content))';
        this.execute(query, { id: id, content: content }, next);
    }
    getContent(fileVersionId, next) {
        var query = 'SELECT version,blobAsText(content) as content FROM mindweb.fileVersion WHERE id=:fileVersionId';
        this.execute(query, { fileVersionId: fileVersionId }, next);
    }
    deleteById(fileId, next) {
        var query = 'DELETE FROM mindweb.fileVersion WHERE id = :fileId';
        this.execute(query, { fileId: fileId }, next);
    }
}