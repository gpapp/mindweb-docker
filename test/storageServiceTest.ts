///<reference path='../typings/tsd.d.ts' />
///<reference path="../modules/FreeplaneConverterService.ts"/>

import fs = require('fs');
import assert = require('assert');
import request = require('supertest');
import FreeplaneConverterService = require('../modules/FreeplaneConverterService');

describe("StorageService",
    function () {
        before(function (next) {
            next();
        });
        it("Does nothing", function (done) {
            FreeplaneConverterService.convert("",function(error,result){
                done();
            });
            done("ERROR");
        });
        after(function (next) {
            next();
        });
    }
);