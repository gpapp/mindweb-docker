import Node from "./Node";

class FileContent {
    rootNode;
    $;

    constructor(data) {
        var parsed = JSON.parse(data);
        this.$ = parsed.$;
        this.rootNode = parsed.rootNode;
    }
}

export default FileContent;