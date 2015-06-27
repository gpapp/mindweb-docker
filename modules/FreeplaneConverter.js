var parseString = require('xml2js').parseString;

module.exports = FreeplaneConverter;

function FreeplaneConverter() {

}

FreeplaneConverter.convert = function (buffer, retval, callback) {
    // XML to JSON
    parseString(buffer.toString(), {trim: true}, function (err, result) {
        if (err) {
            return callback(err);
        }
        try {
            buildMarkdownContent(result.map);
        } catch (e) {
            return callback(e);
        }
        retval.rawmap = result;
        callback();
    })
}

var urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
function buildMarkdownContent(node) {
    if (node.$ && node.$['TEXT']) {
        node.nodeMarkdown = node.$['TEXT'];
    }
    for (var attr in node) {
        if (!node.hasOwnProperty(attr) || attr === '$') {
            continue;
        }
        if (attr === 'nodeMarkdown' || attr === 'detailMarkdown' || attr === 'noteMarkdown') {
            continue;
        } else if (attr === 'richcontent') {
            for (var i = 0, len = node[attr].length; i < len; i++) {
                var richNode = node[attr][i];
                var markdown = buildMarkdownContentForNode(richNode, null, '');
                switch (richNode.$['TYPE']) {
                    case 'NODE':
                        richNode.nodeMarkdown = markdown;
                        break;
                    case 'DETAILS':
                        richNode.detailMarkdown = markdown;
                        richNode.detailOpen = richNode.$['HIDDEN'] != 'true';
                        break;
                    case 'NOTE':
                        richNode.noteMarkdown = markdown;
                        break;
                    default:
                        log.warn("Unknown richcontent type:" + richNode.$['TYPE']);
                }
            }
        } else if (Array.isArray(node[attr])) {
            for (var i = 0, len = node[attr].length; i < len; i++) {
                buildMarkdownContent(node[attr][i]);
            }
        } else {
            console.log('Unknown attribute: ' + attr);
        }
    }
}

function buildMarkdownContentForNode(node, listType, listPrefix) {
    var retval = '';
    for (var n in node) {
        if (!node.hasOwnProperty(n) || n === '$' || n === '_') {
            continue;
        }
        var newListType = listType;
        var newListPrefix = listPrefix;
        for (var i = 0, len = node[n].length; i < len; i++) {
            // Before nodes
            switch (n) {
                case 'html':
                case 'head':
                case 'body':
                    //Ignore
                    break;
                case 'h1':
                    retval += '#';
                    break;
                case 'h2':
                    retval += '##';
                    break;
                case 'h3':
                    retval += '###';
                    break;
                case 'h4':
                    retval += '####';
                    break;
                case 'h5':
                    retval += '#####';
                    break;
                case 'h6':
                    retval += '######';
                    break;
                case 'p':
                    break;
                case 'i':
                    retval += '_';
                    break;
                case 'b':
                    retval += '__';
                    break;
                case 'u':
                    retval += '<u>';
                    break;
                case 'ol':
                    newListType = '0. ';
                    newListPrefix = ' ' + listPrefix;
                    break;
                case 'ul':
                    newListType = '* ';
                    newListPrefix = ' ' + listPrefix;
                    break;
                case 'li':
                    retval += listPrefix + listType;
                    break;
                default:
                    console.info('Unhandled rich context tag encountered:' + n);
            }
            // insert nodes
            if (typeof node[n][i] != 'object') {
                retval+= node[n][i].trim().replace(urlPattern, '$1[$2]($2)');
            } else {
                if (node._) {
                    retval+=node._.trim().replace(urlPattern, '$1[$2]($2)')+'\n';
                }
                retval += buildMarkdownContentForNode(node[n][i], newListType, newListPrefix);
            }
            // after nodes
            switch (n) {
                case 'h1':
                    retval += '#\n';
                    break;
                case 'h2':
                    retval += '##\n';
                    break;
                case 'h3':
                    retval += '###\n';
                    break;
                case 'h4':
                    retval += '####\n';
                    break;
                case 'h5':
                    retval += '#####\n';
                    break;
                case 'h6':
                    retval += '######\n';
                    break;
                case 'p':
                    retval += '\n\n';
                    break;
                case 'i':
                    retval += '_';
                    break;
                case 'b':
                    retval += '__';
                    break;
                case 'u':
                    retval += '</u>';
                    break;
                case 'ol':
                case 'ul':
                case 'li':
                    retval += '\n';
                    break;
            }
        }
    }
    return retval;
}