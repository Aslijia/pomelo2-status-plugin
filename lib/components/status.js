"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const statusService_1 = require("../service/statusService");
module.exports = function (app, opts) {
    const service = new statusService_1.StatusService(app, opts);
    app.set('statusService', service, true);
    ///@ts-ignore
    service.name = '__status__';
    return service;
};
