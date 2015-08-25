module.exports = EditorService;

function EditorService() {

}

function findNodeById(node, nodeId) {
    if (node.$['ID'] === nodeId) {
        return node;
    }
    if (!node.node) {
        return null;
    }
    for (var index in node.node) {
        if (!node.node.hasOwnProperty(index)) {
            continue;
        }
        var found = findNodeById(node.node[index], nodeId);
        if (found) {
            return found;
        }
    }
    return null;
}

EditorService.applyAction = function (file, action, callback) {
    var eventNode = findNodeById(file.map.node[0], action.parent);
    if (!eventNode) {
        callback('Cannot find root node with id:' + action.parent);
        return;
    }
    switch (action.event) {
        case 'nodeFold':
            eventNode.open = action.payload;
            break;
        case 'nodeDetailFold':
            eventNode.detailOpen = action.payload;
            break;
        case 'nodeText':
            eventNode.nodeMarkdown = action.payload;
            break;
        case 'nodeDetail':
            eventNode.detailMarkdown = action.payload;
            break;
        case 'nodeNote':
            eventNode.noteMarkdown = action.payload;
            break;
        case 'nodeModifyIcons':
            eventNode.icon = action.payload;
            break;
        case 'newNode':
            // TODO: sanitize node, add proper ids
            eventNode.node.append(action.payload);
            break;
        case 'deleteNode':
        default:
            callback('Unimplemented event:' + action.event);
            break;
    }
    callback();
};