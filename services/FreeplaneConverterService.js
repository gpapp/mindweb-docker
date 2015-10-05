import parseString from 'xml2js';

const urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;

function convert(buffer, callback) {
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
        result.map.rootNode = result.map.node[0];
        delete result.map.node;
        callback(null, result.map);
    })
};

function buildMarkdownContent(node) {
    if (node.$ && node.$['TEXT']) {
        node.nodeMarkdown = node.$['TEXT'];
    }
    if (node.richcontent) {
        for (var i = 0, len = node.richcontent.length; i < len; i++) {
            var richNode = node.richcontent[i];
            var markdown = buildMarkdownContentForNode(richNode, null, '');
            switch (richNode.$['TYPE']) {
                case 'NODE':
                    node.nodeMarkdown = markdown;
                    break;
                case 'DETAILS':
                    node.detailMarkdown = markdown;
                    node.detailOpen = richNode.$['HIDDEN'] != 'true';
                    break;
                case 'NOTE':
                    node.noteMarkdown = markdown;
                    break;
                default:
                    console.warn("Unknown richcontent type:" + richNode.$['TYPE']);
            }
        }
        delete node.richcontent;
    }
    for (var attr in node) {
        if (!node.hasOwnProperty(attr) || attr === '$') {
            continue;
        }
        if (attr === 'nodeMarkdown' || attr === 'detailMarkdown' || attr === 'noteMarkdown' || attr === 'richcontent') {

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
                retval += node[n][i].trim().replace(urlPattern, '$1[$2]($2)');
            } else {
                if (node._) {
                    retval += node._.trim().replace(urlPattern, '$1[$2]($2)') + '\n';
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

exports.FreeplaneConverterService = convert;