var EditorService;
(function (EditorService) {
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
            var found = this.findNodeById(node.node[index], nodeId);
            if (found) {
                return found;
            }
        }
        return null;
    }
    EditorService.findNodeById = findNodeById;
    function applyAction(file, action, callback) {
        var eventNode = this.findNodeById(file.map.node[0], action.parent);
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
                if (!eventNode.node) {
                    eventNode.node = [];
                }
                eventNode.node.push(action.payload);
                break;
            case 'deleteNode':
                //TODO delete eventNode;
                break;
            default:
                return callback('Unimplemented event: ' + action.event);
        }
        callback();
    }
    EditorService.applyAction = applyAction;
})(EditorService || (EditorService = {}));
module.exports = EditorService;
//# sourceMappingURL=EditorService.js.map