///<reference path='../typings/tsd.d.ts' />

import FileContent=require('./FileContent');
import Buffer=require('express');

class FileVersion {
    version:number;
    content:FileContent;

    constructor(buffer:Buffer) {
        var o = JSON.parse(buffer);
        this.version = o['version'];
        this.content = new FileContent(o.content);
    }
}
export =FileVersion;