///<reference path='../typings/tsd.d.ts' />
///<reference path="Map.ts" />

import Map = require("Map")

class FileContent {
    map:Map;

    constructor(buffer:Buffer) {
        this.map = JSON.parse(buffer).map;
    }
}

export = FileContent;