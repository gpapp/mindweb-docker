export default  class DAOBase {
    constructor(client) {
        this.client = client;
    }

    execute(query, params, next) {
        this.client.execute(query, params, {prepare: true}, next);
    }
}